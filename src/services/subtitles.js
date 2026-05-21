/**
 * StreamDeck Mobile — Subtitle Service (Wyzie Subs)
 * 
 * Multi-language subtitles via Wyzie Subs API (sub.wyzie.io).
 * Supports both TMDB and IMDB IDs. IMDB is faster due to fewer lookups.
 * 
 * Subtitles are fetched as .srt/.vtt and can be injected into WebView
 * video players or rendered as native overlay text.
 */

import { getWyzieSubsKey } from '../config/secrets';
import { getIMDBId } from './omdb';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WYZIE_BASE = 'https://sub.wyzie.io';
const CACHE_PREFIX = 'subs_cache_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Fetch available subtitles for a given title.
 * 
 * @param {string|number} tmdbId - TMDB ID of the movie/TV show
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {number} [season] - Season number (TV only)
 * @param {number} [episode] - Episode number (TV only)
 * @param {string} [language] - ISO 639-1 language code (e.g. 'en', 'hi', 'es')
 * @returns {Array} List of subtitle objects with { lang, label, url, format, hearingImpaired }
 */
export async function fetchSubtitles(tmdbId, mediaType = 'movie', season, episode, language = null) {
  if (!tmdbId) return [];

  const key = await getWyzieSubsKey();
  if (!key) {
    console.warn('[Subtitles] No Wyzie Subs API key configured');
    return [];
  }

  // Check cache
  const cacheKey = `${CACHE_PREFIX}${tmdbId}_${mediaType}_${season || 0}_${episode || 0}_${language || 'all'}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._cachedAt < CACHE_TTL_MS) {
        return parsed.subtitles;
      }
    }
  } catch (e) { /* cache miss */ }

  try {
    // Resolve IMDB ID for faster lookup
    let id = tmdbId;
    let idType = 'tmdb';
    
    const imdbId = await getIMDBId(tmdbId, mediaType);
    if (imdbId) {
      id = imdbId;
      idType = 'imdb';
    }

    // Build query URL
    let url = `${WYZIE_BASE}/search?id=${id}&key=${key}`;
    if (mediaType === 'tv' && season !== undefined && episode !== undefined) {
      url += `&season=${season}&episode=${episode}`;
    }
    if (language) {
      url += `&language=${language}`;
    }

    console.log(`[Subtitles] Fetching from Wyzie Subs (${idType}: ${id})...`);
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StreamDeckMobile/1.0',
      },
    });

    if (!res.ok) {
      console.warn(`[Subtitles] Wyzie API returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    
    // Normalize the response format
    const subtitles = (Array.isArray(data) ? data : data.subtitles || data.results || [])
      .map(sub => ({
        id: sub.id || sub.SubtitlesId || `${sub.lang}_${Math.random()}`,
        lang: sub.lang || sub.language || sub.LanguageName || 'Unknown',
        langCode: sub.langCode || sub.languageCode || sub.ISO639 || '',
        label: sub.label || sub.SubFileName || sub.release || `${sub.lang || 'Unknown'} Subtitle`,
        url: sub.url || sub.SubDownloadLink || sub.download || '',
        format: (sub.format || sub.SubFormat || 'srt').toLowerCase(),
        hearingImpaired: sub.hearingImpaired || sub.SubHearingImpaired === '1' || false,
        rating: sub.rating || sub.SubRating || 0,
      }))
      .filter(sub => sub.url && sub.url.length > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Cache results
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        subtitles,
        _cachedAt: Date.now(),
      }));
    } catch (e) { /* non-critical */ }

    console.log(`[Subtitles] Found ${subtitles.length} subtitles`);
    return subtitles;
  } catch (e) {
    console.error('[Subtitles] Fetch failed:', e);
    return [];
  }
}

/**
 * Get list of available languages for a title.
 * Deduplicates by language code.
 */
export async function getAvailableLanguages(tmdbId, mediaType = 'movie', season, episode) {
  const subs = await fetchSubtitles(tmdbId, mediaType, season, episode);
  
  const langMap = {};
  subs.forEach(sub => {
    const code = sub.langCode || sub.lang;
    if (code && !langMap[code]) {
      langMap[code] = {
        code,
        name: sub.lang,
        count: 0,
      };
    }
    if (langMap[code]) {
      langMap[code].count++;
    }
  });

  return Object.values(langMap).sort((a, b) => b.count - a.count);
}

/**
 * Download and parse a subtitle file (.srt or .vtt).
 * Returns an array of cue objects: { index, start, end, text }
 * where start/end are in seconds (float).
 */
export async function fetchSubtitleFile(downloadUrl) {
  if (!downloadUrl) return [];

  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) return [];

    const text = await res.text();
    
    // Detect format
    if (text.trim().startsWith('WEBVTT')) {
      return parseVTT(text);
    }
    return parseSRT(text);
  } catch (e) {
    console.error('[Subtitles] Download failed:', e);
    return [];
  }
}

/**
 * Parse .srt subtitle format into cue objects.
 */
function parseSRT(srtText) {
  const cues = [];
  // Split by double newline (cue separator)
  const blocks = srtText.trim().replace(/\r\n/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // Line 1: index (skip)
    // Line 2: timestamp "00:01:23,456 --> 00:01:25,789"
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 +
                  parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 +
                parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;

    // Lines 3+: subtitle text (may span multiple lines)
    const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, '').trim();

    if (text) {
      cues.push({ index: cues.length + 1, start, end, text });
    }
  }

  return cues;
}

/**
 * Parse .vtt (WebVTT) subtitle format into cue objects.
 */
function parseVTT(vttText) {
  const cues = [];
  const lines = vttText.trim().replace(/\r\n/g, '\n').split('\n');
  
  let i = 0;
  // Skip WEBVTT header and any metadata
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i];
    const timeMatch = line.match(
      /(\d{2}):(\d{2}):(\d{2})[.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.](\d{3})/
    );

    if (timeMatch) {
      const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 +
                    parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
      const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 +
                  parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;

      i++;
      const textLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i]);
        i++;
      }

      const text = textLines.join('\n').replace(/<[^>]*>/g, '').trim();
      if (text) {
        cues.push({ index: cues.length + 1, start, end, text });
      }
    } else {
      i++;
    }
  }

  return cues;
}

/**
 * Generate a WebVTT string from an array of cue objects.
 * Useful for injecting into WebView <track> elements.
 */
export function cuesToVTT(cues) {
  if (!cues || cues.length === 0) return '';

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.round((seconds % 1) * 1000).toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  };

  let vtt = 'WEBVTT\n\n';
  cues.forEach((cue, idx) => {
    vtt += `${idx + 1}\n`;
    vtt += `${formatTime(cue.start)} --> ${formatTime(cue.end)}\n`;
    vtt += `${cue.text}\n\n`;
  });

  return vtt;
}
