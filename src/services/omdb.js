/**
 * StreamDeck Mobile — OMDb API Service
 * 
 * External ratings and additional title metadata from OMDb.
 * Uses lazy-loading strategy: only fetched when user explicitly views
 * detailed info (cinematic loader, detail screen), NOT for browse/browse cards.
 * 
 * Supports IMDB, Rotten Tomatoes, and Metacritic ratings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOMDbApiKey } from '../config/secrets';
import { getApiKey } from '../utils/storage';

const OMDB_BASE = 'https://www.omdbapi.com';
const CACHE_KEY_PREFIX = 'omdb_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for current session
const memoryCache = {};

/**
 * Resolve a TMDB ID to an IMDB ID using TMDB's external_ids endpoint.
 * This is the bridge between TMDB and OMDb — no OMDb key needed for this step.
 */
export async function getIMDBId(tmdbId, mediaType = 'movie') {
  if (!tmdbId) return null;
  
  const cacheKey = `imdb_${mediaType}_${tmdbId}`;
  if (memoryCache[cacheKey]) return memoryCache[cacheKey];

  try {
    const tmdbApiKey = await getApiKey();
    if (!tmdbApiKey) return null;

    const url = `https://api.tmdb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${tmdbApiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const imdbId = data.imdb_id || null;
    
    if (imdbId) {
      memoryCache[cacheKey] = imdbId;
    }
    return imdbId;
  } catch (e) {
    console.warn('[OMDb] Failed to resolve IMDB ID:', e);
    return null;
  }
}

/**
 * Fetch full details from OMDb by IMDB ID.
 * Returns: { imdbRating, rottenTomatoes, metacritic, awards, director,
 *            writer, actors, boxOffice, rated, runtime, genre, plot }
 */
export async function fetchOMDbDetails(imdbId) {
  if (!imdbId) return null;

  // Check memory cache first
  if (memoryCache[imdbId]) return memoryCache[imdbId];

  // Check persistent cache
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${imdbId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed._cachedAt < CACHE_TTL_MS) {
        memoryCache[imdbId] = parsed;
        return parsed;
      }
    }
  } catch (e) { /* cache miss */ }

  const apiKey = await getOMDbApiKey();
  if (!apiKey) {
    console.log('[OMDb] No API key configured — skipping OMDb fetch');
    return null;
  }

  try {
    const url = `${OMDB_BASE}/?i=${imdbId}&apikey=${apiKey}&plot=short`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.Response === 'False') {
      console.warn('[OMDb] API error:', data.Error);
      return null;
    }

    // Extract and normalize ratings
    const ratings = {};
    if (data.Ratings) {
      data.Ratings.forEach(r => {
        if (r.Source === 'Internet Movie Database') {
          ratings.imdb = r.Value; // e.g. "8.5/10"
        } else if (r.Source === 'Rotten Tomatoes') {
          ratings.rottenTomatoes = r.Value; // e.g. "93%"
        } else if (r.Source === 'Metacritic') {
          ratings.metacritic = r.Value; // e.g. "78/100"
        }
      });
    }

    const result = {
      imdbId,
      imdbRating: data.imdbRating !== 'N/A' ? data.imdbRating : null,
      imdbVotes: data.imdbVotes !== 'N/A' ? data.imdbVotes : null,
      rottenTomatoes: ratings.rottenTomatoes || null,
      metacritic: ratings.metacritic || null,
      awards: data.Awards !== 'N/A' ? data.Awards : null,
      director: data.Director !== 'N/A' ? data.Director : null,
      writer: data.Writer !== 'N/A' ? data.Writer : null,
      actors: data.Actors !== 'N/A' ? data.Actors : null,
      boxOffice: data.BoxOffice !== 'N/A' ? data.BoxOffice : null,
      rated: data.Rated !== 'N/A' ? data.Rated : null, // PG-13, R, etc.
      runtime: data.Runtime !== 'N/A' ? data.Runtime : null,
      genre: data.Genre !== 'N/A' ? data.Genre : null,
      plot: data.Plot !== 'N/A' ? data.Plot : null,
      _cachedAt: Date.now(),
    };

    // Persist cache
    memoryCache[imdbId] = result;
    try {
      await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${imdbId}`, JSON.stringify(result));
    } catch (e) { /* non-critical */ }

    return result;
  } catch (e) {
    console.error('[OMDb] Fetch failed:', e);
    return null;
  }
}

/**
 * Convenience: Enrich TMDB data with OMDb ratings.
 * Takes a TMDB ID + mediaType, resolves IMDB ID, fetches OMDb data.
 * Returns null if OMDb is unavailable (no key, no data, etc.).
 */
export async function enrichWithOMDb(tmdbId, mediaType = 'movie') {
  try {
    const imdbId = await getIMDBId(tmdbId, mediaType);
    if (!imdbId) return null;
    return await fetchOMDbDetails(imdbId);
  } catch (e) {
    console.warn('[OMDb] Enrichment failed:', e);
    return null;
  }
}

/**
 * Search OMDb by title (fallback when TMDB ID is not available).
 */
export async function searchOMDb(title, year = null) {
  const apiKey = await getOMDbApiKey();
  if (!apiKey || !title) return null;

  try {
    let url = `${OMDB_BASE}/?t=${encodeURIComponent(title)}&apikey=${apiKey}`;
    if (year) url += `&y=${year}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.Response === 'False') return null;

    return data;
  } catch (e) {
    console.warn('[OMDb] Search failed:', e);
    return null;
  }
}
