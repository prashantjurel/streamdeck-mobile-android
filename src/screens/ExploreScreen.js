// StreamDeck Mobile — Explore Screen
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { 
  searchTMDB, 
  fetchNowPlaying, 
  fetchNowPlayingTV,
  fetchTopRated, 
  fetchTopRatedTV,
  getImageUrl, 
  fetchWatchProviders 
} from '../services/tmdb';
import { loadSettings } from '../utils/storage';
import SectionHeader from '../components/SectionHeader';
import PosterCard from '../components/PosterCard';
import TrendingRow from '../components/TrendingRow';
import LinearGradient from 'react-native-linear-gradient';
import { useApi } from '../context/ApiContext';
import { OTT_PROVIDER_MAP, navigateToOTT } from '../utils/OTTNavigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';



const ExploreScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topRatedFilter, setTopRatedFilter] = useState('movie');

  // Selection Modal State
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [movieboxDomain, setMovieboxDomain] = useState('moviebox.mov');

  const topPadding = insets.top || StatusBar.currentHeight || 0;

  const { hasKey, requestKey, invalidateKey } = useApi();

  useFocusEffect(
    useCallback(() => {
      if (!hasKey) {
        requestKey();
      }
    }, [hasKey])
  );

  useEffect(() => {
    if (hasKey) {
      loadExploreContent();
      loadDomainSettings();
    }
  }, [hasKey]);

  const loadDomainSettings = async () => {
    const settings = await loadSettings();
    if (settings.movieboxDomain) {
      setMovieboxDomain(settings.movieboxDomain);
    }
  };

  useEffect(() => {
    if (route.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
      handleSearch(route.params.searchQuery);
    }
  }, [route.params?.searchQuery, route.params?.ts]);

  const loadExploreContent = async () => {
    try {
      const [npMovies, npTv, trMovies, trTv] = await Promise.all([
        fetchNowPlaying(),
        fetchNowPlayingTV(),
        fetchTopRated(),
        fetchTopRatedTV(),
      ]);

      setNowPlaying([...npMovies, ...npTv]);
      setTopRated([...trMovies, ...trTv]);
    } catch (e) {
      if (e.message === 'INVALID_API_KEY') invalidateKey();
      console.error('[Explore] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async query => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchTMDB(query);
      setSearchResults(results);
    } catch (e) {
      if (e.message === 'INVALID_API_KEY') invalidateKey();
      console.error('[Explore] Search failed:', e);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleMoviePress = async movie => {
    console.log('[Explore] handleMoviePress called!', movie?.title || movie?.name);
    setSelectedMovie(movie);
    setCheckingAvailability(true);
    setShowPicker(true);
    console.log('[Explore] showPicker set to true');
    setAvailableProviders([]);

    try {
      const mediaType = movie.media_type || (movie.title ? 'movie' : 'tv');
      const watchInfo = await fetchWatchProviders(movie.id, mediaType);

      const found = [];
      if (watchInfo) {
        const allProviders = [
          ...(watchInfo.flatrate || []),
          ...(watchInfo.buy || []),
          ...(watchInfo.rent || [])
        ];
        const uniqueIds = [...new Set(allProviders.map(p => p.provider_id))];
        uniqueIds.forEach(id => {
          if (OTT_PROVIDER_MAP[id]) {
            const tmdbProvider = allProviders.find(p => p.provider_id === id);
            found.push({
              ...OTT_PROVIDER_MAP[id],
              logoUrl: tmdbProvider?.logo_path 
                ? `https://image.tmdb.org/t/p/w200${tmdbProvider.logo_path}` 
                : OTT_PROVIDER_MAP[id].logoUrl || null,
            });
          }
        });
      }

      // Always Add Enabled MovieBox Sources as Primary Hubs
      const settings = await loadSettings();
      const movieboxSources = settings.movieboxSources || [];

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

          found.push({
            id: `moviebox_${idx}`,
            name: s.name || mbSearchDomain, // Show specific domain name
            color: color,
            icon: icon,
            logoUrl: null,
            searchUrl: `https://${mbSearchDomain}/search?q=`,
            customDomain: mbDomain
          });
        });

      // Always Add YouTube as Primary Hub
      const ytMap = OTT_PROVIDER_MAP['youtube'] || {};
      found.push({
        id: 'youtube',
        name: 'YouTube',
        color: '#FF0000',
        icon: 'youtube',
        logoUrl: ytMap.logoUrl || null,
        searchUrl: 'https://www.youtube.com/results?search_query='
      });

      setAvailableProviders(found);
    } catch (e) {
      console.error('[Explore] Availability check failed:', e);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSelectProvider = async provider => {
    const title = selectedMovie.title || selectedMovie.name;
    const mediaType = selectedMovie.media_type || (selectedMovie.title ? 'movie' : 'tv');
    const tmdbId = selectedMovie.id;

    setShowPicker(false);

    await navigateToOTT(
      provider,
      title,
      tmdbId,
      mediaType,
      movieboxDomain,
      navigation
    );
  };

  const renderSearchResult = ({ item }) => {
    const title = item.title || item.name || 'Unknown';
    const year = item.release_date ? item.release_date.split('-')[0] : item.first_air_date ? item.first_air_date.split('-')[0] : '';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
    const posterUrl = getImageUrl(item.poster_path, 'w200');
    const mediaType = item.media_type === 'tv' ? 'TV Show' : 'Movie';

    return (
      <TouchableOpacity
        style={styles.searchResultCard}
        onPress={() => handleMoviePress(item)}
        activeOpacity={0.7}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.resultPoster} />
        ) : (
          <View style={[styles.resultPoster, styles.resultPosterPlaceholder]}>
            <Text style={{ fontSize: 24 }}>🎬</Text>
          </View>
        )}
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.resultMeta}>
            {year ? <Text style={styles.resultYear}>{year}</Text> : null}
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{mediaType}</Text>
            </View>
          </View>
          {rating && (
            <View style={styles.resultRating}>
              <Text style={styles.resultStar}>★</Text>
              <Text style={styles.resultRatingText}>{rating}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!hasKey) {
    return (
      <View style={[styles.screen, { paddingTop: topPadding, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔑</Text>
        <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
          One-Time Setup Required
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
          StreamDeck needs a free TMDB API key to search and explore movies. This is a one-time setup, once saved, you won't be asked again.
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

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Search Bar & Back Button */}
      <View style={[styles.searchContainer, { paddingTop: topPadding + Spacing.md }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies, shows, series..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content Area */}
      {searchQuery.length > 0 ? (
        <View style={styles.resultsContainer}>
          {searching ? (
            <ActivityIndicator size="large" color={Colors.accentPurple} style={styles.searchSpinner} />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item, idx) => `${item.id}-${idx}`}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Spacing.md }} keyboardShouldPersistTaps="handled">
          {nowPlaying.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Recent Hits" subtitle="Fresh in theaters & air" />
              <FlatList
                data={nowPlaying.filter(m => m.media_type === 'movie' || (!m.media_type && m.title)).slice(0, 15)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.horizontalList}
                keyExtractor={(item, idx) => `np-${item.id}-${idx}`}
                renderItem={({ item }) => <PosterCard movie={item} onPress={handleMoviePress} />}
              />
            </View>
          )}
          {topRated.length > 0 && (
            <View style={styles.section}>
              <SectionHeader 
                title="Top Rated" 
                subtitle="All-time favorites" 
                rightAction={
                  <TouchableOpacity 
                    onPress={() => setTopRatedFilter(f => f === 'movie' ? 'tv' : 'movie')} 
                    activeOpacity={0.7}
                    style={styles.exploreToggle}
                  >
                    <Text style={styles.exploreToggleText}>
                      {topRatedFilter === 'movie' ? 'Movies' : 'Series'}
                    </Text>
                    <Ionicons 
                      name="chevron-down" 
                      size={8} 
                      color="rgba(255,255,255,0.4)" 
                      style={{ marginLeft: 3, marginTop: 1 }} 
                    />
                  </TouchableOpacity>
                }
              />
              <FlatList
                data={topRated.filter(m => {
                  if (topRatedFilter === 'movie') return m.media_type === 'movie' || (!m.media_type && m.title);
                  return m.media_type === 'tv' || (!m.media_type && m.name);
                }).slice(0, 15)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.horizontalList}
                keyExtractor={(item, idx) => `tr-${topRatedFilter}-${item.id}-${idx}`}
                renderItem={({ item }) => <PosterCard movie={item} onPress={handleMoviePress} />}
              />
            </View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

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
              {checkingAvailability ? (
                <ActivityIndicator size="small" color={Colors.accentPurple} style={{ marginTop: 10 }} />
              ) : (
                <Text style={styles.modalSubtitle}>Streaming now in India</Text>
              )}
            </View>

            <View style={styles.providerGrid}>
              {checkingAvailability ? (
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
                    <View style={[styles.providerIconBox, { backgroundColor: provider.logoUrl ? '#1a1a2e' : provider.color }]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgPrimary },
  searchContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl, 
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.lg,
    height: 52,
    gap: Spacing.md,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.md },
  clearIcon: { color: Colors.textMuted, fontSize: 16, padding: 4 },
  resultsContainer: { flex: 1 },
  searchSpinner: { marginTop: 60 },
  resultsList: { paddingHorizontal: Spacing.xl, paddingBottom: 150 },
  searchResultCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    elevation: 4,
  },
  resultPoster: { width: 90, height: 135 },
  resultPosterPlaceholder: { backgroundColor: Colors.bgSecondary, justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1, padding: Spacing.md, justifyContent: 'center' },
  resultTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  resultYear: { fontSize: 14, color: Colors.textSecondary },
  typeBadge: { backgroundColor: Colors.accentPurple + '30', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { fontSize: 10, color: Colors.accentPurple, fontWeight: '800', textTransform: 'uppercase' },
  resultRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultStar: { fontSize: 12, color: '#fbbf24' },
  resultRatingText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.lg, opacity: 0.3 },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.md },
  section: { marginBottom: Spacing.xxl },
  horizontalList: { paddingHorizontal: Spacing.xl },
  exploreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 2,
  },
  exploreToggleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  noProvidersBox: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginTop: -4,
  },
  noProvidersText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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

export default ExploreScreen;
