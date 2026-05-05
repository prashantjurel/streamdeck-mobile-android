import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Linking,
  TouchableOpacity,
  Modal,
  Image,
  Alert
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {useFocusEffect} from '@react-navigation/native';
import {fetchMovieRecommendations, MOVIE_GENRES} from '../services/movieAdventure';
import {fetchWatchProviders} from '../services/tmdb';
import AdventureStack from '../components/AdventureStack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {OTT_PROVIDER_MAP, navigateToOTT} from '../utils/OTTNavigation';

const SAVED_ADVENTURES_KEY = 'streamdeck_mobile_adventure_saved';

const AdventureScreen = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [prefs, setPrefs] = useState(null);
  const [page, setPage] = useState(1);
  const stackRef = useRef(null);

  // Watch Providers Modal State
  const [showPicker, setShowPicker] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieboxDomain, setMovieboxDomain] = useState('moviebox.mov');

  const routeGenreIds = route.params?.genreIds;
  const isMoodBased = route.params?.isMoodBased;

  useFocusEffect(
    useCallback(() => {
      checkPrefs();
    }, [routeGenreIds])
  );

  const checkPrefs = async () => {
    try {
      setLoadingPrefs(true);
      
      // 1. ABSOLUTE PRIORITY: Check AsyncStorage first.
      // If the user hit 'Reset' in settings, this will be null.
      const saved = await AsyncStorage.getItem('streamdeck_adventure_prefs');
      
      if (!saved) {
        // If prefs were deleted (Reset), clear local state and redirect IMMEDIATELY
        setCards([]);
        setPrefs(null);
        setCurrentIndex(0);
        navigation.replace('AdventurePreferences');
        return;
      }

      // 2. Handle fresh results from a survey/mood picker
      if (routeGenreIds && routeGenreIds.length > 0 && isMoodBased) {
        setPrefs(routeGenreIds);
        setCards([]);
        setCurrentIndex(0);
        await loadContent(routeGenreIds, 1, true);
        navigation.setParams({ isMoodBased: false });
        setLoadingPrefs(false);
        return;
      }

      // 3. If we have cards in memory and prefs exist, we can stay here.
      if (cards.length > 0) {
        setLoadingPrefs(false);
        return;
      }

      // 4. Use the saved preferences to load content
      const parsedPrefs = JSON.parse(saved);
      if (parsedPrefs && Array.isArray(parsedPrefs) && parsedPrefs.length > 0) {
        setPrefs(parsedPrefs);
        await loadContent(parsedPrefs, 1, true);
        setLoadingPrefs(false);
        return;
      }

      // Fallback: Empty prefs array
      navigation.replace('AdventurePreferences');
    } catch (e) {
      console.error('[Adventure] Reset Sync Error:', e);
      navigation.replace('AdventurePreferences');
    } finally {
      setLoadingPrefs(false);
    }
  };

  const loadContent = async (genreIds, pageNum, reset = false) => {
    if (!genreIds || genreIds.length === 0) return;
    
    setLoading(true);
    try {
      // Pick a random starting page on reset to ensure variety
      const actualPage = reset ? Math.floor(Math.random() * 20) + 1 : pageNum;
      if (reset) setPage(actualPage);

      const data = await fetchMovieRecommendations(genreIds, actualPage);
      if (data && data.length > 0) {
        setCards((prev) => reset ? data : [...prev, ...data]);
        setPage(actualPage);
      }
    } catch (e) {
      console.error('[Adventure] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeRight = async (card) => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_ADVENTURES_KEY);
      const list = saved ? JSON.parse(saved) : [];
      if (!list.find(a => a.id === card.id)) {
        list.unshift(card);
        await AsyncStorage.setItem(SAVED_ADVENTURES_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.error('[Adventure] Save failed:', e);
    }
  };

  const handleSwipeUp = async (card) => {
    setSelectedMovie(card);
    
    try {
      const providersData = await fetchWatchProviders(card.id, 'movie');
      const streamingProviders = [];
      const seenIds = new Set(); 

      if (providersData?.flatrate) {
        providersData.flatrate.forEach(p => {
          const mapped = OTT_PROVIDER_MAP[p.provider_id];
          if (mapped && !seenIds.has(mapped.id)) {
            seenIds.add(mapped.id);
            streamingProviders.push({
              ...mapped,
              logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w200${p.logo_path}` : null,
              icon: '📺',
              color: '#333',
            });
          }
        });
      }

      const mbDomain = movieboxDomain.trim();
      const mbSearchDomain = mbDomain.replace('http://', '').replace('https://', '');
      streamingProviders.push({
        id: 'moviebox',
        name: 'MovieBox',
        icon: '🍿',
        color: '#E21D48',
        logoUrl: null,
        searchUrl: `https://${mbSearchDomain}/search?q=`,
        appScheme: null,
      });

      setAvailableProviders(streamingProviders);
      setShowPicker(true);
    } catch (e) {
      console.error('[Adventure] Failed to fetch providers:', e);
      // Fallback
      navigation.navigate('Explore', {searchQuery: card.title, ts: Date.now()});
    }
  };

  const handleSelectProvider = async (provider) => {
    setShowPicker(false);
    const title = selectedMovie?.title || '';
    const tmdbId = selectedMovie?.id;

    await navigateToOTT(
      provider, 
      title, 
      tmdbId, 
      'movie', 
      movieboxDomain, 
      navigation
    );
  };

  const checkLoadMore = (index) => {
    // If we're getting close to the end of the current card pool, fetch more
    if (cards.length - index < 8) {
      loadContent(prefs, page + 1, false);
    }
  };

  const onSwipeAction = (direction, card, newIndex) => {
    setCurrentIndex(newIndex);
    checkLoadMore(newIndex);

    if (direction === 'right') handleSwipeRight(card);
    else if (direction === 'up') handleSwipeUp(card);
  };

  return (
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      
      <View style={[styles.header, {paddingTop: (insets.top || StatusBar.currentHeight || 0) + Spacing.md}]}>
        <Text style={styles.title}>Adventure</Text>
        <View style={styles.badgeRow}>
           <Text style={styles.subtitle}>Movie Discovery</Text>
           {prefs && (
             <TouchableOpacity 
               style={styles.vibeBtn}
               onPress={() => navigation.navigate('AdventurePreferences')}
               activeOpacity={0.7}
             >
               <LinearGradient
                 colors={['rgba(139, 92, 246, 0.3)', 'rgba(217, 70, 239, 0.3)']}
                 start={{x: 0, y: 0}}
                 end={{x: 1, y: 0}}
                 style={styles.vibeGradient}
               >
                 <Text style={styles.editPrefs}>Change Vibe</Text>
               </LinearGradient>
             </TouchableOpacity>
           )}
        </View>
      </View>
      
      <View style={styles.container}>
        {(loading || loadingPrefs) && cards.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accentPurple} />
            <Text style={styles.loadingText}>Curating your feed...</Text>
          </View>
        ) : (
          <View style={styles.stackOuter}>
            <AdventureStack 
              ref={stackRef}
              data={cards} 
              currentIndex={currentIndex}
              setCurrentIndex={(val) => {
                const nextIdx = typeof val === 'function' ? val(currentIndex) : val;
                setCurrentIndex(nextIdx);
                checkLoadMore(nextIdx);
              }}
              onSwipeLeft={() => checkLoadMore(currentIndex + 1)}
              onSwipeRight={(card) => handleSwipeRight(card)}
              onSwipeUp={(card) => handleSwipeUp(card)}
            />
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.btn, styles.skipBtn]} 
          onPress={() => stackRef.current?.swipeLeft()}
          activeOpacity={0.8}
        >
          <Icon name="close" size={26} color="#F43F5E" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => stackRef.current?.swipeUp()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#D946EF']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[styles.btn, styles.exploreBtn]}
          >
            <Icon name="play" size={28} color="#fff" />
            <Text style={styles.exploreText}>Watch Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.saveBtn]} 
          onPress={() => stackRef.current?.swipeRight()}
          activeOpacity={0.8}
        >
          <Icon name="bookmark-outline" size={26} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Watch Providers Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissZone} onPress={() => setShowPicker(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Available On</Text>
                <Text style={styles.modalSubtitle}>Select where to stream {selectedMovie?.title}</Text>
             </View>
             
             <View style={styles.providerGrid}>
                {availableProviders.map(provider => (
                  <TouchableOpacity 
                    key={provider.id} 
                    style={styles.providerItem}
                    onPress={() => handleSelectProvider(provider)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.providerIconBox, {backgroundColor: provider.logoUrl ? '#1a1a2e' : provider.color}]}>
                      {provider.logoUrl ? (
                        <Image
                          source={{uri: provider.logoUrl}}
                          style={styles.providerLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.providerIconText}>{provider.icon}</Text>
                      )}
                    </View>
                    <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
                  </TouchableOpacity>
                ))}
             </View>

             <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowPicker(false)} activeOpacity={0.7}>
                <Text style={styles.closeModalText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  title: { fontSize: 34, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -1 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  subtitle: { fontSize: 12, color: Colors.accentPink, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  vibeBtn: { borderRadius: 12, overflow: 'hidden' },
  vibeGradient: { paddingHorizontal: 10, paddingVertical: 5 },
  editPrefs: { fontSize: 11, color: '#fff', fontWeight: '800', textTransform: 'uppercase' },
  container: { 
    flex: 1, 
    justifyContent: 'center', // This ensures equal vertical gaps
    paddingBottom: 20, 
  },
  stackOuter: {
    height: '100%',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textMuted, marginTop: Spacing.md, fontSize: FontSizes.md, fontWeight: '600' },
  controls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: Spacing.xl, 
    paddingBottom: 110, 
    gap: 16 
  },
  btn: { 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  skipBtn: { 
    width: 60,
    borderColor: 'rgba(244, 63, 94, 0.3)', 
  },
  saveBtn: { 
    width: 60,
    borderColor: 'rgba(16, 185, 129, 0.3)', 
  },
  exploreBtn: { 
    flexDirection: 'row',
    paddingHorizontal: 28,
    borderWidth: 0,
    gap: 8,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  exploreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnText: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textTransform: 'uppercase' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalDismissZone: { flex: 1 },
  modalContent: { backgroundColor: '#16161E', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 44, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', elevation: 24, shadowColor: '#000', shadowOffset: {width: 0, height: -8}, shadowOpacity: 0.4, shadowRadius: 20 },
  modalHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  modalHandle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: 0.3 },
  modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 8 },
  providerItem: { width: 86, alignItems: 'center', marginBottom: Spacing.sm },
  providerIconBox: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden', elevation: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  providerLogo: { width: 44, height: 44, borderRadius: 8 },
  providerIconText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  providerName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  closeModalBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16 },
  closeModalText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
});

export default AdventureScreen;
