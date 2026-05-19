// StreamDeck Mobile — Home Screen
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Text,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Linking,
  ToastAndroid,
  Platform,
  Alert,
  Image,
  Dimensions,
  TextInput,
  Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  withSpring,
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../theme/colors';
import HeroSpotlight from '../components/HeroSpotlight';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import TrendingRow from '../components/TrendingRow';
import { fetchTrendingContent, fetchWatchProviders, getImageUrl, OTT_PROVIDERS, fetchProviderContent, fetchRegionalProviders, fetchTVDetails, fetchTVSeasonDetails } from '../services/tmdb';
import UpdateModal from '../components/UpdateModal';
import RegionInfoModal from '../components/RegionInfoModal';
import SeriesPickerModal from '../components/SeriesPickerModal';
import MediaProviderModal from '../components/MediaProviderModal';
import { loadSettings, loadContinueWatching, isDirectEngineEnabled, loadWatchlist, toggleWatchlistItem, loadDefaultProvider, saveDefaultProvider } from '../utils/storage';

import { fetchLiveSportsData, fetchWorldCupData } from '../services/sports';
import { useApi } from '../context/ApiContext';
import { getCurrentUser, onAuthStateChanged } from '../services/auth';
import { syncWithCloud } from '../services/sync';
import { OTT_PROVIDER_MAP, navigateToOTT } from '../utils/OTTNavigation';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const MEDIA_TYPES = [
  { id: 'all', name: 'All', icon: 'flash' },
  { id: 'live', name: 'Live', icon: 'radio' },
  { id: 'movies_series', name: 'Movies & TV', icon: 'film' },
];

