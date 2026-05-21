/**
 * StreamDeck Mobile — TheIntroDB Service
 * 
 * Fetches intro/recap/credits/preview timestamps for skip controls.
 * Free, open API — no API key required.
 * 
 * API Docs: https://theintrodb.org/docs
 * Supported segment types: intro, recap, credits, preview, mixed-credits, mixed-intro
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRODB_BASE = 'https://api.theintrodb.org/v1';
const CACHE_PREFIX = 'introdb_cache_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — timestamps don't change

// Segment types and their display labels
export const SEGMENT_TYPES = {
  intro: { label: 'Skip Intro', icon: 'play-skip-forward' },
  recap: { label: 'Skip Recap', icon: 'play-forward' },
  credits: { label: 'Skip Credits', icon: 'arrow-forward' },
  preview: { label: 'Skip Preview', icon: 'play-skip-forward' },
  'mixed-credits': { label: 'Skip Credits', icon: 'arrow-forward' },
  'mixed-intro': { label: 'Skip Intro', icon: 'play-skip-forward' },
};

/**
 * Fetch skip segments for a given TMDB title.
 * Returns typed segments: [{ type, start, end, label, icon }]
 * 
 * Attempts to fetch for ALL content (movies + TV).
 * Returns empty array if no segments found (graceful degradation).
 * 
 * @param {string|number} tmdbId - TMDB ID
 * @param {number} [season] - Season number (optional, for TV shows)
 * @param {number} [episode] - Episode number (optional, for TV shows)
 * @returns {Array} Skip segments
 */
export async function fetchSkipSegments(tmdbId, season, episode) {
  if (!tmdbId) return [];

  const cacheKey = `${CACHE_PREFIX}${tmdbId}_${season || 0}_${episode || 0}`;

  // Check cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._cachedAt < CACHE_TTL_MS) {
        return parsed.segments;
      }
    }
  } catch (e) { /* cache miss */ }

  try {
    // Build the API URL
    // TheIntroDB uses TMDB IDs directly
    let url;
    if (season !== undefined && episode !== undefined) {
      // TV episode
      url = `${INTRODB_BASE}/segments?tmdb_id=${tmdbId}&season=${season}&episode=${episode}`;
    } else {
      // Movie — try generic lookup
      url = `${INTRODB_BASE}/segments?tmdb_id=${tmdbId}`;
    }

    console.log(`[IntroDB] Fetching skip segments for TMDB ${tmdbId}${season ? ` S${season}E${episode}` : ''}...`);

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StreamDeckMobile/1.0',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        // No data for this title — completely normal, cache the empty result
        console.log('[IntroDB] No segments found (404)');
        await cacheSegments(cacheKey, []);
        return [];
      }
      console.warn(`[IntroDB] API returned ${res.status}`);
      return [];
    }

    const data = await res.json();

    // Normalize the response
    const rawSegments = Array.isArray(data) ? data : data.segments || data.results || [];
    
    const segments = rawSegments
      .map(seg => {
        const type = (seg.type || seg.segment_type || 'intro').toLowerCase();
        const meta = SEGMENT_TYPES[type] || SEGMENT_TYPES.intro;
        
        return {
          type,
          start: parseFloat(seg.start || seg.start_time || seg.startTime || 0),
          end: parseFloat(seg.end || seg.end_time || seg.endTime || 0),
          label: meta.label,
          icon: meta.icon,
        };
      })
      .filter(seg => seg.end > seg.start && seg.end > 0) // Valid segments only
      .sort((a, b) => a.start - b.start); // Chronological order

    console.log(`[IntroDB] Found ${segments.length} segments`);

    // Cache the result (even empty — prevents repeated 404s)
    await cacheSegments(cacheKey, segments);
    return segments;
  } catch (e) {
    console.warn('[IntroDB] Fetch failed:', e);
    return [];
  }
}

/**
 * Check if a given playback time falls within any skip segment.
 * Returns the matching segment, or null.
 * 
 * @param {Array} segments - Preloaded segments from fetchSkipSegments
 * @param {number} currentTime - Current playback time in seconds
 * @returns {Object|null} Matching segment or null
 */
export function getActiveSegment(segments, currentTime) {
  if (!segments || segments.length === 0 || currentTime === undefined) return null;

  for (const seg of segments) {
    if (currentTime >= seg.start && currentTime <= seg.end) {
      return seg;
    }
  }
  return null;
}

/**
 * Get the end time of a segment (where to seek to on skip).
 * Adds a small buffer (1s) to avoid landing exactly on the boundary.
 */
export function getSkipTarget(segment) {
  if (!segment) return 0;
  return segment.end + 1; // 1 second buffer past the segment end
}

// ── Internal helpers ─────────────────────────────────────────

async function cacheSegments(key, segments) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({
      segments,
      _cachedAt: Date.now(),
    }));
  } catch (e) { /* non-critical */ }
}
