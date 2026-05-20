// StreamDeck Mobile — Poster Card Component
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {getImageUrl} from '../services/tmdb';
import {loadWatchlist, toggleWatchlistItem} from '../utils/storage';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.28;
const CARD_HEIGHT = CARD_WIDTH * 1.7;

const POSTER_PLACEHOLDER = require('../assets/images/poster_placeholder.jpg');

const PosterCard = ({movie, onPress, style, size = 'default', isSaved: externalIsSaved, onAddToList}) => {
  const [localIsSaved, setLocalIsSaved] = useState(false);
  const title = movie.title || movie.name || 'Unknown';
  const rating = movie.vote_average
    ? movie.vote_average.toFixed(1)
    : null;
  const posterUrl = getImageUrl(movie.poster_path);
  
  const isSaved = externalIsSaved !== undefined ? externalIsSaved : localIsSaved;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset loading state when posterUrl changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [posterUrl]);

  useEffect(() => {
    if (externalIsSaved === undefined) {
      checkSavedStatus();
    }
  }, [movie.id, externalIsSaved]);

  const checkSavedStatus = async () => {
    const list = await loadWatchlist();
    setLocalIsSaved(list.some(item => item.id === movie.id));
  };

  const handleToggleLibrary = async (e) => {
    e.stopPropagation();
    if (onAddToList) {
      onAddToList(movie);
    } else {
      const updatedList = await toggleWatchlistItem(movie);
      setLocalIsSaved(updatedList.some(item => item.id === movie.id));
    }
  };

  const cardWidth = size === 'small' ? CARD_WIDTH * 0.85 : CARD_WIDTH;
  const cardHeight = size === 'small' ? CARD_HEIGHT * 0.85 : CARD_HEIGHT;

  return (
    <TouchableOpacity
      style={[styles.card, {width: cardWidth, height: cardHeight}, style]}
      onPress={() => onPress && onPress(movie)}
      activeOpacity={0.7}>
      {/* Inner Container to clip content but allow button to overflow */}
      <View style={styles.cardInner}>
        {/* Poster Image */}
        <View style={styles.imageContainer}>
          {/* Placeholder always rendered underneath */}
          <Image
            source={POSTER_PLACEHOLDER}
            style={styles.poster}
            resizeMode="cover"
          />

          {/* Title overlay on placeholder when no real image */}
          {(!posterUrl || imageError) && (
            <View style={styles.placeholderOverlay}>
              <Text style={styles.placeholderIcon}>🎬</Text>
              <Text style={styles.placeholderTitle} numberOfLines={3}>{title}</Text>
            </View>
          )}

          {/* Actual poster — fades in once loaded */}
          {posterUrl && !imageError && (
            <Image
              source={{uri: posterUrl}}
              style={[styles.poster, imageLoaded ? styles.posterVisible : styles.posterHidden]}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
        </View>

        {/* Bottom Content with Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
          style={styles.bottomOverlay}
        >
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {rating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingIcon}>★</Text>
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Library Button - Floating at Top Right */}
      <TouchableOpacity 
        style={[styles.libraryBtn, isSaved && styles.libraryBtnActive]}
        onPress={handleToggleLibrary}
        activeOpacity={0.8}
      >
        <Text style={styles.libraryIcon}>{isSaved ? '✓' : '+'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 4,
    overflow: 'visible',
    marginTop: 14,
  },
  cardInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterVisible: {
    opacity: 1,
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  posterHidden: {
    opacity: 0,
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  placeholderIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  placeholderTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 12,
  },
  libraryBtn: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    zIndex: 10,
    elevation: 5,
  },
  libraryBtnActive: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
  },
  libraryIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    paddingTop: 20,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 13,
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingIcon: {
    fontSize: 9,
    color: '#fbbf24',
  },
  ratingText: {
    fontSize: 9,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});

export default PosterCard;
