// StreamDeck Mobile — Home Screen
import React, {useState, useEffect, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing} from '../theme/colors';
import HeroSpotlight from '../components/HeroSpotlight';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import TrendingRow from '../components/TrendingRow';
import {fetchTrendingContent, fetchWatchProviders, getImageUrl} from '../services/tmdb';
import {loadContinueWatching, loadSettings, toggleWatchlistItem} from '../utils/storage';
import UpdateModal from '../components/UpdateModal';
import {fetchLiveSportsData} from '../services/sports';
import {useApi} from '../context/ApiContext';

const HomeScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [globalTrending, setGlobalTrending] = useState([]);
  const [localTrending, setLocalTrending] = useState([]);
  const [netflixTrending, setNetflixTrending] = useState([]);
  const [primeTrending, setPrimeTrending] = useState([]);
  const [regionName, setRegionName] = useState('India');
  const [continueWatching, setContinueWatching] = useState([]);
  const [heroItems, setHeroItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedQuickItem, setSelectedQuickItem] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [customProviders, setCustomProviders] = useState([]);
  const [movieboxDomain, setMovieboxDomain] = useState('moviebox.mov');

  const { hasKey, requestKey } = useApi();

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
      const {global, local, netflix, prime} = await fetchTrendingContent(region);
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
          if (lowerTitle.includes('ipl') || lowerTitle.includes('india') || match.type === 'cricket') {
            backdrop = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop';
          } else if (match.type === 'football' || lowerTitle.includes('league') || lowerTitle.includes('liga') || lowerTitle.includes('serie')) {
            backdrop = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=600&auto=format&fit=crop';
          } else if (match.type === 'f1' || lowerTitle.includes('f1') || lowerTitle.includes('formula')) {
            backdrop = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/FIA_F1_Austria_2025_Nr._1_Verstappen.jpg/1280px-FIA_F1_Austria_2025_Nr._1_Verstappen.jpg';
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
    } catch (e) {
      console.error('[Home] Failed to load data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hasKey) {
      loadData();
    }
  }, [loadData, hasKey]);

  // Removed early return from here

  // Refresh continue watching when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const cwItems = await loadContinueWatching();
      setContinueWatching(cwItems);
    });
    return unsubscribe;
  }, [navigation]);

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

    // Same provider map as ExploreScreen — deep links + search URLs
    const MOVIE_PROVIDER_MAP = {
      8:   { id: 'netflix',   name: 'Netflix',      searchUrl: 'https://www.netflix.com/search?q=',         appScheme: 'nflx://www.netflix.com/search?q=' },
      119: { id: 'prime',     name: 'Prime Video',   searchUrl: 'https://www.primevideo.com/search?phrase=',  appScheme: 'primevideo://search?phrase=' },
      9:   { id: 'prime',     name: 'Prime Video',   searchUrl: 'https://www.primevideo.com/search?phrase=',  appScheme: 'primevideo://search?phrase=' }, // "with Ads" variant
      122: { id: 'hotstar',   name: 'JioHotstar',    searchUrl: 'https://www.hotstar.com/in/explore?search_query=', appScheme: 'hotstar://search?q=' },
      232: { id: 'jio',       name: 'JioCinema',     searchUrl: 'https://www.jiocinema.com/search/',          appScheme: 'jiocinema://search/' },
      3:   { id: 'google',    name: 'Google TV',     searchUrl: 'https://play.google.com/store/search?q=',    appScheme: null },
      2:   { id: 'apple',     name: 'Apple TV',      searchUrl: 'https://tv.apple.com/in/search?term=',       appScheme: 'videos://search?term=' },
      220: { id: 'zee5',      name: 'Zee5',          searchUrl: 'https://www.zee5.com/search?q=',             appScheme: 'zee5://search?q=' },
      237: { id: 'sonyliv',   name: 'SonyLIV',       searchUrl: 'https://www.sonyliv.com/search?q=',          appScheme: 'sonyliv://search?q=' },
      121: { id: 'mxplayer',  name: 'MX Player',     searchUrl: 'https://www.mxplayer.in/search?q=',          appScheme: 'mxplayer://search?q=' },
    };

    try {
      const providers = await fetchWatchProviders(movie.id, mediaType);
      const streamingProviders = [];
      const seenIds = new Set(); // Deduplicate (Prime Video vs Prime Video with Ads)

      // Flatrate (subscription streaming) providers
      if (providers?.flatrate) {
        providers.flatrate.forEach(p => {
          const mapped = MOVIE_PROVIDER_MAP[p.provider_id];
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
      navigation.navigate('Explore', {searchQuery: title, ts: Date.now()});
    }
  };

  const handleSelectProvider = async (provider) => {
    setShowPicker(false);
    const title = selectedQuickItem?.name || '';
    const query = encodeURIComponent(title);
    const mediaType = selectedQuickItem?.mediaType;
    const tmdbId = selectedQuickItem?.tmdbId;

    // 1. Try native app deep link
    if (provider.appScheme) {
      try {
        const schemeUrl = `${provider.appScheme}${query}`;
        if (await Linking.canOpenURL(schemeUrl)) {
          await Linking.openURL(schemeUrl);
          return;
        }
      } catch (e) {}
    }

    // 2. Build URL — use searchUrl if available, else provider.url
    let finalUrl;
    if (provider.searchUrl) {
      finalUrl = `${provider.searchUrl}${query}`;
      // Special logic for Cineby (direct TMDB ID links)
      if (provider.id === 'moviebox' && movieboxDomain.toLowerCase().includes('cineby.sc') && tmdbId && mediaType) {
        const domain = movieboxDomain.replace('http://', '').replace('https://', '');
        finalUrl = `https://${domain}/${mediaType}/${tmdbId}`;
      }
    } else if (provider.url) {
      finalUrl = provider.url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
    } else {
      return; // No URL to navigate to
    }

    navigation.navigate('WebView', {
      url: finalUrl, title: `${title} on ${provider.name}`, appId: provider.id, color: provider.color,
    });
  };

  const handleContinueWatchingPress = item => {
    navigation.navigate('WebView', {
      url: item.url,
      title: item.title,
      appId: item.appId,
    });
  };

  if (!hasKey) {
    return (
      <View style={[styles.screen, {paddingTop: topPadding, justifyContent: 'center', alignItems: 'center'}]}>
        <Text style={{color: Colors.textMuted, fontSize: 16, textAlign: 'center', padding: 20}}>
          Please add your TMDB API Key to access movies and TV shows.
        </Text>
        <TouchableOpacity 
          style={{marginTop: 20, padding: 12, backgroundColor: Colors.accentPurple, borderRadius: 8}}
          onPress={requestKey}
        >
          <Text style={{color: '#fff', fontWeight: 'bold'}}>Add API Key</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
        <ActivityIndicator size="large" color={Colors.accentPurple} />
        <Text style={styles.loadingText}>Loading StreamDeck...</Text>
      </View>
    );
  }

  // Hero items now come from state (sports + trending)

  return (
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <UpdateModal />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{paddingTop: topPadding + 20}}
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
        {/* Hero Spotlight */}
        <HeroSpotlight
          movies={heroItems}
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
    gap: Spacing.lg,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 100,
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
    shadowOffset: {width: 0, height: -8},
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
});

export default HomeScreen;
