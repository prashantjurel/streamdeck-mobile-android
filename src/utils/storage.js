import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushToCloud } from '../services/sync';
import { getCurrentUser } from '../services/auth';

const KEYS = {
  CONTINUE_WATCHING: 'continue_watching',
  WATCHLIST: 'my_watchlist',
  TMDB_API_KEY: 'tmdb_api_key',
  DIRECT_ENGINE_ENABLED: 'direct_engine_enabled',
  TMDB_HOME_CACHE: 'tmdb_home_cache_v6',
  SETTINGS: 'streamdeck_settings',
  DEFAULT_PROVIDER: 'default_streaming_provider',
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

export async function addContinueWatchingEntry(metadata) {
  const items = await loadContinueWatching();
  const { tmdbId, season, episode, title, progress, thumb, appId, url, currentTime, duration } = metadata;
  const mediaType = metadata.mediaType || metadata.media_type || 'movie';

  // Use tmdbId + season/episode as the primary key for TV shows to track per-episode progress
  let id;
  if (tmdbId) {
    if (mediaType === 'tv' && season !== undefined && episode !== undefined) {
      id = `tmdb-${tmdbId}-tv-s${season}-e${episode}`;
    } else {
      id = `tmdb-${tmdbId}-${mediaType}`;
    }
  } else {
    id = `${appId}-${url}`;
  }
  const existing = items.findIndex(item => item.id === id);

  // Normalize thumbnail URL
  let finalThumb = thumb;
  if (finalThumb && finalThumb.startsWith('/')) {
    finalThumb = `https://image.tmdb.org/t/p/w500${finalThumb}`;
  }

  const entry = {
    id,
    tmdbId,
    mediaType,
    showName: metadata.showName || null,
    season: season !== undefined ? Number(season) : null,
    episode: episode !== undefined ? Number(episode) : null,
    title: title || 'Unknown',
    thumb: finalThumb || null,
    appId,
    url,
    timestamp: Date.now(),
  };

  // Only include progress/time fields if they are explicitly provided
  // This prevents overwriting real progress with 0 when just updating thumbnail
  if (progress !== undefined && progress !== null) {
    entry.progress = progress;
  }
  if (currentTime !== undefined && currentTime !== null && currentTime > 0) {
    entry.currentTime = currentTime;
  }
  if (duration !== undefined && duration !== null && duration > 0) {
    entry.duration = duration;
  }

  if (existing >= 0) {
    // Merge: existing fields are kept unless new entry provides a valid replacement
    const merged = { ...items[existing] };
    Object.keys(entry).forEach(key => {
      if (entry[key] !== undefined && entry[key] !== null) {
        merged[key] = entry[key];
      }
    });
    // Ensure progress is always a number
    if (typeof merged.progress !== 'number' || isNaN(merged.progress)) {
      merged.progress = 0.5;
    }
    items[existing] = merged;
    // Move to top
    const item = items.splice(existing, 1)[0];
    items.unshift(item);
  } else {
    // New entry — ensure progress has a default
    if (typeof entry.progress !== 'number' || isNaN(entry.progress)) {
      entry.progress = 0.5;
    }
    if (!entry.currentTime) entry.currentTime = 0;
    if (!entry.duration) entry.duration = 0;
    items.unshift(entry);
  }

  // PRUNING: Only keep items that are not finished (less than 95% progress)
  // And avoid showing items with negligible progress (less than 0.1%)
  const activeItems = items.filter(item => 
    typeof item.progress === 'number' && item.progress > 0.1 && item.progress < 95
  );

  console.log(`[Storage] CW Items updated: ${activeItems.length} items active, latest progress: ${activeItems[0]?.progress?.toFixed(1)}%`);
  await saveContinueWatching(activeItems);
  return activeItems;
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
export async function getTMDBHomeCache(region, langHash = '') {
  try {
    const dataStr = await AsyncStorage.getItem(KEYS.TMDB_HOME_CACHE);
    if (!dataStr) return null;
    
    const cache = JSON.parse(dataStr);
    const today = new Date().toLocaleDateString();
    
    // Only return if date, region, AND language hash match
    if (cache.date === today && cache.region === region && cache.langHash === langHash) {
      if (cache.global?.length > 0 && cache.local?.length > 0) {
        return cache;
      }
    }
  } catch (e) {
    // Cache miss
  }
  return null;
}

export async function setTMDBHomeCache(region, global, local, langHash = '') {
  try {
    const today = new Date().toLocaleDateString();
    const cache = {
      date: today,
      region,
      langHash,
      global,
      local,
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
    if (!data) return getDefaultSettings();
    
    let settings = JSON.parse(data);
    
    // Migration: movieboxDomain -> movieboxSources
    if (settings.movieboxDomain && !settings.movieboxSources) {
      settings.movieboxSources = [
        { name: 'Primary', url: settings.movieboxDomain, enabled: true }
      ];
      delete settings.movieboxDomain;
    }

    // Migration: Ensure movieboxSources have name property
    if (settings.movieboxSources) {
      settings.movieboxSources = settings.movieboxSources.map(s => ({
        ...s,
        name: s.name || 'Source',
        enabled: s.enabled !== undefined ? s.enabled : true
      }));
    }

    // Ensure liveSportsProviders have enabled property
    if (settings.liveSportsProviders) {
      settings.liveSportsProviders = settings.liveSportsProviders.map(p => ({
        ...p,
        enabled: p.enabled !== undefined ? p.enabled : true
      }));
    }

    // SOVEREIGN SANITIZATION: Brute-force Keyword Purge
    Object.keys(settings).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('apikey') || lowerKey.includes('tmdb')) {
        delete settings[key];
      }
    });

    // Default priority for direct engines
    if (!settings.directEnginePriority) {
      settings.directEnginePriority = ['cinesrc'];
    } else {
      // PURGE: Remove RiveStream & VidKing from existing lists to avoid ghost entries
      settings.directEnginePriority = settings.directEnginePriority.filter(id => id !== 'rivestream' && id !== 'vidking');
    }

    return settings;
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
    movieboxSources: [
      { name: 'Cineby', url: 'cineby.sc', enabled: true }
    ],
    contentRegion: 'IN',
    preferredLanguages: ['hi'], // Default to Hindi for India region
    recentLanguages: ['hi', 'te', 'ta', 'ml', 'kn', 'bn', 'en', 'ko', 'ja'],
    recentRegions: ['IN', 'US', 'GB', 'AU', 'CA'],
    liveSportsProviders: [
      { name: 'SportsLiveToday', url: 'https://sportslivetoday.com', enabled: true },
      { name: 'PPV', url: 'www.ppv.to', enabled: false }
    ],
    directEngineEnabled: true,
    directEnginePriority: ['cinesrc'],
    defaultProviderId: null,
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

// ============================================
// Direct Engine (Unified)
// ============================================
export async function isDirectEngineEnabled() {
  try {
    const val = await AsyncStorage.getItem(KEYS.DIRECT_ENGINE_ENABLED);
    return val !== 'false'; // Default to true
  } catch (e) {
    return true;
  }
}

export async function setDirectEngineEnabled(enabled) {
  try {
    await AsyncStorage.setItem(KEYS.DIRECT_ENGINE_ENABLED, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('[Storage] Failed to save Direct Engine state:', e);
  }
}

export async function removeContinueWatchingEntry(id) {
  const items = await loadContinueWatching();
  const filtered = items.filter(item => item.id !== id);
  await saveContinueWatching(filtered);
  
  // ALSO clear the actual progress data key so it starts from 0 if played again
  try {
    console.log(`[Storage] Clearing progress for ID: ${id}`);
    await AsyncStorage.removeItem(id);
    
    // TRACK DELETION for sync: Save the ID and timestamp of the removal
    const deletedRaw = await AsyncStorage.getItem('streamdeck_deleted_cw');
    let deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
    // Keep only the last 50 deletions to stay lean
    deletedList = [{ id, timestamp: Date.now() }, ...deletedList.filter(d => d.id !== id)].slice(0, 50);
    await AsyncStorage.setItem('streamdeck_deleted_cw', JSON.stringify(deletedList));
  } catch (e) {
    console.warn('[Storage] Failed to track item deletion:', e);
  }
  
  return filtered;
}

// ============================================
// Default Provider Preference
// ============================================
export async function loadDefaultProvider() {
  try {
    return await AsyncStorage.getItem(KEYS.DEFAULT_PROVIDER);
  } catch (e) {
    return null;
  }
}

export async function saveDefaultProvider(providerId) {
  try {
    if (providerId) {
      await AsyncStorage.setItem(KEYS.DEFAULT_PROVIDER, providerId);
    } else {
      await AsyncStorage.removeItem(KEYS.DEFAULT_PROVIDER);
    }
  } catch (e) {
    console.warn('[Storage] Failed to save default provider:', e);
  }
}
