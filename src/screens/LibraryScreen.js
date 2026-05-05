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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {loadWatchlist, toggleWatchlistItem} from '../utils/storage';
import {getImageUrl} from '../services/tmdb';
import SectionHeader from '../components/SectionHeader';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md * 2) / 3;
const GRID_CARD_HEIGHT = GRID_CARD_WIDTH * 1.5;

const LibraryScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [watchlist, setWatchlist] = useState([]);
  const [adventures, setAdventures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [wlItems, advItemsRaw] = await Promise.all([
        loadWatchlist(),
        AsyncStorage.getItem('streamdeck_mobile_adventure_saved')
      ]);
      setWatchlist(wlItems || []);
      setAdventures(advItemsRaw ? JSON.parse(advItemsRaw) : []);
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
    const updated = adventures.filter(a => a.url !== adv.url);
    setAdventures(updated);
    await AsyncStorage.setItem('streamdeck_mobile_adventure_saved', JSON.stringify(updated));
  };

  const handleRemove = async movie => {
    const updated = await toggleWatchlistItem(movie);
    setWatchlist(updated);
  };

  const handlePress = movie => {
    const title = movie.title || movie.name;
    navigation.navigate('Explore', {searchQuery: title, ts: Date.now()});
  };

  const handleAdventurePress = async adv => {
    const canOpen = await Linking.canOpenURL(adv.url);
    if (canOpen) {
      await Linking.openURL(adv.url);
    } else {
      navigation.navigate('WebView', {url: adv.url, title: adv.title});
    }
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
        key={adv.url ? `adv-${adv.url}` : `adv-idx-${index}`}
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
        <SectionHeader title="My Library" />
      </View>

      {(watchlist.length === 0 && adventures.length === 0) ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
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
});

export default LibraryScreen;
