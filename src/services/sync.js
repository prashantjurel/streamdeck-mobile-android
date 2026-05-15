import { getDatabase, ref, get, set, serverTimestamp } from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWatchlist, saveWatchlist, loadSettings, saveSettings, loadContinueWatching, saveContinueWatching } from '../utils/storage';

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
    
    // 1. Watchlist Sync (Intelligent Two-Way Merge)
    const localWatchlist = await loadWatchlist();
    const cloudWatchlist = cloudData.watchlist 
      ? (typeof cloudData.watchlist === 'string' ? JSON.parse(cloudData.watchlist) : cloudData.watchlist) 
      : [];
    
    // Merge by unique ID
    const mergedWatchlistMap = new Map();
    // Add cloud items first
    cloudWatchlist.forEach(item => {
      if (item && item.id) mergedWatchlistMap.set(item.id, item);
    });
    // Overlay local items (newer changes on current device win)
    localWatchlist.forEach(item => {
      if (item && item.id) mergedWatchlistMap.set(item.id, item);
    });
    
    const finalWatchlist = Array.from(mergedWatchlistMap.values());
    await saveWatchlist(finalWatchlist);
    
    // 1.1 Continue Watching Sync (Timestamp-based Merge)
    const localCW = await loadContinueWatching();
    const cloudCW = cloudData.continueWatching
      ? (typeof cloudData.continueWatching === 'string' ? JSON.parse(cloudData.continueWatching) : cloudData.continueWatching)
      : [];
    
    const mergedCWMap = new Map();
    // Merge logic: Newest timestamp wins
    [...cloudCW, ...localCW].forEach(item => {
      if (!item || !item.id) return;
      const existing = mergedCWMap.get(item.id);
      if (!existing || (item.timestamp || 0) > (existing.timestamp || 0)) {
        mergedCWMap.set(item.id, item);
      }
    });
    
    const finalCW = Array.from(mergedCWMap.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) // Sort newest first
      .slice(0, 20); // Keep it lean for cloud storage
      
    // 1.2 Deletion Sync (Tombstones)
    const localDeletedRaw = await AsyncStorage.getItem('streamdeck_deleted_cw');
    const localDeleted = localDeletedRaw ? JSON.parse(localDeletedRaw) : [];
    const cloudDeleted = cloudData.deletedCW ? (typeof cloudData.deletedCW === 'string' ? JSON.parse(cloudData.deletedCW) : cloudData.deletedCW) : [];
    
    // Merge deletions
    const mergedDeletedMap = new Map();
    [...cloudDeleted, ...localDeleted].forEach(d => {
      if (d && d.id) {
        const existing = mergedDeletedMap.get(d.id);
        if (!existing || (d.timestamp || 0) > (existing.timestamp || 0)) {
          mergedDeletedMap.set(d.id, d);
        }
      }
    });
    const finalDeleted = Array.from(mergedDeletedMap.values()).slice(0, 50);
    
    // APPLY DELETIONS: Filter finalCW if a deletion is NEWER than the item's update
    const cleanedCW = finalCW.filter(item => {
      const deletion = mergedDeletedMap.get(item.id);
      if (deletion && deletion.timestamp > (item.timestamp || 0)) {
        console.log(`[Sync] Filtering out deleted item: ${item.title}`);
        return false;
      }
      return true;
    });

    await saveContinueWatching(cleanedCW);
    await AsyncStorage.setItem('streamdeck_deleted_cw', JSON.stringify(finalDeleted));

    // 2. Settings Sync (Intelligent Merge)
    const localSettings = await loadSettings();
    let cloudSettings = {};
    if (cloudData.settings) {
      cloudSettings = typeof cloudData.settings === 'string' 
        ? JSON.parse(cloudData.settings) 
        : cloudData.settings;
    }
    
    // Deep merge: Cloud values exist + Local values exist.
    // We prioritize local for the current session, but fill gaps from cloud.
    const mergedSettings = { ...cloudSettings, ...localSettings };

    // 3. Vaporize Ghost Keys & API Keys (Privacy First) & Migration
    const strippedSettings = {};
    Object.keys(mergedSettings).forEach(key => {
      const lowerKey = key.toLowerCase();
      // Don't sync internal transient state or keys that should be per-device if sensitive
      if (lowerKey.includes('apikey') || lowerKey.includes('tmdb')) return;
      
      // MIGRATION: If we see vidkingEnabled, map it to directEngineEnabled and strip it
      if (key === 'vidkingEnabled') {
        if (strippedSettings.directEngineEnabled === undefined) {
          strippedSettings.directEngineEnabled = mergedSettings[key];
        }
        return; 
      }

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
      continueWatching: cleanedCW, // Sync your playback history (filtered)
      deletedCW: finalDeleted, // Sync your deletions too!
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
