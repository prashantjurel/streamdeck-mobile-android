// StreamDeck Mobile — Home Screen
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Text,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing} from '../theme/colors';
import HeroSpotlight from '../components/HeroSpotlight';
import ContinueWatchingRow from '../components/ContinueWatchingRow';
import TrendingRow from '../components/TrendingRow';
import {fetchTrendingContent} from '../services/tmdb';
import {loadContinueWatching, loadSettings} from '../utils/storage';

const HomeScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [globalTrending, setGlobalTrending] = useState([]);
  const [localTrending, setLocalTrending] = useState([]);
  const [netflixTrending, setNetflixTrending] = useState([]);
  const [primeTrending, setPrimeTrending] = useState([]);
  const [regionName, setRegionName] = useState('India');
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  const loadData = useCallback(async () => {
    try {
      // Load region
      const settings = await loadSettings();
      const region = settings.contentRegion || 'IN';
      
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
    loadData();
  }, [loadData]);

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

  const handleMoviePress = movie => {
    // Navigate to search/play flow
    const title = movie.title || movie.name;
    navigation.navigate('Explore', {searchQuery: title, ts: Date.now()});
  };

  const handleContinueWatchingPress = item => {
    navigation.navigate('WebView', {
      url: item.url,
      title: item.title,
      appId: item.appId,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
        <ActivityIndicator size="large" color={Colors.accentPurple} />
        <Text style={styles.loadingText}>Loading StreamDeck...</Text>
      </View>
    );
  }

  // Hero movies: top 8 global trending
  const heroMovies = globalTrending.slice(0, 8);

  return (
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
          movies={heroMovies}
          onPlay={handleMoviePress}
          onAddToList={handleMoviePress}
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
          onMoviePress={handleMoviePress}
        />

        {/* What's Trending in India / US / etc */}
        <TrendingRow
          title={`What's Trending in ${regionName}`}
          movies={localTrending.slice(0, 15)}
          onMoviePress={handleMoviePress}
        />

        {/* Trending on Netflix */}
        <TrendingRow
          title="Trending on Netflix"
          movies={netflixTrending.slice(0, 15)}
          onMoviePress={handleMoviePress}
        />

        {/* Trending on Prime Video */}
        <TrendingRow
          title="Trending on Prime Video"
          movies={primeTrending.slice(0, 15)}
          onMoviePress={handleMoviePress}
        />

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
});

export default HomeScreen;
