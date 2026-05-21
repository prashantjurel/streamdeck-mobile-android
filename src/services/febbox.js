/**
 * StreamDeck Mobile — FebBox Media Source Service
 * 
 * FebBox integration via Showbox API discovery + FebBox file resolution.
 * This follows the same pattern used by sites like bingebox.to:
 * 
 * 1. Showbox API → Search by TMDB ID → Get FebBox share/file IDs
 * 2. FebBox API → Resolve file ID → Get stream URL (.m3u8 or .mp4)
 * 
 * FebBox is an OPTIONAL media source. Users can enable it in Settings.
 * Authentication token is stored securely via the secrets config.
 */

import { getFebBoxToken } from '../config/secrets';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Showbox API (media discovery — maps TMDB IDs to FebBox files)
const SHOWBOX_BASE = 'https://showbox.shegu.net/api/api_client/index/';
const FEBBOX_API = 'https://www.febbox.com/api/open';

const CACHE_PREFIX = 'febbox_cache_';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours — stream URLs expire

/**
 * Check if FebBox is enabled and has valid credentials.
 */
export async function isFebBoxAvailable() {
  const token = await getFebBoxToken();
  return token && token.length > 5;
}

/**
 * Search for a movie/TV show via the Showbox discovery API.
 * Returns FebBox file IDs that can be resolved to stream URLs.
 * 
 * @param {string|number} tmdbId - TMDB ID
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {number} [season] - Season number (TV only)
 * @param {number} [episode] - Episode number (TV only)
 * @returns {Object|null} { fileId, quality, size, name } or null
 */
