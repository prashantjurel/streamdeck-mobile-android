// StreamDeck Mobile — Explore Screen
import React, { useState, useEffect, useCallback } from 'react';
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
import { searchTMDB, fetchNowPlaying, fetchTopRated, getImageUrl, fetchWatchProviders } from '../services/tmdb';
import { loadSettings } from '../utils/storage';
import SectionHeader from '../components/SectionHeader';
import PosterCard from '../components/PosterCard';
import LinearGradient from 'react-native-linear-gradient';
import { useApi } from '../context/ApiContext';
import { OTT_PROVIDER_MAP, navigateToOTT } from '../utils/OTTNavigation';



const ExploreScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const [np, tr] = await Promise.all([fetchNowPlaying(), fetchTopRated()]);
      setNowPlaying(np);
      setTopRated(tr);
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
    setSelectedMovie(movie);
    setCheckingAvailability(true);
    setShowPicker(true);
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
              logoUrl: tmdbProvider?.logo_path ? `https://image.tmdb.org/t/p/w200${tmdbProvider.logo_path}` : null,
              icon: '📺',
              color: '#333'
            });
          }
        });
      }

      // Always add MovieBox and YouTube as fallbacks/preferred hubs
      if (!found.find(p => p.id === 'moviebox')) {
        const domain = movieboxDomain.replace('http://', '').replace('https://', '');
        found.push({
          id: 'moviebox',
          name: 'MovieBox',
          color: '#E21D48',
          icon: '🍿',
          logoUrl: null,
          searchUrl: `https://${domain}/search?q=`
        });
      }
      if (!found.find(p => p.id === 'youtube')) {
        found.push({ id: 'youtube', name: 'YouTube', color: '#FF0000', icon: 'Y', logoUrl: 'https://image.tmdb.org/t/p/w200/oIkQkEkwfmcG7IGpRR1NB8frZZM.jpg', searchUrl: 'https://www.youtube.com/results?search_query=' });
      }

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

      {/* Search Bar */}
      <View style={[styles.searchContainer, { paddingTop: topPadding + Spacing.md }]}>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Spacing.md }}>
          {nowPlaying.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Now Playing" subtitle="In theaters" />
              <FlatList
                data={nowPlaying.slice(0, 15)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item }) => <PosterCard movie={item} onPress={handleMoviePress} />}
              />
            </View>
          )}
          {topRated.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Top Rated" subtitle="All-time favorites" />
              <FlatList
                data={topRated.slice(0, 15)}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
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
              {!checkingAvailability && availableProviders.map(provider => (
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
              {!checkingAvailability && availableProviders.length === 1 && availableProviders[0].id === 'youtube' && (
                <View style={styles.noProvidersBox}>
                  <Text style={styles.noProvidersText}>Not currently on subscription platforms. Showing YouTube and MovieBox as fallbacks.</Text>
                </View>
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
  searchContainer: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  searchBar: {
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
