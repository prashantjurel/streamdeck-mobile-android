// StreamDeck Mobile — TMDB API Service
import { getApiKey, getTMDBHomeCache, setTMDBHomeCache } from '../utils/storage';

export const TMDB_BASE = 'https://api.tmdb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_ORIGINAL = 'https://image.tmdb.org/t/p/original';
export const TMDB_IMAGE_SMALL = 'https://image.tmdb.org/t/p/w200';

/**
 * Fetch trending content globally, locally, and for specific platforms.
 * Uses daily caching scoped by region to minimize API calls.
 * forceRefresh bypasses the cache for manual pulses.
 */
export async function fetchTrendingContent(region = 'IN', forceRefresh = false) {
  // Check cache first (skip if forceRefresh is true)
  if (!forceRefresh) {
    const cache = await getTMDBHomeCache(region);
    if (cache) {
      return cache;
    }
  }

  const apiKey = await getApiKey();
  if (!apiKey) return { global: [], local: [] };

  try {
    console.log(`[TMDB] Fetching ${forceRefresh ? 'FRESH' : 'daily'} content for ${region}`);
    
    // We use a broad list of watch providers for the local mix to ensure rich results.
    // Dynamically generate provider list from our official config
    const providerIds = OTT_PROVIDERS.map(p => p.id).join('|');
    const encodedProviders = encodeURIComponent(providerIds).replace(/%7C/g, '|');

    const langMap = {
      IN: 'hi|te|ta|ml|kn|bn',
      US: 'en',
      GB: 'en',
      AU: 'en',
      CA: 'en',
      KR: 'ko',
      JP: 'ja'
    };
    const localLang = langMap[region] ? `&with_original_language=${langMap[region]}` : '';

    const [
      globalRes, 
      localMovieRes, 
      localTvRes
    ] = await Promise.all([
      // Global pulse
      fetch(`${TMDB_BASE}/trending/all/day?api_key=${apiKey}`),
      
      // Local/Regional trending: We removed language and date restrictions to ensure
      // the rows are as rich as possible, allowing global hits to surface alongside local ones.
      // We also added monetization=flatrate|free which is required by TMDB discovery in some regions.
      fetch(`${TMDB_BASE}/discover/movie?api_key=${apiKey}&watch_region=${region}&with_watch_providers=${encodedProviders}&with_watch_monetization_types=flatrate|free&sort_by=popularity.desc`),
      fetch(`${TMDB_BASE}/discover/tv?api_key=${apiKey}&watch_region=${region}&with_watch_providers=${encodedProviders}&with_watch_monetization_types=flatrate|free&sort_by=popularity.desc`)
    ]);

    if (globalRes.status === 401) {
      throw new Error('INVALID_API_KEY');
    }

    const globalData = await globalRes.json();
    const localMovieData = await localMovieRes.json();
    const localTvData = await localTvRes.json();

    const global = globalData.results || [];
    const local = [
      ...(localMovieData.results || []).map(m => ({ ...m, media_type: 'movie' })),
      ...(localTvData.results || []).map(t => ({ ...t, media_type: 'tv' })),
    ].sort((a, b) => b.popularity - a.popularity);
    
    if (global.length > 0 && local.length > 0) {
      await setTMDBHomeCache(region, global, local);
    }

    return { global, local };
  } catch (e) {
    if (e.message === 'INVALID_API_KEY') {
      throw e;
    }
    console.error('[TMDB] Failed to fetch trending content:', e);
    return { global: [], local: [] };
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

    if (movieRes.status === 401 || tvRes.status === 401) {
      throw new Error('INVALID_API_KEY');
    }

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    const combined = [
      ...(movieData.results || []).map(m => ({ ...m, media_type: 'movie' })),
      ...(tvData.results || []).map(t => ({ ...t, media_type: 'tv' })),
    ].sort((a, b) => b.popularity - a.popularity);

    return combined.slice(0, 20);
  } catch (e) {
    if (e.message === 'INVALID_API_KEY') throw e;
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
    if (res.status === 401) throw new Error('INVALID_API_KEY');
    
    const data = await res.json();
    return (data.results || []).map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) {
    if (e.message === 'INVALID_API_KEY') throw e;
    console.error('[TMDB] Now Playing failed:', e);
    return [];
  }
}

/**
 * Fetch TV Shows currently airing (On The Air).
 */
export async function fetchNowPlayingTV() {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `${TMDB_BASE}/tv/on_the_air?api_key=${apiKey}&page=1`,
    );
    if (res.status === 401) throw new Error('INVALID_API_KEY');
    
    const data = await res.json();
    return (data.results || []).map(t => ({ ...t, media_type: 'tv' }));
  } catch (e) {
    if (e.message === 'INVALID_API_KEY') throw e;
    console.error('[TMDB] On The Air failed:', e);
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
    if (res.status === 401) throw new Error('INVALID_API_KEY');

    const data = await res.json();
    return (data.results || []).map(m => ({ ...m, media_type: 'movie' }));
  } catch (e) {
    if (e.message === 'INVALID_API_KEY') throw e;
    console.error('[TMDB] Top Rated failed:', e);
    return [];
  }
}

