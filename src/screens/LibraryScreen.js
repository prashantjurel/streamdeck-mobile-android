// StreamDeck Mobile — My Library Screen
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {loadWatchlist, toggleWatchlistItem, loadSettings} from '../utils/storage';
import {getImageUrl, fetchWatchProviders} from '../services/tmdb';
import {OTT_PROVIDER_MAP, navigateToOTT} from '../utils/OTTNavigation';
import SectionHeader from '../components/SectionHeader';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md * 2) / 3;
const GRID_CARD_HEIGHT = GRID_CARD_WIDTH * 1.5;

const LibraryScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [watchlist, setWatchlist] = useState([]);
  const [adventures, setAdventures] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieboxSources, setMovieboxSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [wlItems, advItemsRaw, settings] = await Promise.all([
        loadWatchlist(),
        AsyncStorage.getItem('streamdeck_mobile_adventure_saved'),
        loadSettings()
      ]);
      setWatchlist(wlItems || []);
      setAdventures(advItemsRaw ? JSON.parse(advItemsRaw) : []);
      setMovieboxSources(settings?.movieboxSources || []);
    } catch (e) {
      console.error('[Library] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleRemoveAdventure = async adv => {
    const updated = adventures.filter(a => a.id !== adv.id);
    setAdventures(updated);
    await AsyncStorage.setItem('streamdeck_mobile_adventure_saved', JSON.stringify(updated));
  };

  const handleRemove = async movie => {
    const updated = await toggleWatchlistItem(movie);
    setWatchlist(updated);
  };

  const handlePress = async movie => {
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

      // Add Enabled MovieBox Sources
      (movieboxSources || [])
        .filter(s => s.enabled)
        .forEach((s, idx) => {
          const mbDomain = s.url.trim();
          found.push({
            id: `moviebox_${idx}`,
            name: s.name || 'MovieBox',
            icon: '🍿',
            color: '#E21D48',
            logoUrl: null,
            searchUrl: `https://${mbDomain.replace(/^https?:\/\//i, '')}/search?q=`,
            customDomain: mbDomain,
          });
        });
      if (!found.find(p => p.id === 'youtube')) {
        found.push({ id: 'youtube', name: 'YouTube', color: '#FF0000', icon: 'Y', logoUrl: 'https://image.tmdb.org/t/p/w200/oIkQkEkwfmcG7IGpRR1NB8frZZM.jpg', searchUrl: 'https://www.youtube.com/results?search_query=' });
      }

      setAvailableProviders(found);
    } catch (e) {
      console.error('[Library] Availability check failed:', e);
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
      provider.customDomain, // Use specific domain from provider object
      navigation
    );
  };

  const handleAdventurePress = async adv => {
    handlePress(adv);
  };

  const renderMovieItem = (movie, index) => {
    const posterUrl = getImageUrl(movie.poster_path);
    const title = movie.title || movie.name || 'Unknown';
    const isLastInRow = (index + 1) % 3 === 0;

    return (
      <View
        key={movie.id ? `movie-${movie.id}` : `movie-idx-${index}`}
        style={[styles.cardWrapper, { marginRight: isLastInRow ? 0 : Spacing.md }]}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handlePress(movie)}
          activeOpacity={0.7}>
          {posterUrl ? (
            <Image source={{uri: posterUrl}} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, styles.placeholder]}>
              <Text style={{fontSize: 24}}>🎬</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.95)']}
            style={styles.overlay}>
            <Text style={[styles.title, { fontSize: FontSizes.sm - 2 }]} numberOfLines={2}>
              {title}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(movie)}
          activeOpacity={0.7}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.removeBtnGradient}>
            <Text style={styles.removeIcon}>✕</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAdventureItem = (adv, index) => {
    const isLastInRow = (index + 1) % 3 === 0;
    return (
      <View
        key={adv.id ? `adv-${adv.id}` : `adv-idx-${index}`}
        style={[styles.cardWrapper, { marginRight: isLastInRow ? 0 : Spacing.md }]}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleAdventurePress(adv)}
          activeOpacity={0.7}>
          <Image source={{uri: adv.thumb}} style={styles.poster} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.95)']}
            style={styles.overlay}>
            <Text style={[styles.title, { fontSize: FontSizes.sm - 2 }]} numberOfLines={2}>
              {adv.title}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemoveAdventure(adv)}
          activeOpacity={0.7}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.removeBtnGradient}>
            <Text style={styles.removeIcon}>✕</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[styles.header, {paddingTop: topPadding + Spacing.md}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Library</Text>
        <View style={{ width: 40 }} />
      </View>

      {(watchlist.length === 0 && adventures.length === 0) ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💿📀</Text>
          <Text style={styles.emptyTitle}>Your Library is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Save movies and discovery gems to see them here.
          </Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {watchlist.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Movies & Shows</Text>
              <View style={styles.grid}>
                {watchlist.map(renderMovieItem)}
              </View>
            </View>
          )}

          {adventures.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Discovery Gems</Text>
              <View style={styles.grid}>
                {adventures.map(renderAdventureItem)}
              </View>
            </View>
          )}
          <View style={{height: 120}} />
        </ScrollView>
      )}

      {/* Smart Provider Selection Modal */}
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
              <Text style={styles.modalSubtitle}>Streaming now in India</Text>
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

            {checkingAvailability ? (
              <ActivityIndicator size="large" color={Colors.accentPink} style={styles.modalSpinner} />
            ) : (
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPicker(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  sectionHeader: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cardWrapper: {
    width: GRID_CARD_WIDTH,
    height: GRID_CARD_HEIGHT,
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    fontSize: 12,
    color: '#fbbf24',
  },
  ratingText: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  removeBtnGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  removeIcon: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: Spacing.xl,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  advMeta: {
    backgroundColor: Colors.accentPurple + '40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  advSource: {
    color: Colors.accentPurple,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalDismissZone: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    minHeight: 350,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 2,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  providerItem: {
    alignItems: 'center',
    width: 80,
  },
  providerIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  providerLogo: {
    width: '100%',
    height: '100%',
  },
  providerIconText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '900',
  },
  providerName: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  modalSpinner: {
    marginVertical: Spacing.xxl,
  },
  noProvidersBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  noProvidersText: {
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: FontSizes.sm,
  },
});

export default LibraryScreen;
