// StreamDeck Mobile — Hero Spotlight (Vertical Stacked Carousel)
// Inspired by JioHotstar's stacked card UI — side-peeking stack
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing } from '../theme/colors';
import { getImageUrl } from '../services/tmdb';
import Ionicons from 'react-native-vector-icons/Ionicons';

const CARD_HEIGHT = 520;
const ANIM_DURATION = 1400;
const AUTO_PLAY_MS = 8000;

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

// Team colors dictionary for World Cup matches
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
  if (name.includes('norwa')) return { primary: '#BA0C2F', secondary: '#00205B' };
  if (name.includes('mexic')) return { primary: '#006847', secondary: '#CE1126' };
  if (name.includes('united states') || name.includes('usa') || name.includes('u.s.')) return { primary: '#002868', secondary: '#BF0A30' };
  if (name.includes('canad')) return { primary: '#FF0000', secondary: '#FFFFFF' };
  if (name.includes('nether')) return { primary: '#FF4F00', secondary: '#FFFFFF' };
  if (name.includes('ital')) return { primary: '#004B87', secondary: '#CD212A' };
  if (name.includes('saudi')) return { primary: '#006C35', secondary: '#FFFFFF' };
  if (name.includes('japan')) return { primary: '#E10714', secondary: '#002E73' };
  if (name.includes('seneg')) return { primary: '#FDEF42', secondary: '#00853F' };
  if (name.includes('moroc')) return { primary: '#C1272D', secondary: '#006233' };
  if (name.includes('austra')) return { primary: '#FFCD00', secondary: '#00008B' };
  if (name.includes('belgi')) return { primary: '#FFD300', secondary: '#E30613' };
  if (name.includes('switze')) return { primary: '#D52B1E', secondary: '#FFFFFF' };
  if (name.includes('denma')) return { primary: '#C8102E', secondary: '#FFFFFF' };
  if (name.includes('urugu')) return { primary: '#87CEEB', secondary: '#0038A8' };
  if (name.includes('colomb')) return { primary: '#FCD116', secondary: '#003893' };
  if (name.includes('austri')) return { primary: '#ED2939', secondary: '#FFFFFF' };
  if (name.includes('peru')) return { primary: '#D91414', secondary: '#FFFFFF' };
  if (name.includes('nigeri')) return { primary: '#008751', secondary: '#FFFFFF' };
  if (name.includes('hondur')) return { primary: '#0073CF', secondary: '#FFFFFF' };
  if (name.includes('costa')) return { primary: '#CE1126', secondary: '#002B7F' };
  if (name.includes('congo') || name.includes('dr congo')) return { primary: '#007FFF', secondary: '#FDD017' };
  if (name.includes('ghana')) return { primary: '#FFD300', secondary: '#E30613' };
  if (name.includes('panam')) return { primary: '#0051BA', secondary: '#DA121A' };
  if (name.includes('qatar')) return { primary: '#8A1538', secondary: '#FFFFFF' };
  if (name.includes('algeri')) return { primary: '#006633', secondary: '#D21034' };
  if (name.includes('ecuad')) return { primary: '#FFDD00', secondary: '#002F6C' };
  if (name.includes('south africa') || name.includes('rsa')) return { primary: '#007A4D', secondary: '#DE3831' };
  if (name.includes('south korea') || name.includes('kor')) return { primary: '#CD2E3A', secondary: '#0047A0' };
  if (name.includes('wales')) return { primary: '#D41E24', secondary: '#00AD43' };
  if (name.includes('chile')) return { primary: '#0039A6', secondary: '#D52B1E' };
  if (name.includes('polan')) return { primary: '#DC143C', secondary: '#FFFFFF' };
  if (name.includes('uzbek')) return { primary: '#0099B5', secondary: '#1EB940' };
  if (name.includes('turke') || name.includes('türki')) return { primary: '#E30A17', secondary: '#FFFFFF' };
  if (name.includes('tunis')) return { primary: '#E30A17', secondary: '#FFFFFF' };
  if (name.includes('czech')) return { primary: '#11457E', secondary: '#D7141A' };
  if (name.includes('iraq')) return { primary: '#DA121A', secondary: '#007A3E' };
  if (name.includes('jorda')) return { primary: '#DA121A', secondary: '#007A3E' };
  if (name.includes('curac')) return { primary: '#002B7F', secondary: '#FDD017' };
  if (name.includes('cabo') || name.includes('cape verde')) return { primary: '#002B7F', secondary: '#DA121A' };
  
  return { primary: '#FFD700', secondary: '#00E676' };
};