/**
 * Fetch Top Rated TV shows.
 */
export async function fetchTopRatedTV() {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `${TMDB_BASE}/tv/top_rated?api_key=${apiKey}&page=1`,
    );
    if (res.status === 401) throw new Error('INVALID_API_KEY');

    const data = await res.json();
    return (data.results || []).map(t => ({ ...t, media_type: 'tv' }));
  } catch (e) {
    if (e.message === 'INVALID_API_KEY') throw e;
    console.error('[TMDB] Top Rated TV failed:', e);
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
  if (typeof path === 'number' || typeof path === 'object') return path; // Local require() support
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export const OTT_PROVIDERS = [
  { id: 8, name: 'Netflix', color: '#E50914', shortName: 'N', regions: ['global'], logoUrl: 'https://image.tmdb.org/t/p/w200/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
  { id: 9, name: 'Prime Video', color: '#00A8E1', shortName: 'P', regions: ['global'], logoUrl: 'https://image.tmdb.org/t/p/w200/emthp39XA2YScoYL1p0sdbAH2WA.jpg' },
  { id: 1899, name: 'Max', color: '#333333', shortName: 'M', regions: ['US', 'LATAM'], logoUrl: 'https://image.tmdb.org/t/p/w200/6Q3KKKLC5RY3mIwClR0r8DrKrjB.jpg' },
  { id: '122|337|220|2336', name: 'JioHotstar', color: '#0A2885', shortName: 'JH', regions: ['IN'], logoUrl: 'https://image.tmdb.org/t/p/w200/7Fl8ylPDclt3ZYgNbW2t7rbZE9I.jpg' },
  { id: 337, name: 'Disney+', color: '#113CCF', shortName: 'D+', regions: ['global', '!IN'], logoUrl: 'https://image.tmdb.org/t/p/w200/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
  { id: 350, name: 'Apple TV+', color: '#555555', shortName: 'tv', regions: ['global'], logoUrl: 'https://image.tmdb.org/t/p/w200/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
  { id: 531, name: 'Paramount+', color: '#0064FF', shortName: 'P+', regions: ['US', 'GB', 'AU', 'CA'], logoUrl: 'https://image.tmdb.org/t/p/w200/fi83B1oztoS47xxcemFdPMhIzK.jpg' },
  { id: 15, name: 'Hulu', color: '#1CE783', shortName: 'H', regions: ['US', 'JP'], logoUrl: 'https://image.tmdb.org/t/p/w200/zxrVdFjIjLqkfnwyghnfywTn3se.jpg' },
];

export async function fetchProviderContent(region = 'IN', providerId = 8) {
  const apiKey = await getApiKey();
  if (!apiKey) return [];
  
  const oneYearAgo = new Date();
  oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);
  const freshnessDate = oneYearAgo.toISOString().split('T')[0];

    const langMap = {
      IN: 'hi|te|ta|ml|kn|bn',
      US: 'en',
      GB: 'en',
      AU: 'en',
      CA: 'en',
      KR: 'ko',
      JP: 'ja'
    };
    const localLang = langMap[region] ? `&with_original_language=${langMap[region]}` : '';

    try {
      const encodedProvider = encodeURIComponent(providerId).replace(/%7C/g, '|');
      
      // monetization=flatrate|free is critical for many regions to return any results via discover
      const movieUrl = `${TMDB_BASE}/discover/movie?api_key=${apiKey}&watch_region=${region}&with_watch_providers=${encodedProvider}&with_watch_monetization_types=flatrate|free&sort_by=popularity.desc`;
      const tvUrl = `${TMDB_BASE}/discover/tv?api_key=${apiKey}&watch_region=${region}&with_watch_providers=${encodedProvider}&with_watch_monetization_types=flatrate|free&sort_by=popularity.desc`;

      const [movieRes, tvRes] = await Promise.all([
        fetch(movieUrl).catch(() => null),
        fetch(tvUrl).catch(() => null)
      ]);

      const movieData = movieRes && movieRes.ok ? await movieRes.json() : { results: [] };
      const tvData = tvRes && tvRes.ok ? await tvRes.json() : { results: [] };

      const results = [
        ...(movieData.results || []).map(m => ({ ...m, media_type: 'movie' })),
        ...(tvData.results || []).map(t => ({ ...t, media_type: 'tv' }))
      ].sort((a, b) => b.popularity - a.popularity);

      return results;
    } catch(e) {
      console.error('[TMDB] fetchProviderContent exception:', e);
      return [];
    }
}
