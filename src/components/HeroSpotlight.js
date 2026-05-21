// StreamDeck Mobile — Hero Spotlight (Smooth Carousel v2)
// Architecture: GestureHandler + Reanimated + translateX/scale (no width animation)
//
// KEY CHANGES FROM v1:
// 1. PanResponder → GestureHandler PanGesture (runs on UI thread)
// 2. Width animation → translateX + scale (transform-only = no layout recalc)
// 3. Image loading extracted to HeroCardImage (no re-renders on scroll)
// 4. Animated dot pagination with smooth morphing
// 5. withSpring velocity passthrough for physics-based feel
//
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing } from '../theme/colors';
import { getImageUrl, getNowPlayingIds } from '../services/tmdb';
import HeroCardImage, { prefetchHeroImages } from './HeroCardImage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const CARD_HEIGHT = 520;
const AUTO_PLAY_MS = 6000;

// ═══════════════════════════════════════════════════════════
// BlinkingLiveBadge (unchanged from v1)
// ═══════════════════════════════════════════════════════════
const BlinkingLiveBadge = memo(({ style }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.liveBadgeContainer, style, animatedStyle]}>
      <View style={styles.liveBadgeDot} />
      <Text style={styles.liveBadgeText}>LIVE</Text>
    </Animated.View>
  );
});

