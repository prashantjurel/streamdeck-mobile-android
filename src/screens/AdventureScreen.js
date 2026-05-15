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
  Alert,
  Dimensions
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {useFocusEffect} from '@react-navigation/native';
import {fetchMovieRecommendations, MOVIE_GENRES} from '../services/movieAdventure';
import {fetchWatchProviders} from '../services/tmdb';
import {loadSettings, isDirectEngineEnabled} from '../utils/storage';
import AdventureStack from '../components/AdventureStack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {OTT_PROVIDER_MAP, navigateToOTT} from '../utils/OTTNavigation';
import {useApi} from '../context/ApiContext';

const SAVED_ADVENTURES_KEY = 'streamdeck_mobile_adventure_saved';
const {width, height} = Dimensions.get('window');

const AdventureScreen = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const { hasKey, requestKey } = useApi();
  
  // All State Hooks (Contiguous Block)
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [lang, setLang] = useState('');
  const [prefs, setPrefs] = useState(null);
  const [page, setPage] = useState(1);
  const [showPicker, setShowPicker] = useState(false);

  // Sync tab bar visibility with overlays
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: showPicker
        ? { display: 'none' } 
        : { 
            backgroundColor: '#0D0D12', 
            borderTopWidth: 0, 
            height: 65, 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            elevation: 8 
          }
    });
  }, [showPicker, navigation]);
  const [isFetchingProviders, setIsFetchingProviders] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieboxDomain, setMovieboxDomain] = useState('moviebox.pro'); 
  const [movieboxSources, setMovieboxSources] = useState([]);
  const [directEngineEnabled, setDirectEngineEnabled] = useState(true);

  // Refs
  const stackRef = useRef(null);

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;

  // ELITE HEADER
  const renderHeader = () => (
    <View style={styles.adventureHeader}>
      <View style={{ flex: 0.8 }} /> 
      <View style={styles.headerTitleBox}>
        <Text style={styles.headerTitle} allowFontScaling={false} numberOfLines={1}>Adventure</Text>
        <Text style={styles.headerSubtitle} allowFontScaling={false}>Personalized Discovery</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {prefs && (
          <TouchableOpacity style={styles.vibeBtn} onPress={() => navigation.navigate('AdventurePreferences')} activeOpacity={0.7}>
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.vibeGradient}>
              <Icon name="tune" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.editPrefs} allowFontScaling={false}>Tune</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const routeGenreIds = route.params?.genreIds;
  const isMoodBased = route.params?.isMoodBased;

  useFocusEffect(
    useCallback(() => {
      if (hasKey) {
        checkPrefs();
      }
    }, [routeGenreIds, hasKey])
  );

  const checkPrefs = async () => {
    try {
      setLoadingPrefs(true);
      
      // 1. ABSOLUTE PRIORITY: Check AsyncStorage first.
      const saved = await AsyncStorage.getItem('streamdeck_adventure_prefs');
      
      // Load global settings (like moviebox domain and sources)
      const settings = await loadSettings();
      if (settings.movieboxDomain) {
        setMovieboxDomain(settings.movieboxDomain);
      }
      setMovieboxSources(settings.movieboxSources || []);

      const engineEnabled = await isDirectEngineEnabled();
      setDirectEngineEnabled(engineEnabled);
      
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
        const routeLang = route.params?.selectedLanguage;
        const currentLang = routeLang !== undefined ? routeLang : lang;
        
        setPrefs(routeGenreIds);
        if (routeLang !== undefined) setLang(routeLang);
        setCards([]);
        setCurrentIndex(0);
        await loadContent(routeGenreIds, 1, true, currentLang);
        navigation.setParams({ isMoodBased: false, selectedLanguage: undefined });
        setLoadingPrefs(false);
        return;
      }

      // 3. If we have cards in memory and prefs exist, we can stay here.
      if (cards.length > 0) {
        setLoadingPrefs(false);
        return;
      }

      // 4. Use the saved preferences to load content
      loadPreferences();
    } catch (e) {
      console.error('[Adventure] Prefs error:', e);
      loadContent([], 1, true, '');
      setLoadingPrefs(false);
    }
  };

  const loadPreferences = async () => {
    setLoadingPrefs(true);
    try {
      const saved = await AsyncStorage.getItem('streamdeck_adventure_prefs');
      const savedLang = await AsyncStorage.getItem('streamdeck_adventure_lang');
      
      const genreIds = saved ? JSON.parse(saved) : [];
      setPrefs(genreIds);
      
      // Validate and stabilize the language ID
      const stableLang = (savedLang === 'IN' || savedLang === 'global') ? savedLang : 'global';
      setLang(stableLang);
      
      // Start loading content once prefs are ready
      loadContent(genreIds, 1, true, stableLang);
    } catch (e) {
      console.error('[Adventure] Prefs error:', e);
      loadContent([], 1, true, '');
    } finally {
      setLoadingPrefs(false);
    }
  };

  const loadContent = async (genreIds, pageNum, reset = false, currentLang = lang) => {
    setLoading(true);
    try {
      const data = await fetchMovieRecommendations(genreIds, pageNum, currentLang);
      
      if (reset && data.totalPages > 1 && pageNum === 1) {
        // If we are on the first page of a reset, pick a truly random page from the total
        const randomPage = Math.floor(Math.random() * Math.min(data.totalPages, 15)) + 1;
        if (randomPage !== 1) {
          const refinedData = await fetchMovieRecommendations(genreIds, randomPage, currentLang);
          setCards(refinedData.results);
          setPage(randomPage);
          setLoading(false);
          return;
        }
      }

      if (data.results && data.results.length > 0) {
        setCards((prev) => reset ? data.results : [...prev, ...data.results]);
        setPage(pageNum);
      }
    } catch (e) {
      if (e.message === 'INVALID_API_KEY') invalidateKey();
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
    setAvailableProviders([]); // Clear previous
    setIsFetchingProviders(true);

    // 1. Prepare Initial Providers (Direct Engine + MovieBox + YouTube)
    const initialProviders = [];
    if (directEngineEnabled) {
      initialProviders.push({
        id: 'direct',
        name: 'StreamDeck Engine',
        icon: 'movie-open-play',
        color: Colors.accentPurple,
        logoUrl: Image.resolveAssetSource(require('../assets/images/logo.png')).uri,
        searchUrl: null,
      });
    }

    // Add MovieBox Sources
    (movieboxSources || []).filter(s => s.enabled).forEach((s, idx) => {
      const mbDomain = s.url.trim();
      const mbSearchDomain = mbDomain.replace('http://', '').replace('https://', '');
      initialProviders.push({
        id: `moviebox_${idx}`,
        name: s.name || mbSearchDomain,
        icon: 'movie-open-play',
        color: '#8b5cf6',
        logoUrl: null,
        searchUrl: `https://${mbSearchDomain}/search?q=`,
        customDomain: mbDomain,
      });
    });

    initialProviders.push({
      id: 'youtube',
      name: 'YouTube',
      icon: 'youtube',
      color: '#FF0000',
      logoUrl: null,
      searchUrl: 'https://www.youtube.com/results?search_query=',
    });

    setAvailableProviders(initialProviders);
    
    // 2. Open Modal with a slight delay for stability
    setTimeout(() => {
      setShowPicker(true);
    }, 50);

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

      // Always Add Enabled MovieBox Sources as Primary Hubs
      
      (movieboxSources || [])
        .filter(s => s.enabled)
        .forEach((s, idx) => {
          const mbDomain = s.url.trim();
          const mbSearchDomain = mbDomain.replace('http://', '').replace('https://', '');

          // Personality Engine
          const searchSource = (s.name || mbSearchDomain).toLowerCase();
          let icon = 'movie-open-play';
          if (searchSource.includes('tv') || searchSource.includes('live')) icon = 'television-play';
          else if (searchSource.includes('flix') || searchSource.includes('cine')) icon = 'video-box';
          else if (searchSource.includes('box')) icon = 'play-box-multiple';
          else {
            const icons = ['movie-open-play', 'video-box', 'play-box-multiple', 'movie-filter'];
            icon = icons[(s.name || mbSearchDomain).length % icons.length];
          }

          const colors = ['#E21D48', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#14b8a6', '#6366f1'];
          let hash = 0;
          const name = s.name || mbSearchDomain;
          for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
          const color = colors[Math.abs(hash) % colors.length];

          streamingProviders.push({
            id: `moviebox_${idx}`,
            name: s.name || mbSearchDomain, // Show specific domain name
            icon: icon,
            color: color,
            logoUrl: null,
            searchUrl: `https://${mbSearchDomain}/search?q=`,
            appScheme: null,
            customDomain: mbDomain,
          });
        });

      // Always Add YouTube as Primary Hub
      streamingProviders.push({
        id: 'youtube',
        name: 'YouTube',
        icon: 'youtube', // Official Brand Logo
        color: '#FF0000',
        logoUrl: null,
        searchUrl: 'https://www.youtube.com/results?search_query=',
        appScheme: 'youtube://',
      });

      // Add StreamDeck Direct Engine as the first option
      if (directEngineEnabled) {
        streamingProviders.unshift({
          id: 'direct',
          name: 'StreamDeck Engine',
          icon: 'movie-open-play',
          color: Colors.accentPurple,
          logoUrl: Image.resolveAssetSource(require('../assets/images/logo.png')).uri,
          searchUrl: null,
        });
      }

      setAvailableProviders(streamingProviders);
    } catch (e) {
      console.error('[Adventure] Failed to fetch providers:', e);
    } finally {
      setIsFetchingProviders(false);
    }
  };

  const handleSelectProvider = async (provider) => {
    setShowPicker(false);
    const title = selectedMovie?.title || '';
    const tmdbId = selectedMovie?.id;

    const result = await navigateToOTT(
      provider, 
      title, 
      tmdbId, 
      'movie', 
      provider.customDomain || '', 
      navigation
    );

    // Handle unavailable from Direct Engine
    if (result && result.status === 'unavailable') {
      setShowPicker(true); // Re-open modal for user to pick another source
    }
  };

  const checkLoadMore = (index) => {
    // If we're getting close to the end of the current card pool, fetch more
    if (cards.length - index < 8) {
      loadContent(prefs, page + 1, false, lang);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: topPadding }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Overlay moved to bottom for better layering */}
      
      {renderHeader()}

      {!hasKey ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔑</Text>
          <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>One-Time Setup Required</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>Adventure uses TMDB to discover and recommend movies based on your taste. This is a one-time setup, once saved, you won't be asked again.</Text>
          <TouchableOpacity style={{ borderRadius: 12, overflow: 'hidden' }} onPress={requestKey}>
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 14, paddingHorizontal: 28 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>Set Up API Key</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={styles.container}>
            {loading || loadingPrefs ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.accentPurple} />
                <Text style={styles.loadingText}>Curating your feed...</Text>
              </View>
            ) : cards.length === 0 ? (
              <View style={styles.center}>
                <Icon name="movie-off-outline" size={80} color="rgba(255,255,255,0.1)" />
                <Text style={[styles.loadingText, { color: '#fff', fontSize: 20, marginTop: 24 }]}>No Movies Found</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 40, marginTop: 12, lineHeight: 22 }}>
                  Your current filters are a bit too specific. Try adjusting your "Tune" settings to discover more.
                </Text>
                <TouchableOpacity 
                  style={styles.retryBtn} 
                  onPress={() => navigation.navigate('AdventurePreferences')}
                >
                  <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.retryGradient}>
                    <Text style={styles.retryText}>Adjust Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
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

          {cards.length > 0 && !loading && (
            <View style={[styles.controls, { paddingBottom: insets.bottom + 80 }]}>
              <TouchableOpacity style={[styles.btn, styles.skipBtn]} onPress={() => stackRef.current?.swipeLeft()} activeOpacity={0.7}>
                <Icon name="close" size={28} color="#FF3366" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => stackRef.current?.swipeUp()} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={[styles.btn, styles.exploreBtn]}>
                  <Icon name="play" size={22} color="#fff" />
                  <Text style={styles.exploreText} allowFontScaling={false}>Watch Now</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={() => stackRef.current?.swipeRight()} activeOpacity={0.7}>
                <Icon name="bookmark-outline" size={28} color="#00FF99" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Smart Provider Selection Overlay */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.customOverlay}>
          <TouchableOpacity style={styles.modalDismissZone} onPress={() => setShowPicker(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Available On</Text>
              <Text style={styles.modalSubtitle}>Select where to stream {selectedMovie?.title || selectedMovie?.name}</Text>
            </View>

            <View style={styles.providerGrid}>
              {isFetchingProviders ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={Colors.accentPurple} />
                  <Text style={styles.modalLoadingText}>Curating streams...</Text>
                </View>
              ) : (
                availableProviders.map(provider => (
                  <TouchableOpacity
                    key={provider.id}
                    style={styles.providerItem}
                    onPress={() => handleSelectProvider(provider)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.providerIconBox, { backgroundColor: provider.logoUrl ? 'rgba(255,255,255,0.05)' : provider.color }]}>
                      {provider.logoUrl ? (
                        <Image
                          source={{ uri: provider.logoUrl }}
                          style={styles.providerLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <Icon name={provider.icon} size={32} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.providerName} numberOfLines={2}>{provider.name}</Text>
                  </TouchableOpacity>
                ))
              )}
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
  customOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    zIndex: 100000,
    elevation: 1000,
  },
  vibeBtn: { 
    borderRadius: 20, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 10,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  vibeGradient: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 8 
  },
  editPrefs: { fontSize: 13, color: '#fff', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
  adventureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20, // Rigid cinematic offset
    zIndex: 10,
    backgroundColor: Colors.bgPrimary,
  },
  headerTitleBox: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: Math.min(width * 0.06, 22), // Proportional title
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: Colors.accentPink,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  container: { 
    flex: 1, 
    justifyContent: 'center', 
  },
  stackOuter: {
    height: '100%',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  loadingText: { color: Colors.textMuted, marginTop: Spacing.md, fontSize: FontSizes.md, fontWeight: '700' },
  retryBtn: { marginTop: 32, borderRadius: 20, overflow: 'hidden' },
  retryGradient: { paddingHorizontal: 32, paddingVertical: 14 },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' },
  controls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: Spacing.xl, 
    gap: 16 
  },
  btn: { 
    height: Math.min(width * 0.16, 60), // Proportional height
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  skipBtn: { 
    width: Math.min(width * 0.17, 64), // Proportional diameter
    height: Math.min(width * 0.17, 64),
    borderRadius: 32,
    borderColor: '#F43F5E', 
    borderWidth: 2,
    backgroundColor: '#0F0F14',
    shadowColor: '#F43F5E',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 12,
  },
  saveBtn: { 
    width: Math.min(width * 0.17, 64), // Proportional diameter
    height: Math.min(width * 0.17, 64),
    borderRadius: 32,
    borderColor: '#10B981', 
    borderWidth: 2,
    backgroundColor: '#0F0F14',
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 12,
  },
  exploreBtn: { 
    flexDirection: 'row',
    height: Math.min(width * 0.16, 60), // Proportional height
    paddingHorizontal: width * 0.08,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 10,
    elevation: 15,
    shadowColor: Colors.accentPurple,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  exploreText: {
    color: '#fff',
    fontSize: Math.min(width * 0.045, 16), // Proportional font
    fontWeight: '900',
    letterSpacing: 0.5,
  },
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
  providerName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  modalLoading: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  modalLoadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  closeModalBtn: { marginTop: 8, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16 },
  closeModalText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
});

export default AdventureScreen;
