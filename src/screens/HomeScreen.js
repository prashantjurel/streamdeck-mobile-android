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
  Extrapolation
} from 'react-native-reanimated';
import { Colors, Spacing } from '../theme/colors';
import HeroSpotlight from '../components/HeroSpotlight';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import TrendingRow from '../components/TrendingRow';
import { fetchTrendingContent, fetchWatchProviders, getImageUrl, OTT_PROVIDERS, fetchProviderContent, fetchRegionalProviders } from '../services/tmdb';
import { loadContinueWatching, loadSettings, toggleWatchlistItem, loadWatchlist } from '../utils/storage';
import UpdateModal from '../components/UpdateModal';
import { fetchLiveSportsData } from '../services/sports';
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
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isFetchingProviders, setIsFetchingProviders] = useState(false);
  const [showRedirectWarning, setShowRedirectWarning] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState(null);
  const [selectedQuickItem, setSelectedQuickItem] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [customProviders, setCustomProviders] = useState([]);
  const [movieboxSources, setMovieboxSources] = useState([]);
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

      const REGION_NAMES = { IN: 'India', US: 'the US', GB: 'the UK', AU: 'Australia', CA: 'Canada' };
      setRegionName(REGION_NAMES[region] || region);

      // --- Task 0: Regional Providers (Required for UI filtering) ---
      const tmdbProviders = await fetchRegionalProviders(region);
      setRegionalProviders(tmdbProviders);

      // Validate active provider for the new region
      const currentValid = tmdbProviders.find(tp => tp.provider_id === activeProvider.id);
      if (!currentValid && tmdbProviders.length > 0) {
        // Fallback to the first available provider in the region
        setActiveProvider({ 
          id: tmdbProviders[0].provider_id, 
          name: tmdbProviders[0].provider_name,
          logoUrl: tmdbProviders[0].logo_path ? `https://image.tmdb.org/t/p/w200${tmdbProviders[0].logo_path}` : null
        });
      }

      // --- Task 1: Watchlist (Silent) ---
      const watchlistTask = loadWatchlist().then(wl => setWatchlist(wl || []));

      // --- Task 2: Trending Content (CRITICAL) ---
      const trendingTask = fetchTrendingContent(region, forceRefresh).then(({ global, local }) => {
        setGlobalTrending(global);
        setLocalTrending(local);
        return global;
      });

      // --- Task 3: Active Provider Content (CRITICAL) ---
      const providerTask = (async () => {
        setLoadingProvider(true);
        try {
          if (!providerTrendingCache[activeProvider.id] || forceRefresh) {
            const pData = await fetchProviderContent(region, activeProvider.id);
            setProviderTrendingCache(prev => ({ ...prev, [activeProvider.id]: pData }));
          }
        } finally {
          setLoadingProvider(false);
        }
      })();

      // --- Task 4: Live Sports ---
      const sportsTask = (async () => {
        try {
          const matches = await fetchLiveSportsData();
          const preferredLeagues = ['ipl', 'la liga', 'premier league', 'champions league', 'bundesliga', 'serie a', 'india', 'indian', 'f1', 'formula'];
          const livePreferredMatches = matches.filter(m => {
            if (m.status !== 'LIVE' && m.status !== 'soon') return false;
            const lowerTitle = m.title.toLowerCase();
            return preferredLeagues.some(league => lowerTitle.includes(league));
          });

          const heroSports = livePreferredMatches.map(match => {
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

          return heroSports;
        } catch (e) {
          console.error('[Home] Sports load failed:', e);
          return [];
        }
      })();

      // --- Task 5: Continue Watching (Silent) ---
      const cwTask = loadContinueWatching().then(cwItems => setContinueWatching(cwItems));

      // WAIT FOR ALL CRITICAL DATA before hiding global skeleton
      const [heroSports, globalResults] = await Promise.all([
        sportsTask,
        trendingTask,
        providerTask // Just wait for it to finish, result is in cache
      ]);

      setHeroItems([...heroSports, ...globalResults.slice(0, 8)]);
      setLoading(false);

      // If it's a pull-to-refresh, wait for all tasks to finish completely
      if (forceRefresh) {
        await Promise.allSettled([watchlistTask, trendingTask, providerTask, sportsTask, cwTask]);
      }
    } catch (error) {
      if (error.message === 'INVALID_API_KEY') {
        invalidateKey();
      } else {
        console.error('Failed to load home data', error);
      }
    } finally {
      setRefreshing(false);
    }
  }, [invalidateKey, providerTrendingCache, activeProvider.id, regionCode]);

  useFocusEffect(
    useCallback(() => {
      if (!hasKey) {
        requestKey();
      }
    }, [hasKey, requestKey])
  );

  useEffect(() => {
    if (hasKey) {
      loadData();
    }
  }, [loadData, hasKey]);

  // --- Background Cloud Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        console.log('[Home] User identified — triggering background sync...');
        await syncWithCloud(user.uid);
        // Silently reload local state after sync to reflect cloud changes
        const wl = await loadWatchlist();
        setWatchlist(wl);
        const st = await loadSettings();
        // Update local component state if needed (e.g. region changed in cloud)
        if (st.contentRegion !== regionCode) {
          loadData(false, true); // Force fresh load if region sync changed
        }
      }
    });
    return unsubscribe;
  }, [regionCode, loadData]);

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



  const PROVIDER_CONFIG = {
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
  const handlePlayPress = async (movie) => {
    if (movie.isSports) {
      // Sports: show sports provider picker
      const qName = movie.match.quickAccessName || (movie.match.type === 'football' ? 'Football' : 'IPL Live');
      setSelectedQuickItem({ name: movie.match.title || qName });

      const nativeProviders = PROVIDER_CONFIG[qName] || [];
      const formattedCustomProviders = customProviders.map((p, idx) => {
        const appearance = getCustomProviderAppearance(p.name, p.url);
        return {
          id: `custom_${idx}`, name: p.name, url: p.url, color: appearance.color, icon: appearance.icon,
        };
      });

      setAvailableProviders([...nativeProviders, ...formattedCustomProviders]);
      setShowPicker(true);
      return;
    }

    // Movies / TV: fetch TMDB watch providers and show picker
    const title = movie.title || movie.name || 'Movie';
    const mediaType = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
    const tmdbId = movie.id;
    setSelectedQuickItem({ name: title, mediaType, tmdbId });
    setAvailableProviders([]); // Clear previous
    setIsFetchingProviders(true);
    setShowPicker(true); // OPEN MODAL IMMEDIATELY for instant feedback

    try {
      const providers = await fetchWatchProviders(movie.id, mediaType);
      const streamingProviders = [];
      const seenIds = new Set(); // Deduplicate (Prime Video vs Prime Video with Ads)

      // Flatrate (subscription streaming) providers
      if (providers?.flatrate) {
        providers.flatrate.forEach(p => {
          const mapped = OTT_PROVIDER_MAP[p.provider_id];
          if (mapped && !seenIds.has(mapped.id)) {
            seenIds.add(mapped.id);
            streamingProviders.push({
              ...mapped,
              logoUrl: p.logo_path 
                ? `https://image.tmdb.org/t/p/w200${p.logo_path}` 
                : mapped.logoUrl || null,
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
          const appearance = getCustomProviderAppearance(s.name || mbSearchDomain, mbDomain);
          streamingProviders.push({
            id: `moviebox_${idx}`,
            name: s.name || mbSearchDomain, // Show specific domain
            icon: appearance.icon,
            color: appearance.color,
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
        icon: 'youtube',
        color: '#FF0000',
        logoUrl: null, // Force use of native icon for brand consistency and reliability
        searchUrl: 'https://www.youtube.com/results?search_query=',
        appScheme: 'youtube://',
      });

      if (streamingProviders.length === 0) {
        // Show discovery link if no providers enabled
        streamingProviders.push({
          id: 'discovery',
          name: 'Explore All',
          icon: 'search',
          color: Colors.accentPurple,
          url: 'https://fmhy.net/video#streaming-sites',
        });
      }

      setAvailableProviders(streamingProviders);
    } catch (e) {
      console.error('[Home] Failed to fetch providers:', e);
    } finally {
      setIsFetchingProviders(false);
    }
  };

  const handleSelectProvider = async (provider) => {
    setShowPicker(false);
    const title = selectedQuickItem?.name || '';
    const mediaType = selectedQuickItem?.mediaType;
    const tmdbId = selectedQuickItem?.tmdbId;

    const result = await navigateToOTT(
      provider,
      title,
      tmdbId,
      mediaType,
      provider.customDomain, // Use specific domain from provider object
      navigation
    );

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
    navigation.navigate('WebView', {
      url: item.url,
      title: item.title,
      appId: item.appId,
    });
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

  // Hero items now come from state (sports + trending)

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom || 80 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
        />

        {/* What's Trending Globally */}
        <TrendingRow
          title="What's Trending Globally"
          movies={globalTrending}
          onMoviePress={handlePlayPress}
        />

        {/* What's Trending in India / US / etc */}
        <TrendingRow
          title={`What's Trending in ${regionName}`}
          movies={localTrending}
          onMoviePress={handlePlayPress}
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
            style={{ marginBottom: 0 }}
          />
        </View>

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Provider Dropdown Modal */}
      <Modal
        visible={showProviderDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProviderDropdown(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissZone} onPress={() => setShowProviderDropdown(false)} activeOpacity={1} />
          <View style={[styles.modalContent, { paddingBottom: 20 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Select Provider</Text>
            </View>

            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={18} color="rgba(255,255,255,0.3)" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search platforms..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={providerSearch}
                onChangeText={setProviderSearch}
                autoCorrect={false}
              />
              {providerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProviderSearch('')} style={{ padding: 8 }}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ marginTop: 10, maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {regionalProviders
                .filter(p => p.provider_name.toLowerCase().includes(providerSearch.toLowerCase()))
                .map(p => {
                const isActive = activeProvider.id === p.provider_id;
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
          </View>
        </View>
      </Modal>

      {/* Smart Provider Selection Modal — fade animation */}
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
              <Text style={styles.modalSubtitle}>Select where to stream {selectedQuickItem?.name}</Text>
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
                    <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
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

      {/* Themed Redirect Warning Modal */}
      <Modal
        visible={showRedirectWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRedirectWarning(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismissZone} onPress={() => setShowRedirectWarning(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <View style={styles.warningIconBox}>
                <Ionicons name="map" size={32} color={Colors.accentPurple} />
              </View>
              <Text style={styles.modalTitle}>Source Not Verified</Text>
              <Text style={styles.modalSubtitle}>We don't have a direct path for this source yet.</Text>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                We'll take you to the homepage of <Text style={styles.highlightText}>{redirectInfo?.domain}</Text>.
              </Text>
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Tap 'Continue' to open the site.</Text>
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
                  <Text style={styles.confirmBtnText}>Continue to Site</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <HomeSkeleton visible={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
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
  categoryScroll: {
    marginBottom: Spacing.xl,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissZone: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#16161E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    // Subtle upward shadow for depth
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
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
  closeModalBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
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
});

export default HomeScreen;
