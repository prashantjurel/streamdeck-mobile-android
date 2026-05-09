import { getDatabase, ref, update, get, serverTimestamp } from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWatchlist, saveWatchlist, loadSettings, saveSettings } from '../utils/storage';

/**
 * Sync local data to the cloud
 */
export const pushToCloud = async (userId) => {
  if (!userId) return;
  
  try {
    const watchlist = await loadWatchlist();
    const settings = await loadSettings();
    
    const db = getDatabase();
    const userRef = ref(db, `/users/${userId}`);
    await update(userRef, {
      watchlist: JSON.stringify(watchlist),
      settings: JSON.stringify(settings),
      lastSynced: serverTimestamp()
    });
    
    console.log('[Sync] Data pushed to cloud successfully');
  } catch (error) {
    console.error('[Sync] Push failed:', error);
  }
};

/**
 * Pull data from cloud and merge with local
 */
export const pullFromCloud = async (userId) => {
  if (!userId) return;
  
  try {
    const db = getDatabase();
    const userRef = ref(db, `/users/${userId}`);
    const snapshot = await get(userRef);
    const data = snapshot.val();
    
    if (data) {
      if (data.watchlist) {
        const cloudWatchlist = JSON.parse(data.watchlist);
        const localWatchlist = await loadWatchlist();
        
        // Merge strategy: Unique items by ID
        const mergedWatchlist = [...localWatchlist];
        cloudWatchlist.forEach(item => {
          if (!mergedWatchlist.find(i => i.id === item.id)) {
            mergedWatchlist.push(item);
          }
        });
        
        await saveWatchlist(mergedWatchlist);
      }
      
      if (data.settings) {
        const cloudSettings = JSON.parse(data.settings);
        const localSettings = await loadSettings();
        
        // Merge strategy: Overwrite local with cloud for most settings
        const mergedSettings = { ...localSettings, ...cloudSettings };
        await saveSettings(mergedSettings);
      }
      
      console.log('[Sync] Data pulled and merged from cloud successfully');
    }
  } catch (error) {
    console.error('[Sync] Pull failed:', error);
  }
};
