import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Image, Dimensions, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';

const {width, height} = Dimensions.get('window');
const CARD_WIDTH = width * 0.80;
const CARD_HEIGHT = height * 0.58;

const DiscoveryCard = ({item}) => {
  const [expanded, setExpanded] = useState(false);
  const [imgSrc, setImgSrc] = useState({uri: item.thumb});
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1000&auto=format&fit=crop'; // Cinema fallback

  useEffect(() => {
    setImgSrc({uri: item.thumb});
  }, [item.thumb]);

  const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '';

  return (
    <View style={styles.card}>
      <Image 
        source={imgSrc} 
        style={styles.image} 
        resizeMode="cover" 
        onError={() => setImgSrc({uri: FALLBACK_IMAGE})}
      />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)', '#000']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      />
      
      <View style={[styles.badgeContainer, {left: Spacing.md, right: undefined}]}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            🍿 Movie {year ? `• ${year}` : ''}
          </Text>
        </View>
      </View>

      {rating ? (
        <View style={styles.badgeContainer}>
          <View style={[styles.categoryBadge, {backgroundColor: Colors.accentPink}]}>
            <Text style={styles.categoryText}>⭐ {rating}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.snippet} numberOfLines={expanded ? undefined : 4}>
            {item.overview || 'No synopsis available for this movie.'}
          </Text>
          {!expanded && item.overview && item.overview.length > 100 && (
            <Text style={styles.readMore}>Read More...</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl * 1.5,
    backgroundColor: Colors.bgSecondary,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: -1,
    right: -1,
    bottom: -1,
    height: '60%', // Fixed height for a more focused fade
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 10,
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 10,
  },
  snippet: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 15, // Stronger shadow
  },
  readMore: {
    color: Colors.accentPink,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});

export default DiscoveryCard;
export {CARD_WIDTH, CARD_HEIGHT};
