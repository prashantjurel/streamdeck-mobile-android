// StreamDeck Mobile — TMDB API Service
import { getApiKey, getTMDBHomeCache, setTMDBHomeCache } from '../utils/storage';

const TMDB_BASE = 'https://api.tmdb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_ORIGINAL = 'https://image.tmdb.org/t/p/original';
export const TMDB_IMAGE_SMALL = 'https://image.tmdb.org/t/p/w200';

/**
 * Fetch trending content globally, locally, and for specific platforms.
 * Uses daily caching scoped by region to minimize API calls.
 */
export async function fetchTrendingContent(region = 'IN') {
  // Check cache first
  const cache = await getTMDBHomeCache(region);
  if (cache) {
    return cache;
  }

  const apiKey = await getApiKey();
  if (!apiKey) return { global: [], local: [], netflix: [], prime: [] };

  try {
    // We use a broad list of watch providers for the local mix to ensure rich results.
    const localProviders = '8|122|119|237|232|337|350|220';

    const [
      globalRes, 
      localMovieRes, 
      localTvRes,
      netflixRes,
      primeRes
    ] = await Promise.all([
      fetch(`${TMDB_BASE}/discover/movie?api_key=${apiKey}&with_watch_monetization_types=flatrate&sort_by=popularity.desc&page=1`),
      fetch(`${TMDB_BASE}/discover/movie?api_key=${apiKey}&watch_region=${region}&with_watch_providers=${localProviders}&language=en-US&sort_by=popularity.desc`),
      fetch(`${TMDB_BASE}/discover/tv?api_key=${apiKey}&watch_region=${region}&with_watch_providers=${localProviders}&language=en-US&sort_by=popularity.desc`),
      fetch(`${TMDB_BASE}/discover/tv?api_key=${apiKey}&watch_region=${region}&with_watch_providers=8&language=en-US&sort_by=popularity.desc`), // 8 = Netflix
      fetch(`${TMDB_BASE}/discover/tv?api_key=${apiKey}&watch_region=${region}&with_watch_providers=119&language=en-US&sort_by=popularity.desc`) // 119 = Amazon Prime
    ]);

    const globalData = await globalRes.json();
    const localMovieData = await localMovieRes.json();
    const localTvData = await localTvRes.json();
    const netflixData = await netflixRes.json();
    const primeData = await primeRes.json();

    const global = globalData.results || [];
    const local = [
      ...(localMovieData.results || []),
      ...(localTvData.results || []),
    ].sort((a, b) => b.popularity - a.popularity);
    
    const netflix = netflixData.results || [];
    const prime = primeData.results || [];

    if (global.length > 0 && local.length > 0) {
      await setTMDBHomeCache(region, global, local, netflix, prime);
    }

    return { global, local, netflix, prime };
  } catch (e) {
    console.error('[TMDB] Failed to fetch trending content:', e);
    return { global: [], local: [], netflix: [], prime: [] };
  }
}

/**
 * Search TMDB for movies and TV shows.
 */
export async function searchTMDB(query) {
  const apiKey = await getApiKey();
  if (!apiKey || !query) return [];

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(
        `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`,
      ),
      fetch(
        `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`,
      ),
    ]);

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    const combined = [
      ...(movieData.results || []).map(m => ({ ...m, media_type: 'movie' })),
      ...(tvData.results || []).map(t => ({ ...t, media_type: 'tv' })),
    ].sort((a, b) => b.popularity - a.popularity);

    return combined.slice(0, 20);
  } catch (e) {
    console.error('[TMDB] Search failed:', e);
    return [];
  }
}

/**
 * Fetch Now Playing movies (for Explore screen).
 */
export async function fetchNowPlaying() {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/now_playing?api_key=${apiKey}&page=1`,
    );
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('[TMDB] Now Playing failed:', e);
    return [];
  }
}

/**
 * Fetch Top Rated movies.
 */
export async function fetchTopRated() {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/top_rated?api_key=${apiKey}&page=1`,
    );
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error('[TMDB] Top Rated failed:', e);
    return [];
  }
}

/**
 * Fetch watch providers (where to stream/rent/buy) for a movie or TV show.
 */
export async function fetchWatchProviders(id, mediaType = 'movie') {
  const apiKey = await getApiKey();
  if (!apiKey || !id) return null;

  try {
    const res = await fetch(
      `${TMDB_BASE}/${mediaType}/${id}/watch/providers?api_key=${apiKey}`,
    );
    const data = await res.json();
    // Return the India results if available
    return data.results?.IN || null;
  } catch (e) {
    console.error('[TMDB] Watch Providers failed:', e);
    return null;
  }
}

/**
 * Get the full backdrop/poster URL.
 */
export function getImageUrl(path, size = 'w500') {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
