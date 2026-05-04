// StreamDeck Mobile — Hero Spotlight (Vertical Stacked Carousel)
// Inspired by JioHotstar's stacked card UI — side-peeking stack
import React, {useState, useEffect, useRef, useCallback, memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  PanResponder,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, Spacing} from '../theme/colors';
import {getImageUrl} from '../services/tmdb';

const CARD_HEIGHT = 520;
const ANIM_DURATION = 400;
const AUTO_PLAY_MS = 5000;

// ═══════════════════════════════════════════════════════════
// HeroCard — Reusable poster card for movies, series, live sports
// The card IS the poster. Content bottom-aligned over gradient.
// ═══════════════════════════════════════════════════════════
const HeroCard = memo(({movie, onPlay, onAddToList}) => {
  const backdropUrl = getImageUrl(movie.backdrop_path, 'original');
  const title = movie.title || movie.name || 'Unknown';
  const isSports = movie.isSports;

  // ── Dynamic metadata — only show fields that exist ────
  const buildMeta = () => {
    if (isSports) {
      const m = movie.match || {};
      const parts = [];
      if (m.status === 'LIVE') parts.push('LIVE NOW');
      else if (m.time) parts.push(m.time);
      if (m.type) {
        const sportMap = {football: 'Football', cricket: 'Cricket', f1: 'Formula 1'};
        parts.push(sportMap[m.type] || m.type);
      }
      return parts;
    }
    const parts = [];
    const year = (movie.release_date || movie.first_air_date || '').split('-')[0];
    if (year) parts.push(year);
    if (movie.original_language) {
      const langMap = {
        en: 'English', hi: 'Hindi', es: 'Spanish', ko: 'Korean',
        ja: 'Japanese', fr: 'French', de: 'German', it: 'Italian',
        pt: 'Portuguese', ta: 'Tamil', te: 'Telugu',
      };
      parts.push(langMap[movie.original_language] || movie.original_language.toUpperCase());
    }
    if (movie.number_of_seasons && movie.number_of_seasons > 0) {
      parts.push(`${movie.number_of_seasons} Season${movie.number_of_seasons > 1 ? 's' : ''}`);
    }
    if (movie.vote_average && movie.vote_average > 0) {
      parts.push(`★ ${movie.vote_average.toFixed(1)}`);
    }
    return parts;
  };

  const metaParts = buildMeta();

  return (
    <View style={styles.heroCard}>
      {/* ── Full-bleed poster ────────────────────────── */}
      {backdropUrl ? (
        <Image
          source={typeof backdropUrl === 'string' ? {uri: backdropUrl} : backdropUrl}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, {backgroundColor: '#1A1A2E'}]} />
      )}

      {/* ── Bottom gradient scrim for text readability ── */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(0,0,0,0.12)',
          'rgba(0,0,0,0.40)',
          'rgba(0,0,0,0.72)',
          'rgba(0,0,0,0.90)',
        ]}
        locations={[0, 0.2, 0.45, 0.75, 1]}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
        style={styles.gradient}
      />

      {/* ── Bottom-aligned content ─────────────────────── */}
      <View style={styles.contentOverlay}>
        {/* Left: tag + title + meta */}
        <View style={styles.textCol}>
          {isSports ? (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <Text style={styles.trendingTag}>Trending Now</Text>
          )}

          <Text style={styles.title} numberOfLines={2}>{title}</Text>

          {metaParts.length > 0 && (
            <Text style={styles.meta}>{metaParts.join('  ·  ')}</Text>
          )}
        </View>

        {/* Right: floating circular action buttons */}
        <View style={styles.actionCol}>
          {!isSports && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => onAddToList(movie)}
              activeOpacity={0.7}>
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => onPlay(movie)}
            activeOpacity={0.7}>
            <View style={styles.playTriangle} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════