// TeamLogo — Logo with initials fallback
const TeamLogo = memo(({ uri, initials }) => {
  const [error, setError] = useState(false);
  if (error || !uri) {
    return <Text style={styles.teamInitials}>{initials || '?'}</Text>;
  }
  return (
    <Image
      source={{ uri }}
      style={styles.largeTeamLogo}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
});

// Team colors dictionary for World Cup
const getTeamColors = (teamName) => {
  if (!teamName) return { primary: '#FFD700', secondary: '#00E676' };
  const name = teamName.toLowerCase().trim();
  if (name.includes('argenti')) return { primary: '#74ACDF', secondary: '#003087' };
  if (name.includes('portug')) return { primary: '#E42518', secondary: '#118C4F' };
  if (name.includes('brazil') || (name.includes('bra') && name.length === 3)) return { primary: '#FFDF00', secondary: '#009B3A' };
  if (name.includes('german')) return { primary: '#FFFFFF', secondary: '#DD0000' };
  if (name.includes('spain') || name.includes('esp')) return { primary: '#FFC400', secondary: '#C60B1E' };
  if (name.includes('franc')) return { primary: '#002395', secondary: '#ED2939' };
  if (name.includes('croat')) return { primary: '#FF0000', secondary: '#11457E' };
  if (name.includes('engla')) return { primary: '#E21E26', secondary: '#0B1F3F' };
  if (name.includes('united states') || name.includes('usa')) return { primary: '#002868', secondary: '#BF0A30' };
  if (name.includes('nether')) return { primary: '#FF4F00', secondary: '#FFFFFF' };
  if (name.includes('ital')) return { primary: '#004B87', secondary: '#CD212A' };
  if (name.includes('japan')) return { primary: '#E10714', secondary: '#002E73' };
  if (name.includes('moroc')) return { primary: '#C1272D', secondary: '#006233' };
  if (name.includes('south korea') || name.includes('kor')) return { primary: '#CD2E3A', secondary: '#0047A0' };
  return { primary: '#FFD700', secondary: '#00E676' };
};

// ═══════════════════════════════════════════════════════════
// HeroCard — The visible card content (poster + gradient + metadata)
// ═══════════════════════════════════════════════════════════
const HeroCard = memo(({ movie, onPlay, onAddToList, isSaved, cardWidth }) => {
  const rawPath = movie.backdrop_path || movie.poster_path || null;
  const backdropUrl = typeof rawPath === 'number' ? rawPath : getImageUrl(rawPath, 'w1280');
  const title = movie.title || movie.name || 'Unknown';
  const isSports = movie.isSports;

  const [inCinemas, setInCinemas] = useState(false);

  useEffect(() => {
    if (!isSports && movie.media_type !== 'tv') {
      getNowPlayingIds().then(ids => {
        if (ids && ids.has(movie.id)) {
          setInCinemas(true);
        }
      });
    }
  }, [movie.id, movie.media_type, isSports]);

  const buildMeta = () => {
    if (isSports) {
      const m = movie.match || {};
      const parts = [];
      if (m.time) parts.push(m.time);
      else if (m.status === 'LIVE') parts.push('LIVE NOW');
      if (m.type) {
        const sportMap = { football: 'Football', cricket: 'Cricket', f1: 'Formula 1' };
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
  const team1Colors = getTeamColors(movie.match?.team1);
  const team2Colors = getTeamColors(movie.match?.team2);

  const CardWrapper = movie.isWorldCup ? LinearGradient : View;
  const wrapperProps = movie.isWorldCup ? {
    colors: [team1Colors.primary, team2Colors.secondary, team2Colors.primary, team1Colors.secondary],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  } : {};

  const InnerWrapper = movie.isWorldCup ? TouchableOpacity : View;
  const innerWrapperProps = movie.isWorldCup ? {
    activeOpacity: 0.95,
    onPress: () => onPlay(movie),
    style: styles.wcHeroCardInner
  } : {
    style: { flex: 1, position: 'relative', overflow: 'hidden' }
  };

  return (
    <CardWrapper
      style={[styles.heroCard, { width: cardWidth }, movie.isWorldCup && { padding: 2.5 }]}
      {...wrapperProps}
    >
      <InnerWrapper {...innerWrapperProps}>
        {/* Image with crossfade */}
        <HeroCardImage
          backdropPath={backdropUrl}
          isSports={isSports}
          isWorldCup={movie.isWorldCup}
          matchType={movie.match?.type}
        />

        {/* Dimming overlay */}
        <View style={[styles.posterDimmer, movie.isWorldCup && styles.wcPosterDimmer]} />

        {/* WC Top Banner */}
        {movie.isWorldCup && (
          <LinearGradient
            colors={['rgba(2, 44, 34, 0.95)', 'rgba(6, 78, 59, 0.8)', 'transparent']}
            style={styles.wcHeroTopGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.wcHeroTopHeader}>
              <Ionicons name="trophy" size={14} color="#FFD700" style={{ marginRight: 6 }} />
              <Text style={styles.wcHeroTopTitle}>FIFA WORLD CUP 2026</Text>
            </View>
          </LinearGradient>
        )}

        {/* Bottom gradient scrim */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,1.0)']}
          locations={[0, 0.25, 0.5, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        />

        {/* Sports logos (non-WC, non-F1) */}
        {isSports && !movie.isWorldCup && movie.match?.type !== 'f1' && movie.match?.logo1 && movie.match?.logo2 && (
          <View style={styles.centeredLogoStage}>
            <View style={styles.logoRow}>
              <View style={styles.largeTeamCircle}>
                <TeamLogo uri={movie.match.logo1} initials={movie.match.initials1} />
              </View>
              <View style={styles.largeVsBadge}>
                <Text style={styles.largeVsText}>VS</Text>
              </View>
              <View style={styles.largeTeamCircle}>
                <TeamLogo uri={movie.match.logo2} initials={movie.match.initials2} />
              </View>
            </View>
          </View>
        )}

        {/* World Cup centered flags */}
        {isSports && movie.isWorldCup && (
          <View style={styles.wcHeroCenteredContainer}>
            <Ionicons name="trophy" size={180} color="rgba(255, 215, 0, 0.05)" style={styles.wcHeroWatermark} />
            {movie.match?.stage && (
              <Text style={styles.wcHeroMatchStageText}>{movie.match.stage.toUpperCase()}</Text>
            )}
            <View style={styles.wcHeroLogoRow}>
              <View style={styles.wcHeroTeamColumn}>
                <View style={[styles.wcHeroFlagCircle, { borderColor: team1Colors.primary }]}>
                  <Text style={styles.wcHeroFlagEmoji}>{movie.match?.flag1 || movie.match?.logo1}</Text>
                </View>
                <Text style={[styles.wcHeroTeamName, { color: '#FFD700', position: 'absolute', top: 98 }]} numberOfLines={2}>
                  {movie.match?.team1}
                </Text>
              </View>
              {movie.match?.status === 'LIVE' && movie.match?.score ? (
                <View style={styles.wcHeroScoreBox}>
                  <Text style={styles.wcHeroScoreText}>{movie.match.score}</Text>
                </View>
              ) : (
                <View style={styles.wcHeroVsBox}>
                  <Text style={styles.wcHeroVsText}>VS</Text>
                </View>
              )}
              <View style={styles.wcHeroTeamColumn}>
                <View style={[styles.wcHeroFlagCircle, { borderColor: team2Colors.primary }]}>
                  <Text style={styles.wcHeroFlagEmoji}>{movie.match?.flag2 || movie.match?.logo2}</Text>
                </View>
                <Text style={[styles.wcHeroTeamName, { color: '#FFD700', position: 'absolute', top: 98 }]} numberOfLines={2}>
                  {movie.match?.team2}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom content overlay */}
        <View style={styles.contentOverlay}>
          <View style={styles.textCol}>
            {movie.isWorldCup ? (
              <View style={styles.wcHeroBadgeContainer}>
                <LinearGradient
                  colors={['#022c22', '#064e3b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.wcHeroBadgeGradient}
                >
                  <Text style={styles.wcHeroBadgeText}>FIFA WORLD CUP 2026</Text>
                </LinearGradient>
                {!movie.isWorldCupPromo && (
                  movie.match?.status === 'soon' ? (
                    <View style={[styles.trendingBadge, { marginLeft: 6, marginBottom: 0 }]}>
                      <LinearGradient colors={['#f59e0b', '#d97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.trendingGradient}>
                        <Ionicons name="time" size={10} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.trendingText}>Starting Soon</Text>
                      </LinearGradient>
                    </View>
                  ) : (
                    <BlinkingLiveBadge style={{ marginLeft: 6, marginBottom: 0 }} />
                  )
                )}
              </View>
            ) : isSports ? (
              movie.match?.status === 'soon' ? (
                <View style={styles.trendingBadge}>
                  <LinearGradient colors={['#f59e0b', '#d97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.trendingGradient}>
                    <Ionicons name="time" size={10} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.trendingText}>Starting Soon</Text>
                  </LinearGradient>
                </View>
              ) : (
                <BlinkingLiveBadge />
              )
            ) : (
              <View style={styles.trendingBadge}>
                {inCinemas ? (
                  <LinearGradient
                    colors={['rgba(20,20,24,0.85)', 'rgba(20,20,24,0.85)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.trendingGradient}
                  >
                    <Ionicons name="film" size={10} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.trendingText}>IN CINEMAS</Text>
                  </LinearGradient>
                ) : (
                  <LinearGradient
                    colors={[Colors.accentPurple, Colors.accentPink]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.trendingGradient}
                  >
                    <Ionicons name="flame" size={10} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.trendingText}>Trending Now</Text>
                  </LinearGradient>
                )}
              </View>
            )}

            <Text
              style={[styles.title, isSports && { fontSize: 24, lineHeight: 30 }, movie.isWorldCup && { color: '#FFD700' }]}
              numberOfLines={isSports ? 3 : 2}
            >
              {title}
            </Text>

            {metaParts.length > 0 && (
              <Text style={styles.meta}>{metaParts.join('  ·  ')}</Text>
            )}
          </View>

          <View style={styles.actionCol}>
            {!isSports && (
              <TouchableOpacity
                style={[styles.addBtn, isSaved && styles.addBtnActive]}
                onPress={() => onAddToList(movie)}
                activeOpacity={0.7}
              >
                <Ionicons name={isSaved ? "checkmark" : "add"} size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.playBtn} onPress={() => onPlay(movie)} activeOpacity={0.7}>
              <View style={styles.playTriangle} />
            </TouchableOpacity>
          </View>
        </View>
      </InnerWrapper>
    </CardWrapper>
  );
});

// ═══════════════════════════════════════════════════════════
// AnimatedDot — Individual pagination dot with smooth morphing
// ═══════════════════════════════════════════════════════════
const AnimatedDot = memo(({ index, scrollX, totalCards, screenWidth }) => {
  const CARD_WIDTH = screenWidth - 64;
  
  const animStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];
    
    const width = interpolate(
      scrollX.value % (totalCards * CARD_WIDTH),
      inputRange,
      [6, 18, 6],
      Extrapolation.CLAMP
    );
    
    const opacity = interpolate(
      scrollX.value % (totalCards * CARD_WIDTH),
      inputRange,
      [0.15, 1, 0.15],
      Extrapolation.CLAMP
    );

    return {
      width,
      opacity,
      backgroundColor: Colors.accentPurple,
    };
  });

  return <Animated.View style={[styles.dot, animStyle]} />;
});

// ═══════════════════════════════════════════════════════════
// HeroSpotlight — The main carousel container (v2 engine)
// ═══════════════════════════════════════════════════════════
const HeroSpotlight = ({ movies = [], onPlay, onAddToList, paused = false, watchlist = [] }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = SCREEN_WIDTH - 32;
  const CARD_SPACING = 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);
  const timerRef = useRef(null);
  
  // Shared values for Reanimated (UI thread)
  const translateX = useSharedValue(0);
  const scrollX = useSharedValue(0); // For dot pagination
  const activeIdx = useSharedValue(0); // Safely track active index in worklet
  const isDragging = useSharedValue(false);

  // ── Auto-play ────────────────────────────────────────
  const startAutoPlay = useCallback(() => {
    clearInterval(timerRef.current);
    if (movies.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      if (isDragging.value) return; // Prevent fighting gesture
      const next = (activeRef.current + 1) % movies.length;
      activeRef.current = next;
      activeIdx.value = next;
      setActiveIndex(next);
      const target = -next * CARD_WIDTH;
      translateX.value = withSpring(target, {
        damping: 22,
        stiffness: 150,
        mass: 0.8,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
      scrollX.value = withTiming(next * CARD_WIDTH, { duration: 400 });
      prefetchHeroImages(movies, next);
    }, AUTO_PLAY_MS);
  }, [movies.length, paused, CARD_WIDTH]);

  useEffect(() => {
    startAutoPlay();
    return () => clearInterval(timerRef.current);
  }, [startAutoPlay]);

  // Reset when movies change
  useEffect(() => {
    activeRef.current = 0;
    activeIdx.value = 0;
    setActiveIndex(0);
    translateX.value = 0;
    scrollX.value = 0;
    startAutoPlay();
  }, [movies.length]);

  const syncJS = useCallback((idx) => {
    setActiveIndex(idx);
    activeRef.current = idx;
    startAutoPlay();
    prefetchHeroImages(movies, idx);
  }, [movies, startAutoPlay]);

  // ── Gesture handler (UI thread) ─────────────────────
  const gesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-20, 20])
      .failOffsetY([-10, 10])
      .onStart(() => {
        'worklet';
        isDragging.value = true;
      })
      .onUpdate((event) => {
        'worklet';
        const base = -activeIdx.value * CARD_WIDTH;
        translateX.value = base + event.translationX;
      })
      .onEnd((event) => {
        'worklet';
        isDragging.value = false;
        const velocity = event.velocityX;
        const dragThreshold = CARD_WIDTH * 0.15;
        
        let nextIndex = activeIdx.value;
        
        if (event.translationX < -dragThreshold || velocity < -500) {
          nextIndex = (activeIdx.value + 1) % movies.length;
        } else if (event.translationX > dragThreshold || velocity > 500) {
          nextIndex = (activeIdx.value - 1 + movies.length) % movies.length;
        }

        const target = -nextIndex * CARD_WIDTH;
        
        // Physics-based spring with velocity passthrough
        translateX.value = withSpring(target, {
          velocity: velocity,
          damping: 22,
          stiffness: 150,
          mass: 0.8,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });

        scrollX.value = withTiming(nextIndex * CARD_WIDTH, { duration: 300 });
        
        activeIdx.value = nextIndex;
        
        // Sync active index back to JS thread safely
        runOnJS(syncJS)(nextIndex);
      });
  }, [movies.length, CARD_WIDTH, syncJS]);

  // ── Card animated styles ────────────────────────────
  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (movies.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.carouselTrack, containerAnimStyle]}>
          {movies.map((movie, idx) => {
            const isActive = idx === activeIndex;
            return (
              <CardWrapper
                key={`${movie.id}-${idx}`}
                index={idx}
                activeIndex={activeIndex}
                translateX={translateX}
                cardWidth={CARD_WIDTH}
                screenWidth={SCREEN_WIDTH}
                totalCards={movies.length}
              >
                <HeroCard
                  movie={movie}
                  onPlay={onPlay}
                  onAddToList={onAddToList}
                  isSaved={watchlist.some(m => m.id === movie.id)}
                  cardWidth={CARD_WIDTH}
                />
              </CardWrapper>
            );
          })}
        </Animated.View>
      </GestureDetector>

      {/* Animated dot pagination */}
      <View style={styles.dots}>
        {movies.map((_, i) => (
          <AnimatedDot
            key={i}
            index={i}
            scrollX={scrollX}
            totalCards={movies.length}
            screenWidth={SCREEN_WIDTH}
          />
        ))}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// CardWrapper — Applies scale + shadow for side-peek effect
// Uses ONLY transforms (translateX, scale) — NO width/layout changes
// ═══════════════════════════════════════════════════════════
const CardWrapper = memo(({ children, index, activeIndex, translateX, cardWidth, screenWidth, totalCards }) => {
  const animStyle = useAnimatedStyle(() => {
    const scrollPosition = -translateX.value;
    const cardOffset = index * cardWidth;
    const diff = scrollPosition - cardOffset;
    
    // Normalize to -1...1 range (0 = active, ±1 = adjacent)
    const normalized = diff / cardWidth;
    
    // Scale: active = 1.0, adjacent = 0.92
    const scale = interpolate(
      Math.abs(normalized),
      [0, 1, 2],
      [1, 0.92, 0.85],
      Extrapolation.CLAMP
    );

    // Opacity: active = 1, far cards fade
    const opacity = interpolate(
      Math.abs(normalized),
      [0, 1, 2],
      [1, 0.85, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.cardSlot, { width: cardWidth, height: CARD_HEIGHT }, animStyle]}>
      {children}
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  
  // ── Carousel track (horizontal strip of cards) ──────
  carouselTrack: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
  },
  
  // ── Card slot (fixed width, transform-animated) ─────
  cardSlot: {
    marginRight: 0,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
    }),
  },

  // ── HeroCard — poster IS the card ───────────────────
  heroCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },

  posterDimmer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 1,
  },
  wcPosterDimmer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  gradient: {
    position: 'absolute',
    left: -1, right: -1, bottom: -1,
    height: '55%',
    zIndex: 2,
  },

  contentOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 12,
  },

  textCol: { flex: 1, marginRight: 14 },
  actionCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingBottom: 2 },

  trendingBadge: {
    alignSelf: 'flex-start', marginBottom: 8, borderRadius: 6, overflow: 'hidden',
    elevation: 4, shadowColor: Colors.accentPink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  trendingGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3 },
  trendingText: {
    color: '#fff', fontSize: 9.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  liveBadgeContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.liveBadge,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8, gap: 6, elevation: 4,
  },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  title: {
    color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 34, marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  meta: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  addBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addBtnActive: { backgroundColor: Colors.accentPurple, borderColor: Colors.accentPurple },
  playBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  playTriangle: {
    width: 0, height: 0, marginLeft: 4,
    borderLeftWidth: 16, borderTopWidth: 10, borderBottomWidth: 10,
    borderLeftColor: Colors.bgPrimary, borderTopColor: 'transparent', borderBottomColor: 'transparent',
  },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { height: 6, borderRadius: 3 },

  // ── Sports & World Cup styles (preserved from v1) ──
  centeredLogoStage: {
    position: 'absolute', top: '32%', left: 0, right: 0, height: 140,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  largeTeamCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFFFFF',
    borderWidth: 3, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 12,
  },
  largeTeamLogo: { width: 75, height: 75, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  largeVsBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#000',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center', elevation: 15,
  },
  largeVsText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  teamInitials: { color: '#1A1A2E', fontSize: 24, fontWeight: 'bold' },

  wcHeroTopGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 90, paddingTop: 16, paddingHorizontal: 20, zIndex: 11 },
  wcHeroTopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  wcHeroTopTitle: { color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  wcHeroCenteredContainer: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  wcHeroLogoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 2, marginBottom: 48 },
  wcHeroFlagCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#FFD700',
    justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 12, overflow: 'hidden',
  },
  wcHeroFlagEmoji: { fontSize: 56, width: 90, height: 90, lineHeight: 90, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  wcHeroVsBox: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E1E1E', borderWidth: 2, borderColor: '#FFD700',
    justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5,
  },
  wcHeroVsText: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  wcHeroScoreBox: {
    backgroundColor: '#1E1E1E', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: '#FFD700',
    elevation: 10, minWidth: 70, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5,
  },
  wcHeroScoreText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1.5 },
  wcHeroTeamColumn: { alignItems: 'center', width: 110 },
  wcHeroTeamName: {
    color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4, marginTop: 8, width: 110,
  },
  wcHeroBadgeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  wcHeroBadgeGradient: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)' },
  wcHeroBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  wcHeroCardInner: { flex: 1, borderRadius: 18.5, backgroundColor: '#022c22', overflow: 'hidden', position: 'relative' },
  wcHeroMatchStageText: {
    color: '#FFD700', fontSize: 15, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  wcHeroWatermark: { position: 'absolute', alignSelf: 'center', top: -45, zIndex: 1 },
});

export default HeroSpotlight;
