// StreamDeck Mobile — Home Screen
import React, { useState, useEffect, useCallback } from 'react';
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
import { fetchTrendingContent, fetchWatchProviders, getImageUrl } from '../services/tmdb';
import { loadContinueWatching, loadSettings, toggleWatchlistItem } from '../utils/storage';
import UpdateModal from '../components/UpdateModal';
import { fetchLiveSportsData } from '../services/sports';
import { useApi } from '../context/ApiContext';
import { OTT_PROVIDER_MAP, navigateToOTT } from '../utils/OTTNavigation';

const HomeSkeleton = ({ visible }) => {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const opacity = useSharedValue(1);
  const shimmer = useSharedValue(-1);
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 600 });

    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: 'rgba(255,255,255,0.06)',
    opacity: pulse.value,
    overflow: 'hidden',
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [-1, 1], [-500, 500]) }],
  }));

  const RenderSkeletonItem = ({ style }) => (
    <Animated.View style={[style, itemAnimatedStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );

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
          <RenderSkeletonItem style={styles.skeletonSearch} />
          <RenderSkeletonItem style={styles.skeletonAvatar} />
        </View>

        {/* Category Chips Skeleton */}
        <View style={styles.skeletonCategoryRow}>
          {[1, 2, 3, 4].map(i => (
            <RenderSkeletonItem key={i} style={styles.skeletonChip} />
          ))}
        </View>

        {/* Hero Spotlight Skeleton */}
        <View style={styles.skeletonHeroContainer}>
          <RenderSkeletonItem style={styles.skeletonHero} />
          <View style={styles.skeletonHeroMeta}>
            <RenderSkeletonItem style={styles.skeletonTextLineLong} />
            <RenderSkeletonItem style={styles.skeletonTextLineShort} />
          </View>
        </View>

        {/* Rows Skeleton */}
        {[1, 2].map(row => (
          <View key={row} style={styles.skeletonRowContainer}>
            <RenderSkeletonItem style={styles.skeletonRowTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={styles.skeletonCardContainer}>
                  <RenderSkeletonItem style={styles.skeletonCard} />
                  <RenderSkeletonItem style={styles.skeletonCardText} />
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [globalTrending, setGlobalTrending] = useState([]);
  const [localTrending, setLocalTrending] = useState([]);
  const [netflixTrending, setNetflixTrending] = useState([]);
  const [primeTrending, setPrimeTrending] = useState([]);
  const [regionName, setRegionName] = useState('India');
  const [continueWatching, setContinueWatching] = useState([]);
  const [heroItems, setHeroItems] = useState([]);
  const { hasKey, requestKey, invalidateKey } = useApi();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showRedirectWarning, setShowRedirectWarning] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState(null);
  const [selectedQuickItem, setSelectedQuickItem] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [customProviders, setCustomProviders] = useState([]);
  const [movieboxDomain, setMovieboxDomain] = useState('moviebox.mov');
  const [selectedMediaType, setSelectedMediaType] = useState('all'); // 'all', 'movie', 'tv'

  useFocusEffect(
    useCallback(() => {
      if (!hasKey) {
        requestKey();
      }
    }, [hasKey])
  );

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  const loadData = useCallback(async () => {
    try {
      // Load region
      const settings = await loadSettings();
      const region = settings.contentRegion || 'IN';
      setCustomProviders(settings.liveSportsProviders || []);
      setMovieboxDomain(settings.movieboxDomain || 'moviebox.mov');

      const REGION_NAMES = {
        IN: 'India',
        US: 'the US',
        GB: 'the UK',
        AU: 'Australia',
        CA: 'Canada'
      };
      setRegionName(REGION_NAMES[region] || region);

      // Load trending content
      const { global, local, netflix, prime } = await fetchTrendingContent(region);
      setGlobalTrending(global);
      setLocalTrending(local);
      setNetflixTrending(netflix);
      setPrimeTrending(prime);

      let heroSports = [];
      try {
        const matches = await fetchLiveSportsData();
        const preferredLeagues = [
          'ipl', 'la liga', 'premier league', 'champions league', 'bundesliga', 'serie a', 'india', 'indian', 'f1', 'formula'
        ];

        const livePreferredMatches = matches.filter(m => {
          if (m.status !== 'LIVE') return false;
          const lowerTitle = m.title.toLowerCase();
          return preferredLeagues.some(league => lowerTitle.includes(league));
        });

        heroSports = livePreferredMatches.map(match => {
          const lowerTitle = match.title.toLowerCase();
          let backdrop = null;

          // Use high-quality stadium backgrounds based on sport type
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
            overview: `LIVE NOW • Watch ${match.title}`,
            isSports: true,
            match: match,
            backdrop_path: backdrop,
            media_type: 'sport'
          };
        });
      } catch (e) {
        console.error('Failed to load sports', e);
      }

      setHeroItems([...heroSports, ...global.slice(0, 8)]);

      // Load continue watching
      const cwItems = await loadContinueWatching();
      setContinueWatching(cwItems);
    } catch (error) {
      if (error.message === 'INVALID_API_KEY') {
        // Force the app back to the lock screen and clear the invalid key
        invalidateKey();
      } else {
        console.error('Failed to load home data', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasKey]);

  useEffect(() => {
    if (hasKey) {
      loadData();
    }
  }, [loadData, hasKey]);

  // Refresh all data (including domain settings) when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const getCustomProviderAppearance = (name, url) => {
    const text = (name + url).toLowerCase();
    let icon = '⚡';
    if (text.includes('cric')) icon = '🏏';
    else if (text.includes('foot') || text.includes('soccer')) icon = '⚽';
    else if (text.includes('f1') || text.includes('race')) icon = '🏎️';
    else if (text.includes('sport')) icon = '🏟️';
    else if (text.includes('tv') || text.includes('stream') || text.includes('watch')) icon = '📺';
    else if (text.includes('live')) icon = '🔴';
    else if (text.includes('play')) icon = '▶️';
    else if (text.includes('flix') || text.includes('movie')) icon = '🍿';
    const colors = ['#FF3366', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#14B8A6', '#6366F1'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return { icon, color: colors[Math.abs(hash) % colors.length] };
  };

  const PROVIDER_CONFIG = {
    'IPL Live': [{ id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: '⭐', logoUrl: 'https://image.tmdb.org/t/p/w200/7Fl8ylPDclt3ZYgNbW2t7rbZE9I.jpg' }],
    'Football': [{ id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: '⭐', logoUrl: 'https://image.tmdb.org/t/p/w200/7Fl8ylPDclt3ZYgNbW2t7rbZE9I.jpg' }],
    'F1 Live': [{ id: 'fancode', name: 'FanCode', appScheme: 'fancode://', url: 'https://fancode.com', color: '#FF6B35', icon: '⚽', logoUrl: null }],
    'WWE': [{ id: 'sonyliv', name: 'SonyLIV', appScheme: 'sonyliv://', url: 'https://www.sonyliv.com', color: '#2e2e6e', icon: '📺', logoUrl: 'https://image.tmdb.org/t/p/w200/tBhjAMfKnkzJNmOiMB8DsBx5QAp.jpg' }]
  };

  // ── + Button: Add / remove from library ───────────────
  const handleAddToLibrary = async (movie) => {
    if (movie.isSports) return; // Sports can't be added to library
    try {
      const updated = await toggleWatchlistItem(movie);
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
              logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w200${p.logo_path}` : null,
              icon: '📺',
              color: '#333',
            });
          }
        });
      }

      // Add MovieBox as a universal fallback for movies/TV
      const mbDomain = movieboxDomain.trim();
      const mbUrl = mbDomain.startsWith('http') ? mbDomain : `https://${mbDomain}`;
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
      console.error('[Home] Failed to fetch providers:', e);
      // Fallback to Explore screen
      navigation.navigate('Explore', { searchQuery: title, ts: Date.now() });
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
      movieboxDomain,
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

  const MEDIA_TYPES = [
    { id: 'all', name: 'All', icon: '🔥' },
    { id: 'live', name: 'Live', icon: '🔴' },
    { id: 'movies_series', name: 'Movies / Series', icon: '🎬' },
  ];

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
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}>
          {MEDIA_TYPES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedMediaType === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedMediaType(cat.id)}
              activeOpacity={0.7}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  selectedMediaType === cat.id && styles.categoryTextActive,
                ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hero Spotlight */}
        <HeroSpotlight
          movies={filterContent(heroItems, selectedMediaType)}
          onPlay={handlePlayPress}
          onAddToList={handleAddToLibrary}
          paused={showPicker}
        />

        {/* Continue Watching */}
        <ContinueWatchingRow
          items={continueWatching}
          onItemPress={handleContinueWatchingPress}
        />

        {/* What's Trending Globally */}
        <TrendingRow
          title="What's Trending Globally"
          movies={globalTrending.slice(0, 15)}
          onMoviePress={handlePlayPress}
        />

        {/* What's Trending in India / US / etc */}
        <TrendingRow
          title={`What's Trending in ${regionName}`}
          movies={localTrending.slice(0, 15)}
          onMoviePress={handlePlayPress}
        />

        {/* Trending on Netflix */}
        <TrendingRow
          title="Trending on Netflix"
          movies={netflixTrending.slice(0, 15)}
          onMoviePress={handlePlayPress}
        />

        {/* Trending on Prime Video */}
        <TrendingRow
          title="Trending on Prime Video"
          movies={primeTrending.slice(0, 15)}
          onMoviePress={handlePlayPress}
        />

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>

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
              {availableProviders.map(provider => (
                <TouchableOpacity
                  key={provider.id}
                  style={styles.providerItem}
                  onPress={() => handleSelectProvider(provider)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.providerIconBox, { backgroundColor: provider.logoUrl ? '#1a1a2e' : provider.color }]}>
                    {provider.logoUrl ? (
                      <Image
                        source={{ uri: provider.logoUrl }}
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
                <Text style={styles.warningIcon}>🗺️</Text>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  skeletonSearch: {
    flex: 1,
    height: 44,
    borderRadius: 12,
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  skeletonCategoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 25,
    gap: 10,
  },
  skeletonChip: {
    width: 90,
    height: 36,
    borderRadius: 18,
  },
  skeletonHeroContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  skeletonHero: {
    width: '90%',
    height: 480,
    borderRadius: 30,
    marginBottom: 20,
  },
  skeletonHeroMeta: {
    width: '90%',
    gap: 8,
  },
  skeletonTextLineLong: {
    width: '70%',
    height: 18,
    borderRadius: 9,
  },
  skeletonTextLineShort: {
    width: '40%',
    height: 18,
    borderRadius: 9,
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
  skeletonCardContainer: {
    marginRight: 18,
    gap: 10,
  },
  skeletonCard: {
    width: 150,
    height: 220,
    borderRadius: 16,
  },
  skeletonCardText: {
    width: 100,
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
    marginBottom: Spacing.lg,
    marginTop: -Spacing.md,
  },
  categoryContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(157, 78, 221, 0.2)',
    borderColor: 'rgba(157, 78, 221, 0.5)',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#D4A5FF',
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
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginBottom: 20,
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
});

export default HomeScreen;
