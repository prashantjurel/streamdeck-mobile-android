// StreamDeck Mobile — HeroCardImage (Memoized + Prefetching)
// Handles placeholder → real image crossfade for hero carousel cards.
// Extracted from HeroSpotlight to prevent re-renders during scroll.
import React, { useState, useEffect, memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const HERO_PLACEHOLDER = require('../assets/images/poster_placeholder.jpg');

/**
 * HeroCardImage — Handles the backdrop image loading with:
 * 1. Placeholder shown immediately (blurred)
 * 2. Real image fades in on load
 * 3. Error fallback to a generic cinematic image
 * 4. Static — does NOT re-render when carousel scrolls
 */
const HeroCardImage = memo(({ backdropPath, isSports, isWorldCup, matchType }) => {
  const [currentSrc, setCurrentSrc] = useState(backdropPath);

  // Sync src when prop changes (new card swiped into view)
  useEffect(() => {
    setCurrentSrc(backdropPath);
  }, [backdropPath]);

  const getFallback = () => {
    if (isWorldCup) return require('../assets/images/wc_bg.png');
    if (isSports) {
      return matchType === 'f1'
        ? 'https://images.unsplash.com/photo-1551221281-224451000632?q=80&w=1200'
        : 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200';
    }
    return HERO_PLACEHOLDER;
  };

  const handleError = () => {
    const fallback = getFallback();
    const newSrc = typeof fallback === 'string' ? fallback : fallback;
    setCurrentSrc(newSrc);
  };

  const finalSrc = currentSrc || getFallback();
  const source = typeof finalSrc === 'string' ? { uri: finalSrc } : finalSrc;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Single merged image to avoid Android zIndex overlapping bugs */}
      <Image
        source={source}
        defaultSource={HERO_PLACEHOLDER}
        style={styles.image}
        resizeMode="cover"
        blurRadius={isWorldCup ? 4 : 0}
        onError={handleError}
      />
    </View>
  );
});

/**
 * Prefetch images for upcoming carousel cards.
 * Call this when the active index changes.
 */
export function prefetchHeroImages(movies, currentIndex, count = 2) {
  if (!movies || movies.length === 0) return;
  
  for (let i = 1; i <= count; i++) {
    const nextIdx = (currentIndex + i) % movies.length;
    const movie = movies[nextIdx];
    if (!movie) continue;
    
    const path = movie.backdrop_path || movie.poster_path;
    if (path && typeof path === 'string') {
      const url = path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w1280${path}`;
      Image.prefetch(url).catch(() => {});
    }
  }
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});

export default HeroCardImage;
