// StreamDeck Mobile — Hero Spotlight Component
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {getImageUrl} from '../services/tmdb';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const HERO_HEIGHT = 440;
const CARD_HEIGHT = HERO_HEIGHT - 20;
const ITEM_WIDTH = SCREEN_WIDTH * 0.85;
const SPACER_WIDTH = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

const HeroCard = ({ movie, index, scrollX, onPlay, onAddToList }) => {
  const backdropUrl = getImageUrl(movie.backdrop_path, 'original');
  const title = movie.title || movie.name || 'Unknown';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '9.0';
  const year = (movie.release_date || movie.first_air_date || '2026').split('-')[0];

  const animatedStyle = useAnimatedStyle(() => {
    // Relative position from center: 0 = center, 1 = right, -1 = left
    const position = (index * ITEM_WIDTH - scrollX.value) / ITEM_WIDTH;
    const absPosition = Math.abs(position);

    // Perspective depth: scale down and dim adjacent cards
    const scale = interpolate(absPosition, [0, 1], [1, 0.85], Extrapolation.CLAMP);
    const opacity = interpolate(absPosition, [0, 1], [1, 0.5], Extrapolation.CLAMP);

    // Alignment Correction:
    // When a card scales down to 0.85, it shrinks towards its center.
    // This creates an unnatural, massive empty gap between the cards.
    // We mathematically calculate the exact size of this gap and pull the cards inwards.
    const scaleShrinkGap = ITEM_WIDTH * ((1 - 0.85) / 2); // The space created on one side by scaling
    const desiredVisibleGap = 15; // We want exactly 15 pixels of space between cards
    const translationOffset = scaleShrinkGap - desiredVisibleGap;

    let translateX = 0;
    if (position > 0) {
      // Right card: pull left towards center
      translateX = -position * translationOffset;
    } else if (position < 0) {
      // Left card: pull right towards center
      translateX = position * translationOffset; // position is negative, so this results in a positive translation
    }

    return {
      transform: [
        { translateX },
        { scale }
      ],
      opacity,
    };
  });

  return (
    <View style={{width: ITEM_WIDTH, justifyContent: 'center', alignItems: 'center'}}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.imageContainer}>
          {backdropUrl ? (
            <Image source={{uri: backdropUrl}} style={styles.backdrop} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.98)']}
          style={styles.bottomOverlay}
        >
          <View style={styles.badgeContainer}>
            <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.badge}>
              <Text style={styles.badgeText}>TRENDING NOW</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          
          <View style={styles.meta}>
            <Text style={styles.rating}>★ {rating}</Text>
            <Text style={styles.divider}>•</Text>
            <Text style={styles.year}>{year}</Text>
            <View style={styles.hdBadge}><Text style={styles.hdText}>HD</Text></View>
          </View>

          <Text style={styles.overview} numberOfLines={2}>
            {movie.overview || "No description available for this trending title."}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.playBtn} onPress={() => onPlay(movie)}>
              <LinearGradient colors={[Colors.accentPurple, Colors.accentPink]} style={styles.playGradient}>
                <Text style={styles.playText}>▶ Play</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.listBtn} onPress={() => onAddToList(movie)}>
              <Text style={styles.listText}>+ My List</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const HeroSpotlight = ({movies = [], onPlay, onAddToList}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);
  const scrollX = useSharedValue(0);

  const startAutoPlay = useCallback(() => {
    if (movies.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const nextIndex = (prev + 1) % movies.length;
        // Calculate exact offset based on item width to avoid index mismatches with padding
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * ITEM_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, 6000);
  }, [movies.length]);

  useEffect(() => {
    startAutoPlay();
    return () => clearInterval(timerRef.current);
  }, [startAutoPlay]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
    setActiveIndex(Math.max(0, Math.min(newIndex, movies.length - 1)));
  };

  const renderItem = ({item: movie, index}) => {
    return (
      <HeroCard
        movie={movie}
        index={index}
        scrollX={scrollX}
        onPlay={onPlay}
        onAddToList={onAddToList}
      />
    );
  };

  if (movies.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={movies}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollBeginDrag={() => clearInterval(timerRef.current)}
        onScrollEndDrag={startAutoPlay}
        contentContainerStyle={{ paddingHorizontal: SPACER_WIDTH }}
      />
      <View style={styles.pagination}>
        {movies.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    marginBottom: Spacing.lg,
  },
  card: {
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    paddingTop: 80,
  },
  badgeContainer: { marginBottom: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 5 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 6, textShadowColor: '#000', textShadowRadius: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rating: { color: '#fbbf24', fontWeight: '900', fontSize: 14 },
  divider: { color: 'rgba(255,255,255,0.3)' },
  year: { color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
  hdBadge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 5, borderRadius: 3 },
  hdText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900' },
  overview: { color: 'rgba(255,255,255,0.98)', fontSize: 13, lineHeight: 19, marginBottom: 20, textShadowColor: '#000', textShadowRadius: 5 },
  actions: { flexDirection: 'row', gap: 15 },
  playBtn: { borderRadius: 28, overflow: 'hidden', elevation: 5 },
  playGradient: { paddingHorizontal: 26, paddingVertical: 12 },
  playText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  listBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  listText: { color: '#fff', fontWeight: '700' },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 10 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { width: 16, backgroundColor: Colors.accentPurple },
});

export default HeroSpotlight;

