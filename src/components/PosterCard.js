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
import {getImageUrl, getNowPlayingIds} from '../services/tmdb';
import {loadWatchlist, toggleWatchlistItem} from '../utils/storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.32;
const CARD_HEIGHT = CARD_WIDTH * 1.5; // Slightly reduced to fit text below

const POSTER_PLACEHOLDER = require('../assets/images/poster_placeholder.jpg');

const PosterCard = ({movie, onPress, style, size = 'default', isSaved: externalIsSaved, onAddToList}) => {
  const [localIsSaved, setLocalIsSaved] = useState(false);
  const title = movie.title || movie.name || 'Unknown';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;
  const posterUrl = getImageUrl(movie.poster_path);
  const year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
  
  const [inCinemas, setInCinemas] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (movie.media_type !== 'tv') {
      getNowPlayingIds().then(ids => {
        if (ids && ids.has(movie.id)) {
          setInCinemas(true);
        }
      });
    }
  }, [movie.id, movie.media_type]);

  // Reset error state when posterUrl changes
  useEffect(() => {
    setImageError(false);
  }, [posterUrl]);

  const cardWidth = size === 'small' ? CARD_WIDTH * 0.85 : CARD_WIDTH;
  const cardHeight = size === 'small' ? CARD_HEIGHT * 0.85 : CARD_HEIGHT;

  return (
    <View style={[styles.container, {width: cardWidth}, style]}>
      <TouchableOpacity
        style={[styles.card, {width: cardWidth, height: cardHeight}]}
        onPress={() => onPress && onPress(movie)}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Image
            source={(!posterUrl || imageError) ? POSTER_PLACEHOLDER : { uri: posterUrl }}
            defaultSource={POSTER_PLACEHOLDER}
            style={styles.poster}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
          
          {/* Top Left Media Type Badge */}
          {inCinemas && (
            <View style={styles.mediaTypeBadge}>
              <Text style={styles.mediaTypeText}>IN CINEMAS</Text>
            </View>
          )}

          {/* Top Right Rating Badge */}
          {rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={8} color="#FFD700" style={{marginTop: -1}} />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Text Details Below Card */}
      <View style={styles.detailsContainer}>
        <Text style={styles.titleText} numberOfLines={2}>{title}</Text>
        {year ? (
          <Text style={styles.yearText}>{year}</Text>
        ) : (
          <Text style={styles.yearText}>TBA</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.md,
    marginTop: 14,
  },
  card: {
    borderRadius: BorderRadius.lg,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  placeholderIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(20,20,24,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mediaTypeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,24,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 3,
  },
  ratingText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  detailsContainer: {
    paddingHorizontal: 2,
  },
  titleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    marginBottom: 2,
  },
  yearText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default PosterCard;