export async function searchFebBox(tmdbId, mediaType = 'movie', season, episode) {
  if (!tmdbId) return null;

  // Check cache
  const cacheKey = `${CACHE_PREFIX}search_${tmdbId}_${mediaType}_${season || 0}_${episode || 0}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._cachedAt < CACHE_TTL_MS) {
        return parsed.result;
      }
    }
  } catch (e) { /* cache miss */ }

  try {
    // Step 1: Showbox API — Get share/file IDs by TMDB ID
    const typeCode = mediaType === 'tv' ? 2 : 1; // Showbox: 1=movie, 2=tv
    
    // Search for the content
    const searchUrl = `${SHOWBOX_BASE}?type=1&module=Search_list&keyword=${tmdbId}&paession=`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Platform': 'android',
        'Accept': 'application/json',
      },
    });

    if (!searchRes.ok) {
      console.warn('[FebBox] Showbox search failed:', searchRes.status);
      return null;
    }

    const searchData = await searchRes.json();
    const items = searchData?.data?.list || [];
    
    if (items.length === 0) {
      console.log('[FebBox] No results found for TMDB:', tmdbId);
      return null;
    }

    // Find best match by TMDB ID
    const match = items.find(item => 
      String(item.tmdb_id) === String(tmdbId) || 
      String(item.imdb_id) === String(tmdbId)
    ) || items[0]; // Fallback to first result

    if (!match || !match.id) {
      console.log('[FebBox] No matching content found');
      return null;
    }

    // Step 2: Get file list for the matched content
    const detailUrl = `${SHOWBOX_BASE}?type=${typeCode}&module=Movie_detail&mid=${match.id}&paession=`;
    const detailRes = await fetch(detailUrl, {
      headers: {
        'Platform': 'android',
        'Accept': 'application/json',
      },
    });

    if (!detailRes.ok) {
      console.warn('[FebBox] Detail fetch failed:', detailRes.status);
      return null;
    }

    const detailData = await detailRes.json();
    
    let fileList = [];
    if (mediaType === 'tv') {
      // For TV: navigate to specific season/episode
      const episodes = detailData?.data?.episode_list || detailData?.data?.episodes || [];
      const matchingEp = episodes.find(ep => 
        Number(ep.season) === Number(season) && Number(ep.episode) === Number(episode)
      );
      if (matchingEp) {
        fileList = matchingEp.file_list || matchingEp.sources || [];
      }
    } else {
      fileList = detailData?.data?.file_list || detailData?.data?.sources || [];
    }

    if (fileList.length === 0) {
      console.log('[FebBox] No files found for this content');
      return null;
    }

    // Sort by quality (prefer higher resolution)
    const sorted = fileList.sort((a, b) => {
      const qualityOrder = { '4K': 4, '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, '360p': 0 };
      const aQ = qualityOrder[a.quality] || qualityOrder[a.resolution] || 1;
      const bQ = qualityOrder[b.quality] || qualityOrder[b.resolution] || 1;
      return bQ - aQ;
    });

    const bestFile = sorted[0];
    const result = {
      fileId: bestFile.fid || bestFile.file_id || bestFile.id,
      shareKey: bestFile.share_key || match.share_key || null,
      quality: bestFile.quality || bestFile.resolution || 'Unknown',
      size: bestFile.size || bestFile.file_size || 0,
      name: bestFile.file_name || bestFile.name || match.title || 'Unknown',
      allQualities: sorted.map(f => ({
        fileId: f.fid || f.file_id || f.id,
        quality: f.quality || f.resolution || 'Unknown',
        size: f.size || f.file_size || 0,
      })),
    };

    // Cache result
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ result, _cachedAt: Date.now() }));
    } catch (e) { /* non-critical */ }

    console.log(`[FebBox] Found: ${result.name} (${result.quality})`);
    return result;
  } catch (e) {
    console.error('[FebBox] Search failed:', e);
    return null;
  }
}

/**
 * Resolve a FebBox file ID to a playable stream URL.
 * Returns a direct .m3u8 or .mp4 URL.
 * 
 * @param {string} fileId - FebBox file ID
 * @param {string} [shareKey] - FebBox share key (if available)
 * @returns {Object|null} { url, type, quality } or null
 */
export async function getStreamUrl(fileId, shareKey = null) {
  if (!fileId) return null;

  const token = await getFebBoxToken();
  if (!token) {
    console.warn('[FebBox] No authentication token — cannot resolve stream URL');
    return null;
  }

  // Check cache
  const cacheKey = `${CACHE_PREFIX}stream_${fileId}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._cachedAt < CACHE_TTL_MS) {
        return parsed.stream;
      }
    }
  } catch (e) { /* cache miss */ }

  try {
    // Request stream URL from FebBox using the file API
    const params = new URLSearchParams({
      fid: String(fileId),
      share_key: shareKey || '',
    });

    const url = `${FEBBOX_API}/file/player?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `ui=${token}`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      console.warn('[FebBox] Stream resolution failed:', res.status);
      return null;
    }

    const data = await res.json();
    
    // Extract the best stream URL
    const sources = data?.data?.source || data?.data?.sources || data?.data || [];
    const sourceList = Array.isArray(sources) ? sources : [sources];
    
    if (sourceList.length === 0) {
      console.warn('[FebBox] No stream sources returned');
      return null;
    }

    // Prefer HLS (.m3u8) over direct MP4 for adaptive streaming
    let bestSource = sourceList.find(s => 
      (s.file || s.url || '').includes('.m3u8')
    ) || sourceList[0];

    const streamUrl = bestSource.file || bestSource.url || bestSource.src || null;
    if (!streamUrl) return null;

    const stream = {
      url: streamUrl,
      type: streamUrl.includes('.m3u8') ? 'hls' : 'mp4',
      quality: bestSource.quality || bestSource.label || 'Auto',
      headers: bestSource.headers || {},
    };

    // Cache (shorter TTL for stream URLs as they may expire)
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ stream, _cachedAt: Date.now() }));
    } catch (e) { /* non-critical */ }

    console.log(`[FebBox] Stream resolved: ${stream.type} (${stream.quality})`);
    return stream;
  } catch (e) {
    console.error('[FebBox] Stream resolution failed:', e);
    return null;
  }
}

/**
 * List available qualities/resolutions for a content item.
 * Useful for quality selector UI.
 */
export async function listQualities(tmdbId, mediaType = 'movie', season, episode) {
  const result = await searchFebBox(tmdbId, mediaType, season, episode);
  if (!result || !result.allQualities) return [];
  return result.allQualities;
}

/**
 * Full resolution: search → stream URL in one call.
 * Convenience function for the player.
 */
export async function resolveStream(tmdbId, mediaType = 'movie', season, episode) {
  const available = await isFebBoxAvailable();
  if (!available) return null;

  const searchResult = await searchFebBox(tmdbId, mediaType, season, episode);
  if (!searchResult) return null;

  const stream = await getStreamUrl(searchResult.fileId, searchResult.shareKey);
  if (!stream) return null;

  return {
    ...stream,
    name: searchResult.name,
    fileQuality: searchResult.quality,
  };
}
