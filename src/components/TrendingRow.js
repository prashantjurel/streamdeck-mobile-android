import React, { useState, useEffect } from 'react';
import {View, StyleSheet, FlatList, TouchableOpacity, Text, Dimensions} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Spacing, Colors, BorderRadius} from '../theme/colors';
import SectionHeader from './SectionHeader';
import PosterCard from './PosterCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.28;
const CARD_HEIGHT = CARD_WIDTH * 1.7;

const SkeletonPoster = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withTiming(0.7, { 
      duration: 800, 
      easing: Easing.inOut(Easing.ease) 
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.skeletonCard, animatedStyle]}>
      <View style={styles.skeletonMetaBox}>
        <View style={styles.skeletonTextLong} />
        <View style={styles.skeletonTextShort} />
      </View>
    </Animated.View>
  );
};

const TrendingRow = ({title, subtitle, movies = [], isLoading = false, onMoviePress, style, onTitlePress, showChevron, titleExtra}) => {
  const [filter, setFilter] = useState('movie');

  const filteredMovies = (movies || []).filter(m => {
    if (filter === 'movie') return m.media_type === 'movie' || (!m.media_type && m.title);
    if (filter === 'tv') return m.media_type === 'tv' || (!m.media_type && m.name);
    return true;
  }).slice(0, 15);

  const rollAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    rollAnim.value = withSpring(filter === 'movie' ? 0 : 1, {
      damping: 15,
      stiffness: 120,
    });
  }, [filter]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rollAnim.value * -20 }], 
  }));

  const animatedChipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const handleToggle = () => {
    scaleAnim.value = withSpring(0.92, { damping: 10, stiffness: 300 }, () => {
      scaleAnim.value = withSpring(1);
    });
    setFilter(prev => prev === 'movie' ? 'tv' : 'movie');
  };

  const renderToggle = () => (
    <TouchableOpacity 
      onPress={handleToggle} 
      activeOpacity={1}
    >
      <Animated.View style={[styles.chip, styles.chipActive, animatedChipStyle]}>
        <View style={styles.textMask}>
          <Animated.View style={[styles.textRoll, animatedTextStyle]}>
            <Text style={styles.chipTextActive}>Movies</Text>
            <Text style={styles.chipTextActive}>Series</Text>
          </Animated.View>
        </View>
        <Ionicons 
          name="chevron-down" 
          size={8} 
          color="rgba(255,255,255,0.4)" 
          style={{ marginLeft: 3, marginTop: 1 }} 
        />
      </Animated.View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <SectionHeader 
        title={title} 
        subtitle={subtitle} 
        onPress={onTitlePress}
        showChevron={showChevron}
        titleExtra={titleExtra}
        rightAction={renderToggle()}
      />
      
      {!isLoading && filteredMovies.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            No trending {filter === 'tv' ? 'series' : 'movies'} found.
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Try switching to another provider.
          </Text>
        </View>
      ) : (
        <FlatList
          data={isLoading ? [1, 2, 3, 4, 5] : filteredMovies}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          keyExtractor={(item, idx) => isLoading ? `skeleton-${item}` : `${item.id}-${idx}`}
          renderItem={({item}) => (
            isLoading ? (
              <SkeletonPoster />
            ) : (
              <PosterCard 
                movie={item} 
                onPress={(m) => {
                  console.log('[TrendingRow] PosterCard onPress fired!', m?.title || m?.name);
                  if (onMoviePress) onMoviePress(m);
                }} 
              />
            )
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2, // Settles it onto the title baseline
  },
  chipActive: {
    // Transparent background, no border
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  chipTextActive: {
    height: 20,
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'left',
    lineHeight: 20,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  textMask: {
    height: 20,
    width: 48,
    overflow: 'hidden',
  },
  textRoll: {
    height: 40,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: Spacing.md,
    justifyContent: 'flex-end',
    padding: Spacing.sm,
  },
  skeletonMetaBox: {
    width: '100%',
    gap: 6,
  },
  skeletonTextLong: {
    width: '80%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skeletonTextShort: {
    width: '40%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  emptyStateContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TrendingRow;
