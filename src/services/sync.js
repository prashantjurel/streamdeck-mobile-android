import { getDatabase, ref, get, set, serverTimestamp } from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWatchlist, saveWatchlist, loadSettings, saveSettings } from '../utils/storage';

/**
 * Unified Two-Way Sync
 * Pulls from cloud, merges with local (local wins for settings), and pushes back a clean state.
 */
export const syncWithCloud = async (userId) => {
  if (!userId) return;
  
  try {
    const db = getDatabase();
    const userRef = ref(db, `/users/${userId}`);
    const snapshot = await get(userRef);
    const cloudData = snapshot.val() || {};
    
    // 1. Watchlist Sync (Local is Truth)
    // On an existing device, local state is always authoritative — push to cloud.
    // On a brand new device (empty local list), restore from cloud.
    const localWatchlist = await loadWatchlist();
    const cloudWatchlist = cloudData.watchlist 
      ? (typeof cloudData.watchlist === 'string' ? JSON.parse(cloudData.watchlist) : cloudData.watchlist) 
      : [];
    
    const rawLocalWatchlist = await AsyncStorage.getItem('my_watchlist');
    
    let finalWatchlist;
    if (!rawLocalWatchlist) {
      // Brand new device (key is null) — no local data exists, so restore from cloud
      finalWatchlist = cloudWatchlist;
      console.log('[Sync] New device detected — restoring watchlist from cloud:', cloudWatchlist.length, 'items');
    } else {
      // Existing device — local is authoritative, push to cloud as-is
      finalWatchlist = localWatchlist;
      console.log('[Sync] Existing device — local watchlist is truth:', localWatchlist.length, 'items');
    }
    await saveWatchlist(finalWatchlist);

    // 2. Merge Settings (Intelligent Merge)
    const rawLocalSettings = await AsyncStorage.getItem('streamdeck_settings');
    const localSettings = await loadSettings(); // Guaranteed to return an object (defaults if raw is null)
    
    let cloudSettings = {};
    if (cloudData.settings) {
      cloudSettings = typeof cloudData.settings === 'string' 
        ? JSON.parse(cloudData.settings) 
        : cloudData.settings;
    }
    
    // If device is brand new (rawLocalSettings is null), let Cloud overwrite local defaults.
    // Otherwise, assume local device has the most recent intended state and let Local overwrite Cloud.
    const mergedSettings = !rawLocalSettings 
      ? { ...localSettings, ...cloudSettings } 
      : { ...cloudSettings, ...localSettings };

    // 3. Vaporize Ghost Keys
    const strippedSettings = {};
    Object.keys(mergedSettings).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('apikey') || lowerKey.includes('tmdb')) return;
      strippedSettings[key] = mergedSettings[key];
    });
    await saveSettings(strippedSettings);

    // 4. Gather remaining data
    const advPrefs = await AsyncStorage.getItem('streamdeck_adventure_prefs');
    const advLang = await AsyncStorage.getItem('streamdeck_adventure_lang');
    const apiKey = await AsyncStorage.getItem('tmdb_api_key');
    
    // Restore API key to local if missing but present in cloud
    if (!apiKey && cloudData.tmdbApiKey) {
      const { saveApiKey } = require('../utils/storage');
      await saveApiKey(cloudData.tmdbApiKey);
    }

    // 5. PUSH THE PERFECT STATE (Use set() to forcefully overwrite entire node)
    const payload = {
      watchlist: finalWatchlist, // Push as native array/object
      settings: strippedSettings, // Push as native object instead of string
      adventurePrefs: advPrefs || '',
      adventureLang: advLang || 'global',
      tmdbApiKey: apiKey || cloudData.tmdbApiKey || '',
      lastSynced: serverTimestamp()
    };
    
    console.log('[Sync] Final Payload Settings:', JSON.stringify(payload.settings));
    
    await set(userRef, payload);

    console.log('[Sync] Single-Call Sync completed successfully for:', userId);
  } catch (error) {
    console.error('[Sync] Sync failed:', error);
  }
};