const getCustomProviderAppearance = (name, url) => {
  const searchSource = (name + url).toLowerCase();
  let icon = 'movie-open-play'; // Premium default
  
  if (searchSource.includes('cric')) icon = 'trophy';
  else if (searchSource.includes('foot') || searchSource.includes('soccer')) icon = 'football';
  else if (searchSource.includes('f1') || searchSource.includes('race')) icon = 'speedometer';
  else if (searchSource.includes('sport')) icon = 'ribbon';
  else if (searchSource.includes('tv') || searchSource.includes('live')) icon = 'television-play';
  else if (searchSource.includes('flix') || searchSource.includes('cine')) icon = 'video-box';
  else if (searchSource.includes('box')) icon = 'play-box-multiple';
  else if (searchSource.includes('stream') || searchSource.includes('watch')) icon = 'play-circle';
  else {
    // Deterministic choice based on name length for variety
    const icons = ['movie-open-play', 'video-box', 'play-box-multiple', 'movie-filter'];
    icon = icons[name.length % icons.length];
  }

  const colors = ['#E21D48', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#14b8a6', '#6366f1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return { icon, color: colors[Math.abs(hash) % colors.length] };
};

const RenderSkeletonItem = ({ style, itemAnimatedStyle, shimmerStyle }) => (
  <Animated.View style={[style, itemAnimatedStyle]}>
    <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  </Animated.View>
);

const HomeSkeleton = ({ visible }) => {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const opacity = useSharedValue(1);
  const shimmer = useSharedValue(-1);
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 400 });

    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: 'rgba(255,255,255,0.04)',
    opacity: pulse.value,
    overflow: 'hidden',
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [-1, 1], [-500, 500]) }],
  }));



  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, styles.skeletonScreen, animatedStyle, { zIndex: 999 }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPadding + 10, paddingBottom: 100 }}
        style={{ width: '100%' }}
      >
        {/* Header Skeleton */}
        <View style={styles.skeletonHeader}>
          <RenderSkeletonItem style={styles.skeletonLogo} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
          <View style={styles.skeletonIcons}>
            <RenderSkeletonItem style={styles.skeletonCircle} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
            <RenderSkeletonItem style={styles.skeletonCircle} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
          </View>
        </View>

        {/* Category Chips Skeleton */}
        <View style={styles.skeletonCategoryRow}>
          {[1, 2, 3].map(i => (
            <RenderSkeletonItem key={i} style={styles.skeletonChip} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
          ))}
        </View>

        {/* Hero Spotlight Skeleton */}
        <View style={styles.skeletonHeroContainer}>
          <RenderSkeletonItem style={styles.skeletonHero} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
          <View style={styles.skeletonHeroMeta}>
             <View style={styles.skeletonHeroRow}>
                <RenderSkeletonItem style={styles.skeletonBadge} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
             </View>
            <RenderSkeletonItem style={styles.skeletonTextLineLong} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
            <View style={styles.skeletonHeroRow}>
              <RenderSkeletonItem style={styles.skeletonTextLineShort} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
              <RenderSkeletonItem style={styles.skeletonHeroPlay} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
            </View>
          </View>
        </View>

        {/* Continue Watching Skeleton */}
        <View style={styles.skeletonRowContainer}>
          <RenderSkeletonItem style={styles.skeletonRowTitle} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {[1, 2].map(i => (
              <View key={i} style={styles.skeletonCWCardContainer}>
                <RenderSkeletonItem style={styles.skeletonCWCard} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Rows Skeleton (Posters) */}
        {[1, 2].map(row => (
          <View key={row} style={styles.skeletonRowContainer}>
            <RenderSkeletonItem style={styles.skeletonRowTitle} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={styles.skeletonCardContainer}>
                  <RenderSkeletonItem style={styles.skeletonCard} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
                  <RenderSkeletonItem style={styles.skeletonCardText} itemAnimatedStyle={itemAnimatedStyle} shimmerStyle={shimmerStyle} />
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const CategoryChip = ({ cat, selectedMediaType, setSelectedMediaType }) => {
  const isSelected = selectedMediaType === cat.id;
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 300 });
    
    if (isSelected) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      // Don't reset rotation to 0 immediately to avoid jumpy transitions
      // Just let it stop or keep it at current value while fading out
    }
  }, [isSelected]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    opacity: glowOpacity.value,
  }));

  return (
    <TouchableOpacity
      onPress={() => setSelectedMediaType(cat.id)}
      activeOpacity={0.8}
      style={styles.categoryChipContainer}
    >
      <View style={[styles.categoryChip, isSelected && styles.categoryChipActive]}>
        <Animated.View style={[styles.glowBorder, animatedGlowStyle]}>
          <LinearGradient
            colors={['#8b5cf6', 'transparent', '#ec4899', 'transparent', '#8b5cf6']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <View style={[styles.categoryChipInner, isSelected && styles.categoryChipInnerActive]}>
          <Ionicons 
            name={cat.icon} 
            size={16} 
            color={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
            {cat.name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { hasKey, requestKey, invalidateKey } = useApi();
  
  // ─── STABLE HOOK BLOCK ──────────────────────────────────────────
  const [globalTrending, setGlobalTrending] = useState([]);
  const [localTrending, setLocalTrending] = useState([]);
  const [providerTrendingCache, setProviderTrendingCache] = useState({});
  const [activeProvider, setActiveProvider] = useState({ id: 8, name: 'Netflix' });
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [regionName, setRegionName] = useState('India');
  const [continueWatching, setContinueWatching] = useState([]);
  const [heroItems, setHeroItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingCW, setLoadingCW] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isFetchingProviders, setIsFetchingProviders] = useState(false);
  const [showRedirectWarning, setShowRedirectWarning] = useState(false);
  const [showRegionInfo, setShowRegionInfo] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState(null);

  // --- TV Series Selection State ---
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);

  // --- TAB BAR SYNC (Keeping bar visible for stability, modals handle their own padding) ---
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { 
        display: 'flex',
        backgroundColor: '#0D0D12', 
        borderTopWidth: 0, 
        height: 65, 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        elevation: 0 
      }
    });
  }, [navigation]);
  const [selectedQuickItem, setSelectedQuickItem] = useState(null);
  const lastSyncTime = useRef(0);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [customProviders, setCustomProviders] = useState([]);
  const [movieboxSources, setMovieboxSources] = useState([]);
  const [directEngineEnabled, setDirectEngineEnabledState] = useState(true);
  const [selectedMediaType, setSelectedMediaType] = useState('all'); // 'all', 'movie', 'tv'
  const [watchlist, setWatchlist] = useState([]);
  const [regionCode, setRegionCode] = useState('IN');
  const [regionalProviders, setRegionalProviders] = useState([]);
  const [providerSearch, setProviderSearch] = useState('');
  const isInitialLoad = useRef(true);
  const lastRegionCode = useRef('IN');
  const lastLanguages = useRef('');

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;
  const modalSafePadding = bottomPadding; // Minimal padding for Modal footer

  const loadData = useCallback(async (forceRefresh = false, silent = false) => {
    try {
      const settings = await loadSettings();
      const region = settings.contentRegion || 'IN';
      const currentLangs = (settings.preferredLanguages || []).join('|');
      
      const shouldShowSkeleton = isInitialLoad.current || lastRegionCode.current !== region || lastLanguages.current !== currentLangs || forceRefresh;
      
      if (lastRegionCode.current !== region || lastLanguages.current !== currentLangs || forceRefresh) {
        setProviderTrendingCache({}); // Clear provider cache on region/lang change
      }
      if (shouldShowSkeleton && !silent) {
        setLoading(true);
      }

      setRegionCode(region);
      lastRegionCode.current = region;
      lastLanguages.current = currentLangs;
      isInitialLoad.current = false;
      setCustomProviders(settings.liveSportsProviders || []);
      setMovieboxSources(settings.movieboxSources || []);
      setDirectEngineEnabledState(settings.directEngineEnabled !== false); // Default to true

      const REGION_NAMES = { IN: 'India', US: 'the US', GB: 'the UK', AU: 'Australia', CA: 'Canada' };
      setRegionName(REGION_NAMES[region] || region);

      // --- Task 0: Regional Providers (Required for UI filtering) ---
      const tmdbProviders = await fetchRegionalProviders(region);
      setRegionalProviders(tmdbProviders);

      // Resolve initial active provider ID
      let targetProvider = activeProvider; // Fallback to current state
      const currentValid = tmdbProviders.find(tp => tp.provider_id === activeProvider.id);
      
      if (!currentValid && tmdbProviders.length > 0) {
        // Fallback to the first available provider in the region
        targetProvider = { 
          id: tmdbProviders[0].provider_id, 
          name: tmdbProviders[0].provider_name,
          logoUrl: tmdbProviders[0].logo_path ? `https://image.tmdb.org/t/p/w200${tmdbProviders[0].logo_path}` : null
        };
        setActiveProvider(targetProvider);
      }

      // --- Task 1: Watchlist (Silent) ---
      const watchlistTask = loadWatchlist().then(wl => setWatchlist(wl || []));

      // --- Task 2: Trending Content (CRITICAL) ---
      const trendingTask = fetchTrendingContent(region, forceRefresh).then(({ global, local }) => {
        setGlobalTrending(global);
        setLoadingGlobal(false);
        setLocalTrending(local);
        setLoadingLocal(false);
        
        // Update Hero with what we have
        setHeroItems(prev => [...prev.filter(item => item.isSports), ...global.slice(0, 8)]);
        setLoading(false); // Can hide global skeleton once first major section is ready
        return { global, local };
      });

      // --- Task 3: Active Provider Content (CRITICAL) ---
      const providerTask = (async () => {
        setLoadingProvider(true);
        try {
          if (!providerTrendingCache[targetProvider.id] || forceRefresh) {
            const pData = await fetchProviderContent(region, targetProvider.id);
            setProviderTrendingCache(prev => ({ ...prev, [targetProvider.id]: pData }));
          }
        } finally {
          setLoadingProvider(false);
        }
      })();

      // --- Task 4: Live Sports ---
      const sportsTask = (async () => {
        setLoadingSports(true);
        try {
          // Fetch general sports matches
          const matches = await fetchLiveSportsData();
          const preferredLeagues = ['ipl', 'la liga', 'premier league', 'champions league', 'bundesliga', 'serie a', 'india', 'indian', 'f1', 'formula'];
          let topLiveMatches = matches.filter(m => {
            const lowerTitle = m.title.toLowerCase();
            return (m.status === 'LIVE' || m.status === 'soon') && preferredLeagues.some(league => lowerTitle.includes(league));
          });
          
          // Fallback: If no preferred live matches, just show the top 2 overall live/soon/upcoming matches!
          if (topLiveMatches.length === 0) {
            topLiveMatches = matches.slice(0, 2);
          }

          const heroSports = topLiveMatches.slice(0, 3).map(match => {
            const lowerTitle = match.title.toLowerCase();
            let backdrop = null;
            if (match.backdrop) {
              backdrop = match.backdrop;
            } else if (lowerTitle.includes('ipl') || lowerTitle.includes('india') || match.type === 'cricket') {
              backdrop = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop';
            } else if (match.type === 'football' || lowerTitle.includes('league') || lowerTitle.includes('liga') || lowerTitle.includes('serie')) {
              backdrop = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=600&auto=format&fit=crop';
            } else if (match.type === 'f1' || lowerTitle.includes('f1') || lowerTitle.includes('formula')) {
              backdrop = 'https://images.pexels.com/photos/36920232/pexels-photo-36920232.jpeg?auto=compress&cs=tinysrgb&w=1200';
            }
            return {
              id: `sport-${match.id}`,
              title: match.title,
              vote_average: 10.0,
              release_date: new Date().toISOString(),
              overview: match.status === 'soon' ? `STARTING SOON • Watch ${match.title}` : `LIVE NOW • Watch ${match.title}`,
              isSports: true,
              match: match,
              backdrop_path: backdrop,
              media_type: 'sport'
            };
          });

          // Fetch World Cup matches
          let wcMatches = [];
          try {
            wcMatches = await fetchWorldCupData();
          } catch (wcErr) {
            console.error('[Home] Fetch World Cup failed:', wcErr);
          }

          const nowTime = new Date();

          // Filter World Cup matches (LIVE or UPCOMING within 30 minutes)
          const activeWcMatches = [];
          wcMatches.forEach(match => {
            const mTime = new Date(match.rawDate).getTime();
            const diffMins = (mTime - nowTime.getTime()) / (1000 * 60);
            
            let currentStatus = match.status;
            if (currentStatus === 'UPCOMING' && diffMins > 0 && diffMins <= 30) {
              currentStatus = 'soon';
            }
            
            if (currentStatus === 'LIVE' || currentStatus === 'soon') {
              activeWcMatches.push({
                ...match,
                status: currentStatus
              });
            }
          });

          // Map active World Cup matches to HeroSpotlight format
          const heroWcSports = activeWcMatches.map(match => {
            return {
              id: `wc-${match.team1}-${match.team2}`,
              title: `${match.team1} vs ${match.team2}`,
              vote_average: 10.0,
              release_date: match.rawDate,
              overview: match.status === 'soon' ? `FIFA WORLD CUP • STARTING SOON • ${match.venue}` : `FIFA WORLD CUP • LIVE • ${match.venue}`,
              isSports: true,
              isWorldCup: true,
              match: {
                ...match,
                title: `${match.team1} vs ${match.team2}`,
                type: 'football',
                logo1: match.flag1,
                logo2: match.flag2,
                quickAccessName: 'Football'
              },
              backdrop_path: require('../assets/images/wc_bg.png'), // Premium local World Cup backdrop
              media_type: 'sport'
            };
          });

          const combinedSports = [...heroWcSports, ...heroSports];

          setHeroItems(prev => [...combinedSports, ...prev.filter(item => !item.isSports)]);
          setLoadingSports(false);
          return combinedSports;
        } catch (e) {
          console.error('[Home] Sports load failed:', e);
          setLoadingSports(false);
          return [];
        }
      })();

      // --- Task 5: Continue Watching (Silent) ---
      const cwTask = loadContinueWatching().then(cwItems => {
        setContinueWatching(cwItems);
        setLoadingCW(false);
      });

      // --- Task 6: Direct Engine Status ---
      const engineTask = isDirectEngineEnabled().then(enabled => setDirectEngineEnabledState(enabled));

      // If it's a pull-to-refresh, wait for all tasks to finish completely
      if (forceRefresh) {
        // Also trigger a cloud sync on pull-to-refresh to fetch latest from other devices
        const user = getCurrentUser();
        const syncTask = user ? syncWithCloud(user.uid) : Promise.resolve();
        
        await Promise.allSettled([watchlistTask, trendingTask, providerTask, sportsTask, cwTask, engineTask, syncTask]);
        
        // Final state refresh after sync
        const wl = await loadWatchlist();
        setWatchlist(wl);
        const cw = await loadContinueWatching();
        setContinueWatching(cw);
      }
    } catch (error) {
      if (error.message === 'INVALID_API_KEY') {
        invalidateKey();
      } else {
        console.error('Failed to load home data', error);
      }
    } finally {
      setRefreshing(false);
      setLoading(false); // Ensure skeleton is hidden even on partial failure
    }
  }, [invalidateKey, providerTrendingCache, activeProvider.id, regionCode]);

  useFocusEffect(
    useCallback(() => {
      if (!hasKey) {
        requestKey();
      }
      
      // Refresh Continue Watching items when screen comes into focus
      loadContinueWatching().then(items => {
        setContinueWatching(items);
      });
    }, [hasKey, requestKey])
  );

  useEffect(() => {
    if (hasKey) {
      loadData();
    }
  }, [loadData, hasKey]);

  // --- Background Cloud Sync (Optimized) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        const now = Date.now();
        // Only trigger background sync if it hasn't happened in the last 60 seconds
        // OR if this is the first time the user is identified in this session
        if (now - lastSyncTime.current > 60000) {
          console.log('[Home] User identified — triggering background sync...');
          lastSyncTime.current = now;
          await syncWithCloud(user.uid);
          
          // Update local state silently
          const wl = await loadWatchlist();
          setWatchlist(wl);
          const cw = await loadContinueWatching();
          setContinueWatching(cw);
          
          const st = await loadSettings();
          if (st.contentRegion && st.contentRegion !== lastRegionCode.current) {
             console.log('[Sync] Region changed via cloud sync, refreshing...');
             loadData(false, true); 
          }
        }
      }
    });
    return unsubscribe;
  }, []); // Static subscription

  // Refresh data when screen is focused (Silent unless region changed)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Trigger a light sync on focus if user exists
      const user = getCurrentUser();
      if (user) syncWithCloud(user.uid).then(() => loadWatchlist().then(setWatchlist));

      // Use silent refresh to avoid flickering for the user
      loadData(false, true);
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true); // FORCE REFRESH
  }, [loadData]);



  const SPORTS_PROVIDER_CONFIG = {
    'IPL Live': [{ id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: 'star', logoUrl: 'https://image.tmdb.org/t/p/w200/7Fl8ylPDclt3ZYgNbW2t7rbZE9I.jpg' }],
    'Football': [{ id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: 'star', logoUrl: 'https://image.tmdb.org/t/p/w200/7Fl8ylPDclt3ZYgNbW2t7rbZE9I.jpg' }],
    'F1 Live': [{ id: 'fancode', name: 'FanCode', appScheme: 'fancode://', url: 'https://fancode.com', color: '#FF6B35', icon: 'football', logoUrl: null }],
    'WWE': [{ id: 'sonyliv', name: 'SonyLIV', appScheme: 'sonyliv://', url: 'https://www.sonyliv.com', color: '#2e2e6e', icon: 'tv', logoUrl: 'https://image.tmdb.org/t/p/w200/tBhjAMfKnkzJNmOiMB8DsBx5QAp.jpg' }]
  };

  // ── + Button: Add / remove from library ───────────────
  const handleAddToLibrary = async (movie) => {
    if (movie.isSports) return; // Sports can't be added to library
    try {
      const updated = await toggleWatchlistItem(movie);
      setWatchlist(updated);
      
      // Sync change to cloud immediately
      const user = getCurrentUser();
      if (user) {
        syncWithCloud(user.uid);
      }

      const isNowInList = updated.some(m => m.id === movie.id);
      const title = movie.title || movie.name || 'Item';
      const msg = isNowInList
        ? `${title} added to Library`
        : `${title} removed from Library`;

      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert(isNowInList ? 'Added' : 'Removed', msg);
      }
    } catch (e) {
      console.error('[Home] Failed to toggle watchlist:', e);
    }
  };

  // ── ▶ Button: Show where to stream ───────────────────
  const handlePlayPress = async (movie, forcedEpisode = null) => {
    if (!movie) return;

    if (movie.isWorldCup || movie.id === 'wc-2026-promo-banner' || movie.isWorldCupPromo) {
      navigation.navigate('LiveTV', { expandWorldCup: true });
      return;
    }
    
    const title = movie.title || movie.name || 'Movie';
    // Robust detection: if it has first_air_date or is explicitly 'tv', it's a series
    const mediaType = movie.media_type === 'tv' || movie.first_air_date ? 'tv' : 'movie';
    const tmdbId = movie.id;
    const activeEpisode = forcedEpisode;

    console.log(`[Home] handlePlayPress triggered: ${title} (${mediaType}:${tmdbId}) | Episode: ${activeEpisode?.episode_number || 'none'}`);

    if (mediaType === 'tv' && !forcedEpisode) {
      setSelectedQuickItem({ id: tmdbId, tmdbId, name: title, mediaType, thumb: movie.poster_path });
      setShowSeriesPicker(true);
      return;
    }

    if (forcedEpisode) {
      setSelectedQuickItem(movie);
    }

    // 1. Prepare Provider Categories
    const engineProviders = [];
    const movieboxProviders = [];
    const socialProviders = [];

    // Category: StreamDeck Engine
    if (directEngineEnabled) {
      engineProviders.push({
        id: 'direct',
        name: 'StreamDeck Engine',
        icon: 'movie-open-play',
        color: Colors.accentPurple,
        logoUrl: 'local_logo',
        searchUrl: null,
      });
    }
    
    // Category: MovieBox Sources (Streaming Services)
    (movieboxSources || [])
      .filter(s => s.enabled)
      .forEach((s, idx) => {
        const mbDomain = s.url.trim();
        const mbSearchDomain = mbDomain.replace('http://', '').replace('https://', '');
        const appearance = getCustomProviderAppearance(s.name || mbSearchDomain, mbDomain);
        movieboxProviders.push({
          id: `moviebox_${idx}`,
          name: s.name || mbSearchDomain,
          icon: appearance.icon,
          color: appearance.color,
          logoUrl: null,
          searchUrl: `https://${mbSearchDomain}/search?q=`,
          appScheme: null,
          customDomain: mbDomain,
        });
      });

    // Category: Social/Generic (YouTube)
    socialProviders.push({
      id: 'youtube',
      name: 'YouTube',
      icon: 'youtube',
      color: '#FF0000',
      logoUrl: null,
      searchUrl: 'https://www.youtube.com/results?search_query=',
      appScheme: 'youtube://',
    });

    // 2. Set initial state (OTT will be empty/fetching)
    const movieThumb = movie.backdrop_path 
      ? getImageUrl(movie.backdrop_path) 
      : (movie.poster_path ? getImageUrl(movie.poster_path) : movie.thumb);
      
    if (!forcedEpisode) {
      setSelectedQuickItem({ name: title, mediaType, tmdbId, thumb: movieThumb });
    }
    setAvailableProviders([...engineProviders, ...movieboxProviders, ...socialProviders]);

    // Check for DEFAULT PROVIDER before showing picker
    const defaultId = await loadDefaultProvider();
    if (defaultId) {
      const allReadyProviders = [...engineProviders, ...movieboxProviders, ...socialProviders];
      const defaultProvider = allReadyProviders.find(p => p.id === defaultId);
      
      if (defaultProvider) {
        console.log(`[Home] Default provider found: ${defaultId}. Bypassing modal.`);
        handleSelectProvider(defaultProvider, false, movie); // already saved, no need to save again
        return;
      }
    }

    setShowPicker(true);
    console.log(`[Home] setShowPicker(true) called. Providers: ${engineProviders.length + movieboxProviders.length + socialProviders.length}`);

    if (movie.isSports) {
      const qName = movie.match?.quickAccessName || (movie.match?.type === 'football' ? 'Football' : 'IPL Live');
      const nativeProviders = SPORTS_PROVIDER_CONFIG[qName] || [];
      const formattedCustomProviders = customProviders.map((p, idx) => {
        const appearance = getCustomProviderAppearance(p.name, p.url);
        return {
          id: `custom_${idx}`, name: p.name, url: p.url, color: appearance.color, icon: appearance.icon,
        };
      });

      setAvailableProviders([...engineProviders, ...nativeProviders, ...formattedCustomProviders, ...movieboxProviders, ...socialProviders]);
      return;
    }

    // 3. Fetch TMDB providers in background for Movies/TV
    setIsFetchingProviders(true);
    try {
      const providers = await fetchWatchProviders(tmdbId, mediaType);
      const fetchedOttProviders = [];
      const seenIds = new Set();

      if (providers?.flatrate) {
        providers.flatrate.forEach(p => {
          const mapped = OTT_PROVIDER_MAP[p.provider_id];
          if (mapped && !seenIds.has(mapped.id)) {
            seenIds.add(mapped.id);
            fetchedOttProviders.push({
              ...mapped,
              logoUrl: p.logo_path 
                ? `https://image.tmdb.org/t/p/w200${p.logo_path}` 
                : mapped.logoUrl || null,
            });
          }
        });
      }
      
      // Merge with priority: Engine > OTT > MovieBox > Social
      setAvailableProviders([
        ...engineProviders,
        ...fetchedOttProviders,
        ...movieboxProviders,
        ...socialProviders
      ]);
    } catch (e) {
      console.warn('[Home] Failed to fetch TMDB providers:', e);
    } finally {
      setIsFetchingProviders(false);
    }
  };


  const handleSelectEpisode = (episode, season) => {
    setShowSeriesPicker(false);
    
    // Trigger provider selection immediately with the chosen episode
    handlePlayPress({
      ...selectedQuickItem,
      id: selectedQuickItem.tmdbId,
      mediaType: 'tv',
      media_type: 'tv',
      title: selectedQuickItem.name,
      season: season.season_number,
      episode: episode.episode_number,
      episodeTitle: episode.name,
      thumb: episode.still_path 
        ? `https://image.tmdb.org/t/p/w400${episode.still_path}` 
        : selectedQuickItem.thumb
    }, episode);
  };

  const handleSelectProvider = async (provider, rememberChoice = false, forcedItem = null) => {
    setShowPicker(false);
    const movie = forcedItem || selectedQuickItem;
    const title = movie?.name || movie?.title || '';
    const mediaType = movie?.mediaType || movie?.media_type;
    const tmdbId = movie?.tmdbId || movie?.id;

    if (rememberChoice) {
      console.log(`[Home] Saving ${provider.id} as default provider.`);
      await saveDefaultProvider(provider.id);
      if (Platform.OS === 'android') {
        ToastAndroid.show(`${provider.name} set as default. Change this in Settings.`, ToastAndroid.LONG);
      }
    }

    console.log(`[Home] Selecting Provider: ${provider.name} for ${title} (${mediaType}:${tmdbId})`);

    // 4. Check for existing progress to resume automatically
    let resumeTime = 0;
    try {
      const cwItems = await loadContinueWatching();
      const s = movie.season || 1;
      const e = movie.episode || 1;
      
      const existing = cwItems.find(i => {
        if (mediaType === 'tv') {
          return i.tmdbId === tmdbId && i.mediaType === 'tv' && i.season === s && i.episode === e;
        }
        return i.tmdbId === tmdbId && i.mediaType === mediaType;
      });

      if (existing) {
        resumeTime = existing.currentTime || 0;
        console.log(`[Home] Resuming ${title} (S${s}E${e}) from ${resumeTime}s`);
      }
    } catch (err) {}

    const result = await navigateToOTT(
      provider,
      movie.episodeTitle || title,
      tmdbId,
      mediaType,
      provider.customDomain,
      navigation,
      movie.season || 1,
      movie.episode || 1,
      resumeTime,
      movie.thumb,
      title // Pass the showName (original title)
    );

    if (result && result.status === 'unavailable') {
      setRefreshing(false);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || 'Not available on StreamDeck Engine. Try other sources.',
          ToastAndroid.LONG
        );
      } else {
        Alert.alert('Content Unavailable', result.message || 'Not available on StreamDeck Engine.');
      }
      // Re-open the modal so user can pick another source
      setShowPicker(true);
      return;
    }

    if (result && result.status === 'unverified') {
      setRedirectInfo({ ...result, provider });
      setShowRedirectWarning(true);
    }
  };

  const handleConfirmRedirect = () => {
    setShowRedirectWarning(false);
    if (redirectInfo) {
      navigation.navigate('WebView', {
        url: redirectInfo.homepageUrl,
        title: redirectInfo.domain,
        appId: redirectInfo.provider.id,
        color: redirectInfo.provider.color || '#333',
        type: 'moviebox',
      });
    }
  };

  const handleProviderSelect = async (p) => {
    const provider = {
      id: p.provider_id,
      name: p.provider_name,
      logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w200${p.logo_path}` : null
    };
    setActiveProvider(provider);
    setShowProviderDropdown(false);
    setProviderSearch(''); // Reset search on select
    
    // Check cache
    if (!providerTrendingCache[provider.id]) {
      setLoadingProvider(true);
      try {
        const pData = await fetchProviderContent(regionCode, provider.id);
        setProviderTrendingCache(prev => ({ ...prev, [provider.id]: pData }));
      } finally {
        setLoadingProvider(false);
      }
    }
  };

  const handleContinueWatchingPress = item => {
    // If it's a Direct Engine item, use navigateToOTT to ensure we check availability and pass resumeTime
    if (item.appId === 'direct' || item.tmdbId) {
      const provider = { 
        id: item.appId || 'direct', 
        name: item.appId === 'direct' ? 'StreamDeck Engine' : (item.title || 'Video'), 
        color: Colors.accentPurple 
      };
      
      navigateToOTT(
        provider,
        item.title,
        item.tmdbId,
        item.mediaType || 'movie',
        null, // movieboxDomain
        navigation,
        item.season || 1,
        item.episode || 1,
        item.currentTime || 0,
        item.thumb,
        item.showName
      );
    } else {
      // Fallback for items without TMDB ID (like custom streams)
      navigation.navigate('WebView', {
        url: item.url,
        title: item.title,
        appId: item.appId,
        resumeTime: item.currentTime,
        thumb: item.thumb
      });
    }
  };

  const handleRemoveContinueWatching = async (id) => {
    const { removeContinueWatchingEntry } = require('../utils/storage');
    const updated = await removeContinueWatchingEntry(id);
    setContinueWatching(updated);
    
    // Sync removal to cloud immediately
    const user = getCurrentUser();
    if (user) {
      syncWithCloud(user.uid);
    }
  };

  const filterContent = (items, type) => {
    if (type === 'all') return items;
    if (type === 'live') return items.filter(item => item.isSports);
    return items.filter(item => !item.isSports);
  };



  if (!hasKey) {
    return (
      <View style={[styles.screen, { paddingTop: topPadding, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔑</Text>
        <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
          One-Time Setup Required
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
          StreamDeck needs a free TMDB API key to load movie posters, trending content, and search results. This is a one-time setup, once saved, you won't be asked again.
        </Text>
        <TouchableOpacity
          style={{ borderRadius: 12, overflow: 'hidden' }}
          onPress={requestKey}
        >
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 14, paddingHorizontal: 28 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>Set Up API Key</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const isAnyModalOpen = showPicker || showProviderDropdown || showRedirectWarning || showSeriesPicker;
  
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Modals removed from here and moved to bottom for better layering */}

      <HomeSkeleton visible={loading} />
      <UpdateModal />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: topPadding + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accentPurple}
            colors={[Colors.accentPurple]}
            progressBackgroundColor={Colors.bgSecondary}
          />
        }>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>STREAMDECK</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconCircle}
              onPress={() => navigation.navigate('Explore')}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconCircle}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-sharp" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* World Cup 2026 Promo Banner */}
        {(selectedMediaType === 'all' || selectedMediaType === 'live') && (
          <TouchableOpacity
            style={styles.wcBannerContainer}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('LiveTV', { expandWorldCup: true })}
          >
            <LinearGradient
              colors={['#FFD700', '#0047A0', '#EF4444', '#10B981']} // Gold, USA Blue, Canada Red, Mexico Green
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.wcBannerGradientBorder}
            >
              <View style={styles.wcBannerInner}>
                <Image
                  source={require('../assets/images/wc_bg.png')}
                  style={[StyleSheet.absoluteFill, styles.wcBannerBackdrop]}
                  resizeMode="cover"
                  blurRadius={4}
                />
                <View style={[StyleSheet.absoluteFill, styles.wcBannerOverlay]} />
                
                <View style={styles.wcBannerContent}>
                  <View style={styles.wcBannerLeft}>
                    <View style={styles.wcBannerBadge}>
                      <Ionicons name="trophy" size={12} color="#FFD700" style={{ marginRight: 4 }} />
                      <Text style={styles.wcBannerBadgeText}>FIFA WORLD CUP 2026</Text>
                    </View>
                    <Text style={styles.wcBannerTitle}>Road to 2026</Text>
                    <Text style={styles.wcBannerSubtitle}>USA • Canada • Mexico</Text>
                  </View>
                  
                  <View style={styles.wcBannerRight}>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.wcBannerBtn}
                    >
                      <Text style={styles.wcBannerBtnText}>VIEW ALL</Text>
                      <Ionicons name="chevron-forward" size={12} color="#000" />
                    </LinearGradient>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}>
          {MEDIA_TYPES.map(cat => (
            <CategoryChip 
              key={cat.id} 
              cat={cat} 
              selectedMediaType={selectedMediaType} 
              setSelectedMediaType={setSelectedMediaType} 
            />
          ))}
        </ScrollView>

        {/* Hero Spotlight */}
        <HeroSpotlight
          movies={filterContent(heroItems, selectedMediaType)}
          onPlay={handlePlayPress}
          onAddToList={handleAddToLibrary}
          paused={showPicker}
          watchlist={watchlist}
        />

        {/* Continue Watching */}
        <ContinueWatchingRow
          items={continueWatching}
          onItemPress={handleContinueWatchingPress}
          onRemoveItem={handleRemoveContinueWatching}
        />

        {/* What's Trending Globally */}
        <TrendingRow
          title="What's Trending Globally"
          movies={globalTrending}
          isLoading={loadingGlobal}
          onMoviePress={handlePlayPress}
          watchlist={watchlist}
          onAddToList={handleAddToLibrary}
        />

        {/* What's Trending in India / US / etc */}
        <TrendingRow
          title={`What's Trending in ${regionName}`}
          movies={localTrending}
          isLoading={loadingLocal}
          onMoviePress={handlePlayPress}
          watchlist={watchlist}
          onAddToList={handleAddToLibrary}
          titleExtra={
            <TouchableOpacity 
              onPress={() => setShowRegionInfo(true)} 
              style={{ padding: 4 }} 
              activeOpacity={0.6}
            >
              <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          }
        />

        {/* Provider Trending Row */}
        <View style={{ marginBottom: Spacing.xl }}>
          <TrendingRow
            title={`Trending on ${activeProvider.name}`}
            onTitlePress={() => setShowProviderDropdown(true)}
            showChevron={true}
            movies={providerTrendingCache[activeProvider.id] || []}
            isLoading={loadingProvider}
            onMoviePress={handlePlayPress}
            watchlist={watchlist}
            onAddToList={handleAddToLibrary}
            style={{ marginBottom: 0 }}
            titleExtra={
              <TouchableOpacity 
                onPress={() => setShowRegionInfo(true)} 
                style={{ padding: 4 }} 
                activeOpacity={0.6}
              >
                <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            }
          />
        </View>

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>

        <SeriesPickerModal
          visible={showSeriesPicker}
          item={selectedQuickItem}
          continueWatching={continueWatching}
          onClose={() => setShowSeriesPicker(false)}
          onSelectEpisode={handleSelectEpisode}
        />

        <MediaProviderModal
          visible={showPicker}
          providers={availableProviders}
          isFetching={isFetchingProviders}
          onClose={() => setShowPicker(false)}
          onSelectProvider={handleSelectProvider}
        />

      <Modal 
        visible={showProviderDropdown} 
        transparent={true} 
        animationType="none"
        onRequestClose={() => setShowProviderDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalDismissZone} 
            onPress={() => setShowProviderDropdown(false)} 
            activeOpacity={1} 
          />
          <Animated.View 
            entering={FadeInDown.duration(300)}
            exiting={FadeOutDown.duration(200)}
            style={[styles.modalContent, { maxHeight: '70%', paddingBottom: modalSafePadding }]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Switch Provider</Text>
              <Text style={styles.modalSubtitle}>Streaming services in your region</Text>
            </View>

            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search providers..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={providerSearch}
                onChangeText={setProviderSearch}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {regionalProviders.filter(p => p.provider_name.toLowerCase().includes(providerSearch.toLowerCase())).map(p => {
                const isActive = p.provider_id === activeProvider.id;
                const logoUrl = p.logo_path ? `https://image.tmdb.org/t/p/w200${p.logo_path}` : null;
                const initials = p.provider_name.substring(0, 2).toUpperCase();

                return (
                  <TouchableOpacity
                    key={p.provider_id}
                    style={[styles.providerDropdownItem, isActive && styles.providerDropdownItemActive]}
                    onPress={() => handleProviderSelect(p)}>
                    <View style={[styles.providerDropdownCircle, { backgroundColor: logoUrl ? 'transparent' : Colors.accentPurple, overflow: 'hidden' }]}>
                      {logoUrl ? (
                        <Image
                          source={{ uri: logoUrl }}
                          style={{ width: 36, height: 36, borderRadius: 18 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.providerDropdownInitials}>{initials}</Text>
                      )}
                    </View>
                    <Text style={[styles.providerDropdownName, isActive && { color: '#fff', fontWeight: '800' }]}>{p.provider_name}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.accentPurple} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.simpleCloseBtn} onPress={() => setShowProviderDropdown(false)}>
              <Text style={styles.simpleCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal 
        visible={showRedirectWarning} 
        transparent={true} 
        animationType="none"
        onRequestClose={() => setShowRedirectWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalDismissZone} 
            onPress={() => setShowRedirectWarning(false)} 
            activeOpacity={1} 
          />
          <Animated.View 
            entering={FadeInDown.duration(300)}
            exiting={FadeOutDown.duration(200)}
            style={[styles.redirectModalContent, { paddingBottom: modalSafePadding }]}
          >
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalAccentBar}
            />
            <View style={styles.redirectHeader}>
              <View style={styles.redirectIconCircle}>
                <Icon name="open-in-new" size={32} color={Colors.accentPurple} />
              </View>
              <Text style={styles.redirectTitle}>One Final Step</Text>
              <Text style={styles.redirectSubtitle}>StreamDeck Engine is searching...</Text>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                We'll take you to the homepage of <Text style={styles.highlightText}>{redirectInfo?.domain}</Text>.
              </Text>
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Tap the 'Continue' button to open the site.</Text>
              </View>
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Use their search bar for: <Text style={styles.highlightText}>"{redirectInfo?.movieTitle}"</Text></Text>
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowRedirectWarning(false)} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleConfirmRedirect} activeOpacity={0.7}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  <Text style={styles.confirmBtnText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <RegionInfoModal
        visible={showRegionInfo}
        onClose={() => setShowRegionInfo(false)}
        regionName={regionName}
        onNavigateToSettings={() => navigation.navigate('Settings', { highlightSection: 'discovery' })}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollView: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonScreen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  skeletonLogo: {
    width: 140,
    height: 24,
    borderRadius: 6,
  },
  skeletonIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  skeletonCategoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 25,
    gap: 10,
  },
  skeletonChip: {
    width: 90,
    height: 38,
    borderRadius: 12,
  },
  skeletonHeroContainer: {
    marginBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  skeletonHero: {
    width: '92%',
    aspectRatio: 0.72,
    borderRadius: 30,
    marginBottom: 20,
  },
  skeletonHeroMeta: {
    width: '92%',
    gap: 12,
    paddingHorizontal: 10,
  },
  skeletonHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonBadge: {
    width: 100,
    height: 18,
    borderRadius: 4,
  },
  skeletonHeroPlay: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  skeletonTextLineLong: {
    width: '80%',
    height: 28,
    borderRadius: 6,
  },
  skeletonTextLineShort: {
    width: '50%',
    height: 18,
    borderRadius: 4,
  },
  skeletonRowContainer: {
    marginBottom: 40,
  },
  skeletonRowTitle: {
    width: 180,
    height: 24,
    borderRadius: 12,
    marginLeft: 20,
    marginBottom: 20,
  },
  skeletonCWCardContainer: {
    marginRight: 18,
  },
  skeletonCWCard: {
    width: Dimensions.get('window').width * 0.42,
    height: (Dimensions.get('window').width * 0.42) * 0.56,
    borderRadius: 16,
  },
  skeletonCardContainer: {
    marginRight: 18,
    gap: 10,
  },
  skeletonCard: {
    width: Dimensions.get('window').width * 0.28,
    height: (Dimensions.get('window').width * 0.28) * 1.7,
    borderRadius: 16,
  },
  skeletonCardText: {
    width: 80,
    height: 14,
    borderRadius: 7,
  },
  splashContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
    blurRadius: 40,
  },
  splashLogoBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: Colors.bgSecondary,
    padding: 10,
    elevation: 20,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    marginBottom: 40,
  },
  splashLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  shimmerContainer: {
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 20,
    textShadowColor: 'rgba(157, 78, 221, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  splashSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loadingLineContainer: {
    width: 200,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loadingLineBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  loadingLineProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%', // Decorative progress
    borderRadius: 2,
  },
  bottomPadding: {
    height: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerIconText: {
    fontSize: 18,
  },
  categoryContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  categoryChipContainer: {
    marginRight: 10,
  },
  categoryChip: {
    padding: 1.5, // Space for the glowing border
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#000', // Black background for the inner content to pop
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  categoryChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  categoryChipInnerActive: {
    backgroundColor: '#000',
  },
  glowBorder: {
    position: 'absolute',
    width: 200, // Large enough to cover rotation
    height: 200,
    top: -75,
    left: -50,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  categoryTextActive: {
    color: '#fff',
  },
  categoryScroll: {
    marginVertical: 12,
  },

  // ── Modal: smooth fade overlay ──────────────────────
  // Removed duplicate modalOverlay definition
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker for better contrast
    justifyContent: 'flex-end',
  },
  modalDismissZone: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.accentPurple,
    borderRadius: 2,
    marginBottom: 20,
    opacity: 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  providerItem: {
    width: 86,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  providerIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  providerIconText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  providerName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  simpleCloseBtn: {
    marginTop: 0,
    height: 32, // Minimal height for centering
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleCloseText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // ── Redirect Warning Modal ─────────────────────────
  warningIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 32,
  },
  warningCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  warningText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  highlightText: {
    color: '#D4A5FF',
    fontWeight: '800',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentPurple,
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepText: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProvidersBox: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginTop: 8,
  },
  noProvidersText: {
    color: 'rgba(255,255,255,0.6)', // High-contrast silver-muted
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },
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
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtn: {
    // Gradient handled by LinearGradient child
  },
  btnGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  providerDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  providerDropdownItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  providerDropdownCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  providerDropdownInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  providerDropdownName: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 12,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  seriesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  seriesItemInfo: {
    flex: 1,
  },
  seriesItemTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  seriesItemSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  backToSeasons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
    paddingHorizontal: 4,
  },
  backToSeasonsText: {
    color: Colors.accentPurple,
    fontSize: 14,
    fontWeight: '700',
  },
  playIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accentPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── New Series Picker Styles ──
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIconBar: {
    width: 3,
    height: 18,
    backgroundColor: Colors.accentPink,
    borderRadius: 2,
  },
  seriesControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
    zIndex: 10,
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  seasonSelectorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  epSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  epSearchInput: {
    flex: 1,
    height: 36,
    color: '#fff',
    fontSize: 13,
    paddingHorizontal: 8,
  },
  sortBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonDropdown: {
    position: 'absolute',
    top: 135,
    left: 20,
    width: 140,
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 100,
    padding: 6,
  },
  seasonOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  seasonOptionActive: {
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
  },
  seasonOptionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  seasonOptionCount: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  epThumbContainer: {
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  epThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  epBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  epBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  epInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  epTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  epMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  epOverview: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    lineHeight: 15,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  providerRowIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  providerRowLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  providerRowInfo: {
    flex: 1,
  },
  providerRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  providerRowStatus: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
  },
  providerCategory: {
    marginBottom: 20,
  },
  providerCategoryTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  providerRowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(157, 78, 221, 0.15)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.3)',
  },
  qualityBadgeText: {
    color: Colors.accentPurple,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  providerRowGlow: {
    backgroundColor: 'rgba(157, 78, 221, 0.06)',
    borderColor: 'rgba(157, 78, 221, 0.15)',
  },
  epMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  episodeCardActive: {
    backgroundColor: 'rgba(157, 78, 221, 0.05)',
    borderColor: 'rgba(157, 78, 221, 0.2)',
    borderWidth: 1.5,
  },
  nowWatchingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.accentPurple,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nowWatchingText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  wcBannerContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  wcBannerGradientBorder: {
    padding: 2.2, // Border gradient outline
    borderRadius: 16,
  },
  wcBannerInner: {
    height: 100,
    borderRadius: 13.8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#022c22',
  },
  wcBannerBackdrop: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  wcBannerOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  wcBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  wcBannerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  wcBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: 6,
  },
  wcBannerBadgeText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wcBannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 4,
  },
  wcBannerSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  wcBannerRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  wcBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 4,
  },
  wcBannerBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 2,
    letterSpacing: 0.5,
  },
});

export default HomeScreen;