// StackedCard — RIGHT-side-peeking animated card in the stack
//
// HOW RIGHT-PEEK WORKS (Android-safe):
//   - All cards share the SAME left edge (left: 16)
//   - Front card is narrower (SCREEN_WIDTH - 40)
//   - Behind cards are WIDER (SCREEN_WIDTH - 28, SCREEN_WIDTH - 18)
//   - The wider behind cards extend further to the RIGHT
//   - z-index keeps the front card on top
// ═══════════════════════════════════════════════════════════
const StackedCard = memo(({movie, index, animIndex, onPlay, onAddToList, screenWidth}) => {
  const animStyle = useAnimatedStyle(() => {
    const dist = index - animIndex.value;

    // Cards that have scrolled past → hide
    if (dist < -0.5) {
      return {opacity: 0, zIndex: -1, width: screenWidth - 64};
    }
    // Cards too far in the future → hide
    if (dist > 2.5) {
      return {opacity: 0, zIndex: -1, width: screenWidth - 64};
    }

    const d = Math.max(0, Math.min(dist, 2));

    // ── RIGHT-PEEK: all cards same left edge, behind cards wider ──
    // Front: W-64  →  Card2: W-52 (12px right peek)  →  Card3: W-42 (22px right peek)
    const cardWidth = interpolate(
      d, [0, 1, 2],
      [screenWidth - 64, screenWidth - 52, screenWidth - 42],
      Extrapolation.CLAMP,
    );

    // Opacity: front card full, behind cards progressively faded
    const opacity = interpolate(d, [0, 1, 2], [1, 0.45, 0.20], Extrapolation.CLAMP);

    // z-index: front on top
    const zIdx = interpolate(d, [0, 1, 2], [3, 2, 1], Extrapolation.CLAMP);

    return {
      width: cardWidth,
      opacity,
      zIndex: Math.round(zIdx),
    };
  });

  return (
    <Animated.View style={[styles.stackCard, animStyle]}>
      <HeroCard movie={movie} onPlay={onPlay} onAddToList={onAddToList} />
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════
// HeroSpotlight — The stacked carousel container
// ═══════════════════════════════════════════════════════════
const HeroSpotlight = ({movies = [], onPlay, onAddToList, paused = false}) => {
  const {width: SCREEN_WIDTH} = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);
  const moviesRef = useRef(movies);
  const animIndex = useSharedValue(0);
  const timerRef = useRef(null);

  // Keep moviesRef in sync for PanResponder
  useEffect(() => {
    moviesRef.current = movies;
  }, [movies]);

  const goTo = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(idx, moviesRef.current.length - 1));
    activeRef.current = clamped;
    setActiveIndex(clamped);
    animIndex.value = withTiming(clamped, {
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [movies.length, animIndex]);

  // ── Auto-play ────────────────────────────────────────
  const startAuto = useCallback(() => {
    clearInterval(timerRef.current);
    if (movies.length <= 1) return;
    timerRef.current = setInterval(() => {
      const next = activeRef.current + 1 >= movies.length ? 0 : activeRef.current + 1;
      if (next === 0) {
        activeRef.current = 0;
        setActiveIndex(0);
        animIndex.value = 0;
      } else {
        goTo(next);
      }
    }, AUTO_PLAY_MS);
  }, [movies.length, goTo, animIndex]);

  useEffect(() => {
    startAuto();
    return () => clearInterval(timerRef.current);
  }, [startAuto]);

  // ── Reset when movies list changes (filtering) ────────
  useEffect(() => {
    activeRef.current = 0;
    setActiveIndex(0);
    animIndex.value = 0;
    startAuto();
  }, [movies.length, startAuto]);

  // ── Pause/resume when modal is open ──────────────────
  useEffect(() => {
    if (paused) {
      clearInterval(timerRef.current);
    } else {
      startAuto();
    }
  }, [paused, startAuto]);

  // ── Swipe gesture ────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        clearInterval(timerRef.current);
      },
      onPanResponderRelease: (_, g) => {
        const currentMovies = moviesRef.current;
        if (g.dx < -50) {
          // Wrap around to 0 if at end, else go next
          const nextIdx = activeRef.current + 1 >= currentMovies.length ? 0 : activeRef.current + 1;
          goTo(nextIdx);
        } else if (g.dx > 50) {
          // Wrap around to end if at start, else go prev
          const prevIdx = activeRef.current - 1 < 0 ? currentMovies.length - 1 : activeRef.current - 1;
          goTo(prevIdx);
        }
        startAuto();
      },
    }),
  ).current;

  if (movies.length === 0) return null;

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      {/* Stack container — full width, cards centered inside */}
      <View style={[styles.stackContainer, {height: CARD_HEIGHT + 14}]}>
        {movies.map((movie, idx) => (
          <StackedCard
            key={`${movie.id}-${idx}`}
            movie={movie}
            index={idx}
            animIndex={animIndex}
            onPlay={onPlay}
            onAddToList={onAddToList}
            screenWidth={SCREEN_WIDTH}
          />
        ))}
      </View>

      {/* Pagination dots */}
      <View style={styles.dots}>
        {movies.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ── Container ───────────────────────────────────────
  wrapper: {
    marginBottom: Spacing.lg,
  },
  stackContainer: {
    // Full width — cards anchored to left, peek extends right
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },

  // ── Stacked card (absolute, z-axis) ─────────────────
  stackCard: {
    position: 'absolute',
    top: 0,
    left: 32,
    height: CARD_HEIGHT,
    // Soft shadow for depth
    ...Platform.select({
      android: {
        elevation: 12,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
    }),
  },

  // ── HeroCard — poster IS the card ───────────────────
  heroCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ── Poster image ────────────────────────────────────
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  // ── Bottom gradient — rich cinematic scrim ──────────
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },

  // ── Content: pinned to bottom ───────────────────────
  contentOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // ── Text column (bottom-left) ───────────────────────
  textCol: {
    flex: 1,
    marginRight: 14,
  },

  // ── Action buttons (bottom-right) ───────────────────
  actionCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingBottom: 2,
  },

  // ── Tags ────────────────────────────────────────────
  trendingTag: {
    color: Colors.accentPurple,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.liveBadge,
  },
  liveText: {
    color: Colors.liveBadge,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },

  // ── Title (large, bold, clearly visible) ────────────
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
  },

  // ── Meta (bigger, clearer) ──────────────────────────
  meta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },

  // ── Add button (circular, floating) ─────────────────
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // ── Play button (circular, floating) ────────────────
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: Colors.bgPrimary,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },

  // ── Pagination ──────────────────────────────────────
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: Colors.accentPurple,
  },
});

export default HeroSpotlight;
