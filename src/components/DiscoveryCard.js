import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Image, Dimensions} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';

const {width, height} = Dimensions.get('window');
const CARD_WIDTH = width * 0.92;
const CARD_HEIGHT = height * 0.60;

const DiscoveryCard = ({item}) => {
  const [imgSrc, setImgSrc] = React.useState({uri: item.thumb});
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop';

  useEffect(() => {
    setImgSrc({uri: item.thumb});
  }, [item.thumb]);

  return (
    <View style={styles.card}>
      <Image 
        source={imgSrc} 
        style={styles.image} 
        resizeMode="cover" 
        onError={() => setImgSrc({uri: FALLBACK_IMAGE})}
      />
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.98)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />
      
      <View style={[styles.badgeContainer, {left: Spacing.md, right: undefined}]}>
        <View style={[styles.categoryBadge, {backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1}]}>
          <Text style={styles.categoryText}>
            {item.contentType === 'Video' ? '📺' : 
             item.contentType === 'Podcast' ? '🎙️' : 
             item.contentType === 'Documentary' ? '🎬' : 
             item.contentType === 'Research' ? '🔬' : 
             item.contentType === 'Education' ? '🎓' : 
             item.contentType === 'Short Film' ? '🎞️' : '📄'} {item.contentType}
          </Text>
        </View>
      </View>

      <View style={styles.badgeContainer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.categoryLabel || item.category}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.source}>{item.source}</Text>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.snippet} numberOfLines={3}>{item.snippet}</Text>
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
    ...StyleSheet.absoluteFillObject,
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  categoryBadge: {
    backgroundColor: Colors.accentPurple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
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
  source: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    opacity: 0.8, // Slightly more opaque
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
  snippet: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.9, // Slightly more opaque
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
});

export default DiscoveryCard;
export {CARD_WIDTH, CARD_HEIGHT};