const HERO_PLACEHOLDER = require('../assets/images/poster_placeholder.jpg');

const HeroCard = memo(({ movie, onPlay, onAddToList, isSaved }) => {
  // Prefer backdrop (wide), fall back to poster (tall) if backdrop is missing.
  // Some TMDB trending items omit backdrop_path — this prevents a permanent placeholder.
  // Use w1280 (not original) — full-res JPEGs are 2-3MB and cause visible placeholder delay.
  const rawPath = movie.backdrop_path || movie.poster_path || null;
  const backdropUrl = typeof rawPath === 'number' ? rawPath : getImageUrl(rawPath, 'w1280');
  const title = movie.title || movie.name || 'Unknown';
  const isSports = movie.isSports;

  // ── Dynamic metadata — only show fields that exist ────
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

  const [currentBackdrop, setCurrentBackdrop] = useState(backdropUrl);
  const [backdropLoaded, setBackdropLoaded] = useState(false);

  // Sync state with prop whenever backdropUrl changes
  useEffect(() => {
    setCurrentBackdrop(backdropUrl);
    setBackdropLoaded(false);
  }, [backdropUrl]);

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
      style={[styles.heroCard, movie.isWorldCup && { padding: 2.5 }]}
      {...wrapperProps}
    >
      <InnerWrapper {...innerWrapperProps}>
      {/* Placeholder backdrop — always visible until real image loads */}
      <Image
        source={HERO_PLACEHOLDER}
        style={[styles.poster, styles.heroPlaceholder]}
        resizeMode="cover"
        blurRadius={2}
      />

      {/* Actual backdrop — fades in on load */}
      <Image
        source={typeof currentBackdrop === 'string' ? { uri: currentBackdrop } : currentBackdrop}
        style={[styles.poster, backdropLoaded ? styles.heroBackdropVisible : styles.heroBackdropHidden]}
        resizeMode="cover"
        blurRadius={movie.isWorldCup ? 4 : 0}
        onLoad={() => setBackdropLoaded(true)}
        onError={() => {
          // If the primary image fails, use a high-quality sport-specific fallback
          const fallback = movie.isWorldCup
            ? require('../assets/images/wc_bg.png')
            : (isSports
              ? (movie.match?.type === 'f1'
                ? 'https://images.unsplash.com/photo-1551221281-224451000632?q=80&w=1200'
                : 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200')
              : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200');
          setCurrentBackdrop(typeof fallback === 'number' ? fallback : { uri: fallback });
          setBackdropLoaded(true);
        }}
      />

      {/* Dimming overlay on top of the poster image */}
      <View style={[styles.posterDimmer, movie.isWorldCup && styles.wcPosterDimmer]} />

      {/* Top Gradient Banner for World Cup Theme */}
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

      {/* ── Bottom gradient scrim for text readability ── */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0.45)',
          'rgba(0,0,0,0.85)',
          'rgba(0,0,0,1.0)',
        ]}
        locations={[0, 0.25, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      />

      {/* ── Centered Team Logos for Sports ────────────────── */}
      {/* Sports Logo Overlays (Hide for F1 or World Cup) */}
      {isSports && !movie.isWorldCup && movie.match?.type !== 'f1' && movie.match?.logo1 && movie.match?.logo2 && (
        <View style={styles.centeredLogoStage}>
          <View style={styles.logoRow}>
            {movie.match.type === 'f1' ? (
              <View style={[styles.largeTeamCircle, { width: 120, height: 120 }]}>
                <TeamLogo uri={movie.match.logo1} initials={movie.match.initials1} />
              </View>
            ) : (
              <>
                <View style={styles.largeTeamCircle}>
                  <TeamLogo uri={movie.match.logo1} initials={movie.match.initials1} />
                </View>
                <View style={styles.largeVsBadge}>
                  <Text style={styles.largeVsText}>VS</Text>
                </View>
                <View style={styles.largeTeamCircle}>
                  <TeamLogo uri={movie.match.logo2} initials={movie.match.initials2} />
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Centered Flags/Scores for World Cup */}
      {isSports && movie.isWorldCup && (
        <View style={styles.wcHeroCenteredContainer}>
          {/* Faint Golden Trophy Watermark */}
          <Ionicons
            name="trophy"
            size={180}
            color="rgba(255, 215, 0, 0.05)"
            style={styles.wcHeroWatermark}
          />
          {movie.match?.stage && (
            <Text style={styles.wcHeroMatchStageText}>
              {movie.match.stage.toUpperCase()}
            </Text>
          )}
          <View style={styles.wcHeroLogoRow}>
            {/* Left Team Column */}
            <View style={styles.wcHeroTeamColumn}>
              <View style={[styles.wcHeroFlagCircle, { borderColor: team1Colors.primary }]}>
                <Text style={styles.wcHeroFlagEmoji}>{movie.match?.flag1 || movie.match?.logo1}</Text>
              </View>
              <Text style={[styles.wcHeroTeamName, { color: '#FFD700', position: 'absolute', top: 98 }]} numberOfLines={2}>
                {movie.match?.team1}
              </Text>
            </View>
            
            {/* Center Score/VS */}
            {movie.match?.status === 'LIVE' && movie.match?.score ? (
              <View style={styles.wcHeroScoreBox}>
                <Text style={styles.wcHeroScoreText}>{movie.match.score}</Text>
              </View>
            ) : (
              <View style={styles.wcHeroVsBox}>
                <Text style={styles.wcHeroVsText}>VS</Text>
              </View>
            )}

            {/* Right Team Column */}
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

      {/* ── Bottom-aligned content ─────────────────────── */}
      <View style={styles.contentOverlay}>
        {/* Left: tag + title + meta */}
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
                    <LinearGradient
                      colors={['#f59e0b', '#d97706']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.trendingGradient}
                    >
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
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.trendingGradient}
                >
                  <Ionicons name="time" size={10} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.trendingText}>Starting Soon</Text>
                </LinearGradient>
              </View>
            ) : (
              <BlinkingLiveBadge />
            )
          ) : (
            <View style={styles.trendingBadge}>
              <LinearGradient
                colors={[Colors.accentPurple, Colors.accentPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.trendingGradient}
              >
                <Ionicons name="flame" size={10} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.trendingText}>Trending Now</Text>
              </LinearGradient>
            </View>
          )}

          <Text
            style={[
              styles.title, 
              isSports && { fontSize: 24, lineHeight: 30 },
              movie.isWorldCup && { color: '#FFD700' }
            ]}
            numberOfLines={isSports ? 3 : 2}
          >
            {title}
          </Text>

          {metaParts.length > 0 && (
            <Text style={styles.meta}>{metaParts.join('  ·  ')}</Text>
          )}
        </View>

        {/* Right: floating circular action buttons */}
        <View style={styles.actionCol}>
          {!isSports && (
            <TouchableOpacity
              style={[styles.addBtn, isSaved && styles.addBtnActive]}
              onPress={() => onAddToList(movie)}
              activeOpacity={0.7}>
              <Ionicons
                name={isSaved ? "checkmark" : "add"}
                size={24}
                color="#fff"
              />
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
    </InnerWrapper>
    </CardWrapper>
  );
});

// ═══════════════════════════════════════════════════════════
// StackedCard — RIGHT-side-peeking animated card in the stack
// ═══════════════════════════════════════════════════════════
const StackedCard = memo(({ movie, index, total, animIndex, onPlay, onAddToList, screenWidth, isSaved }) => {
  const animStyle = useAnimatedStyle(() => {
    // ── Circular Distance Calculation ──
    // This ensures that even if animIndex is 10 and we have 5 movies,
    // the distance for movie 0 is handled correctly as if it's right after 4.
    let dist = index - (animIndex.value % total);
    if (dist > total / 2) dist -= total;
    if (dist < -total / 2) dist += total;

    // Cards too far in the past/future relative to active
    if (dist < -1.1 || dist > 2.5) {
      return { opacity: 0, zIndex: -1, transform: [{ translateX: dist < 0 ? -screenWidth : 0 }] };
    }

    const d = Math.max(-1, Math.min(dist, 2));

    // ── Horizontal Movement (Exit) ──
    const translateX = interpolate(
      d, [-1, 0, 1, 2],
      [-screenWidth, 0, 0, 0],
      Extrapolation.CLAMP
    );

    // ── RIGHT-PEEK: behind cards wider ──
    const cardWidth = interpolate(
      d, [0, 1, 2],
      [screenWidth - 64, screenWidth - 52, screenWidth - 42],
      Extrapolation.CLAMP,
    );

    // Keep fully opaque so it doesn't fade on swipe!
    const opacity = interpolate(d, [-1, -0.9, 0, 1, 2], [0, 1, 1, 1, 1], Extrapolation.CLAMP);
    const zIdx = interpolate(d, [-1, 0, 1, 2], [4, 3, 2, 1], Extrapolation.CLAMP);

    return {
      width: cardWidth,
      opacity,
      zIndex: Math.round(zIdx),
      transform: [
        { translateX },
        { scale: 1 }
      ],
    };
  });

  return (
    <Animated.View style={[styles.stackCard, animStyle]}>
      <HeroCard movie={movie} onPlay={onPlay} onAddToList={onAddToList} isSaved={isSaved} />
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════
// HeroSpotlight — The stacked carousel container
// ═══════════════════════════════════════════════════════════
const HeroSpotlight = ({ movies = [], onPlay, onAddToList, paused = false, watchlist = [] }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);
  const moviesRef = useRef(movies);
  const animIndex = useSharedValue(0);
  const timerRef = useRef(null);

  useEffect(() => {
    moviesRef.current = movies;
  }, [movies]);

  const goTo = useCallback((idx, velocity = 0) => {
    // Infinite indexing: we don't clamp, we just go to the target
    activeRef.current = idx;

    // Calculate UI index for dots
    const len = moviesRef.current.length;
    if (len > 0) {
      const uiIdx = ((idx % len) + len) % len;
      setActiveIndex(uiIdx);
    }

    // Use withSpring for a buttery smooth, physics-based snap
    animIndex.value = withSpring(idx, {
      damping: 20,
      stiffness: 160,
      mass: 0.7,
      overshootClamping: true, // Prevents wobbly bouncing
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
  }, [animIndex]);

  // ── Auto-play ────────────────────────────────────────
  const startAuto = useCallback(() => {
    clearInterval(timerRef.current);
    if (movies.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      goTo(activeRef.current + 1);
    }, AUTO_PLAY_MS);
  }, [movies.length, goTo, paused]);

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
  }, [movies.length]);

  // ── Swipe gesture ────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        // Only claim the gesture if the user is clearly swiping left/right
        return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
      },
      // IMPORTANT: Once we claim the horizontal swipe, DO NOT let the vertical ScrollView steal it!
      // This prevents the "stuck mid-air" freeze bug on Android.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        clearInterval(timerRef.current);
      },
      onPanResponderMove: (_, g) => {
        const delta = (g.dx / SCREEN_WIDTH);
        animIndex.value = activeRef.current - delta;
      },
      onPanResponderRelease: (_, g) => {
        const velocity = g.vx || 0;
        const dragThreshold = SCREEN_WIDTH * 0.2;

        let targetIdx = activeRef.current;

        if (g.dx < -dragThreshold || velocity < -0.3) {
          targetIdx = activeRef.current + 1;
        } else if (g.dx > dragThreshold || velocity > 0.3) {
          targetIdx = activeRef.current - 1;
        }

        // Circular behavior: no clamping needed here, 
        // goTo handles infinite indexing
        goTo(targetIdx, velocity);
        startAuto();
      },
      onPanResponderTerminate: (_, g) => {
        // If gesture is cancelled mid-swipe (e.g. parent ScrollView takes over),
        // we must force snap it to the nearest index so it doesn't freeze in between cards!
        let targetIdx = activeRef.current;
        if (g.dx && g.dx < - (SCREEN_WIDTH * 0.2)) {
          targetIdx = activeRef.current + 1;
        } else if (g.dx && g.dx > (SCREEN_WIDTH * 0.2)) {
          targetIdx = activeRef.current - 1;
        }
        goTo(targetIdx, g.vx || 0);
        startAuto();
      },
    }),
  ).current;

  if (movies.length === 0) return null;

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      {/* Stack container — full width, cards centered inside */}
      <View style={[styles.stackContainer, { height: CARD_HEIGHT + 14 }]}>
        {movies.map((movie, idx) => (
          <StackedCard
            key={`${movie.id}-${idx}`}
            movie={movie}
            index={idx}
            total={movies.length}
            animIndex={animIndex}
            onPlay={onPlay}
            onAddToList={onAddToList}
            screenWidth={SCREEN_WIDTH}
            isSaved={watchlist.some(m => m.id === movie.id)}
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

  // ── Poster image ────────────────────────────────────
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  // ── Placeholder shown while real backdrop loads ──────
  heroPlaceholder: {
    zIndex: 0,
    opacity: 1,
  },
  heroBackdropVisible: {
    zIndex: 1,
    opacity: 1,
  },
  heroBackdropHidden: {
    zIndex: 1,
    opacity: 0,
  },

  // ── Bottom gradient — rich cinematic scrim ──────────
  gradient: {
    position: 'absolute',
    left: -1,
    right: -1,
    bottom: -1,
    height: '55%',
    zIndex: 2,
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
    zIndex: 12,
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
  trendingBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderRadius: 6,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.accentPink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  trendingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trendingText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  liveBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.liveBadge,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 6,
    elevation: 4,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ── Title (large, bold, clearly visible) ────────────
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // ── Centered Large Team Logos ──────────────────────
  centeredLogoStage: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  largeTeamCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF', // Solid white background for max visibility
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    // Strong shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  largeTeamLogo: {
    width: 75,
    height: 75,
    // Small shadow to ensure colorful logos pop on white
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  largeVsBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 15,
  },
  largeVsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  teamInitials: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // ── Meta (bigger, clearer) ──────────────────────────
  meta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  addBtnActive: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
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
  wcHeroTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    paddingTop: 16,
    paddingHorizontal: 20,
    zIndex: 11,
  },
  wcHeroTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wcHeroTopTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wcHeroCenteredContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  wcHeroLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 2,
    marginBottom: 48, // Space to accommodate up to 2 wrapped lines of team names
  },
  wcHeroFlagCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF', // Solid white backdrop so flags stand out clearly
    borderWidth: 3,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'hidden',
  },
  wcHeroFlagEmoji: {
    fontSize: 56,
    width: 90,
    height: 90,
    lineHeight: 90,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  wcHeroVsBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E1E1E', // Slick dark scorecard design
    borderWidth: 2,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  wcHeroVsText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  wcHeroScoreBox: {
    backgroundColor: '#1E1E1E', // Slick dark scorecard design
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    elevation: 10,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  wcHeroScoreText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  wcHeroTeamColumn: {
    alignItems: 'center',
    width: 110, // Increased width for wrapping team name text
  },
  wcHeroTeamName: {
    color: '#fff',
    fontSize: 15, // Highly readable size for long country name wrapping
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginTop: 8,
    width: 110, // Increased width
  },
  wcHeroBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  wcHeroBadgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  wcHeroBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  wcHeroCardBorder: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#022c22',
  },
  wcHeroWatermark: {
    position: 'absolute',
    alignSelf: 'center',
    top: -45,
    zIndex: 1,
  },
  posterDimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    zIndex: 1,
  },
  wcPosterDimmer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  wcHeroCardInner: {
    flex: 1,
    borderRadius: 18.5,
    backgroundColor: '#022c22',
    overflow: 'hidden',
    position: 'relative',
  },
  wcHeroMatchStageText: {
    color: '#FFD700',
    fontSize: 15, // Bigger match group/stage title
    fontWeight: '900',
    letterSpacing: 2, // Bold letter spacing
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default HeroSpotlight;
