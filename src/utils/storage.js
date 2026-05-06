// StreamDeck Mobile — AsyncStorage Helpers
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CONTINUE_WATCHING: 'continue_watching',
  WATCHLIST: 'my_watchlist',
  TMDB_API_KEY: 'tmdb_api_key',
  TMDB_HOME_CACHE: 'tmdb_home_cache_v6',
  SETTINGS: 'streamdeck_settings',
};

const CW_MAX_ITEMS = 15;

// ============================================
// Continue Watching
// ============================================
export async function loadContinueWatching() {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONTINUE_WATCHING);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('[Storage] Failed to load CW:', e);
    return [];
  }
}

export async function saveContinueWatching(items) {
  try {
    const trimmed = items.slice(0, CW_MAX_ITEMS);
    await AsyncStorage.setItem(KEYS.CONTINUE_WATCHING, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[Storage] Failed to save CW:', e);
  }
}

export async function addContinueWatchingEntry(appId, url, title, progress, thumb) {
  const items = await loadContinueWatching();
  const id = `${appId}-${url}`;
  const existing = items.findIndex(item => item.id === id);

  const entry = {
    id,
    appId,
    url,
    title: title || 'Unknown',
    progress: progress || 0,
    thumb: thumb || null,
    timestamp: Date.now(),
  };

  if (existing >= 0) {
    items[existing] = { ...items[existing], ...entry };
  } else {
    items.unshift(entry);
  }

  await saveContinueWatching(items);
  return items;
}

// ============================================
// Watchlist
// ============================================
export async function loadWatchlist() {
  try {
    const data = await AsyncStorage.getItem(KEYS.WATCHLIST);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('[Storage] Failed to load watchlist:', e);
    return [];
  }
}

export async function saveWatchlist(items) {
  try {
    await AsyncStorage.setItem(KEYS.WATCHLIST, JSON.stringify(items));
  } catch (e) {
    console.warn('[Storage] Failed to save watchlist:', e);
  }
}

export async function toggleWatchlistItem(movie) {
  const items = await loadWatchlist();
  const idx = items.findIndex(i => i.id === movie.id);
  if (idx >= 0) {
    items.splice(idx, 1);
  } else {
    items.unshift(movie);
  }
  await saveWatchlist(items);
  return items;
}

// ============================================
// TMDB Cache (Daily, per region)
// ============================================
export async function getTMDBHomeCache(region) {
  try {
    const dataStr = await AsyncStorage.getItem(KEYS.TMDB_HOME_CACHE);
    if (!dataStr) return null;
    
    const cache = JSON.parse(dataStr);
    const today = new Date().toLocaleDateString();
    
    // Only return if date and region match
    if (cache.date === today && cache.region === region) {
      if (cache.global?.length > 0 && cache.local?.length > 0) {
        return cache;
      }
    }
  } catch (e) {
    // Cache miss
  }
  return null;
}

export async function setTMDBHomeCache(region, global, local, netflix, prime) {
  try {
    const today = new Date().toLocaleDateString();
    const cache = {
      date: today,
      region,
      global,
      local,
      netflix,
      prime,
    };
    await AsyncStorage.setItem(KEYS.TMDB_HOME_CACHE, JSON.stringify(cache));
  } catch (e) {
    console.warn('[Storage] Failed to save TMDB cache:', e);
  }
}

// ============================================
// Settings
// ============================================
export async function loadSettings() {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : getDefaultSettings();
  } catch (e) {
    return getDefaultSettings();
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('[Storage] Failed to save settings:', e);
  }
}

export function getDefaultSettings() {
  return {
    tmdbApiKey: '',
    movieboxDomain: 'cineby.sc',
    contentRegion: 'US', // Global default
    liveSportsProviders: [
      { name: 'SportsLiveToday', url: 'https://sportslivetoday.com' },
    ],
  };
}

// ============================================
// TMDB API Key
// ============================================
export async function getApiKey() {
  try {
    const key = await AsyncStorage.getItem(KEYS.TMDB_API_KEY);
    return key || null;
  } catch (e) {
    return null;
  }
}

export async function saveApiKey(key) {
  if (key === undefined || key === null) return;
  try {
    await AsyncStorage.setItem(KEYS.TMDB_API_KEY, key);
  } catch (e) {
    console.warn('[Storage] Failed to save API key:', e);
  }
}
