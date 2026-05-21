import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Linking,
  FlatList,
  Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '../theme/colors';
import { fetchMediaDetails, fetchTVSeasonDetails, fetchWatchProviders, TMDB_IMAGE_BASE, TMDB_IMAGE_ORIGINAL } from '../services/tmdb';
import { loadSettings, isDirectEngineEnabled, loadDefaultProvider, saveDefaultProvider, loadWatchlist, toggleWatchlistItem } from '../utils/storage';
import { OTT_PROVIDER_MAP, navigateToOTT } from '../utils/OTTNavigation';
import { isFebBoxAvailable } from '../services/febbox';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Formatting helpers
const formatRuntime = (minutes) => {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getAgeRating = (details) => {
  if (!details) return '';
  if (details.media_type === 'tv' && details.content_ratings?.results) {
    const usRating = details.content_ratings.results.find(r => r.iso_3166_1 === 'US');
    return usRating?.rating || 'NR';
  } else if (details.release_dates?.results) {
    const usRelease = details.release_dates.results.find(r => r.iso_3166_1 === 'US');
    if (usRelease?.release_dates?.length > 0) {
      return usRelease.release_dates[0].certification || 'NR';
    }
  }
  return 'NR';
};

const MediaDetailsModal = ({ visible, mediaItem, onClose, onPlay }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const seasonsListRef = useRef(null);
  
  const [availableProviders, setAvailableProviders] = useState([]);
  const [defaultProviderId, setDefaultProviderId] = useState(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && mediaItem) {
      loadDetails();
      // Check watchlist status
      const id = mediaItem.tmdbId || mediaItem.id;
      loadWatchlist().then(wl => {
        setInWatchlist(wl?.some(w => String(w.id) === String(id) || String(w.tmdbId) === String(id)) || false);
      });
    } else {
      setDetails(null);
      setEpisodes([]);
      setSelectedSeason(1);
      setAvailableProviders([]);
      setInWatchlist(false);
    }
  }, [visible, mediaItem]);

  const loadDetails = async () => {
    setLoading(true);
    // Determine type: it could be in mediaType or media_type
    const type = mediaItem.mediaType || mediaItem.media_type || 'movie';
    // ID could be tmdbId or id
    const id = mediaItem.tmdbId || mediaItem.id;
    
    if (id) {
      const data = await fetchMediaDetails(id, type);
      setDetails(data);
      
      if (data?.media_type === 'tv' && data.number_of_seasons > 0) {
        const initialSeason = data.seasons?.find(s => s.season_number > 0)?.season_number || 1;
        setSelectedSeason(initialSeason);
        loadEpisodes(id, initialSeason);
      }
      
      await loadProviders(id, type);
    }
    setLoading(false);
  };

  const loadProviders = async (tmdbId, mediaType) => {
    const initialProviders = [];
    const directEnabled = await isDirectEngineEnabled();
    if (directEnabled) {
      initialProviders.push({
        id: 'direct',
        name: 'StreamDeck Engine',
        icon: 'movie-open-play',
        color: Colors.accentPurple,
        logoUrl: Image.resolveAssetSource(require('../assets/images/logo.png')).uri,
        searchUrl: null,
      });
    }

    const settings = await loadSettings();
    const movieboxSources = settings.movieboxSources || [];
    
    if (settings.febboxEnabled) {
      const fbAvail = await isFebBoxAvailable();
      if (fbAvail) {
        initialProviders.push({
          id: 'febbox',
          name: 'FebBox',
          icon: 'play-box-multiple',
          color: '#E21D48',
          logoUrl: null,
          searchUrl: null,
        });
      }
    }

    const mbProviders = [];
    movieboxSources.filter(s => s.enabled).forEach((s, idx) => {
      const mbDomain = s.url.trim();
      const mbSearchDomain = mbDomain.replace('http://', '').replace('https://', '');
      const colors = ['#E21D48', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#14b8a6', '#6366f1'];
      let hash = 0;
      const name = s.name || mbSearchDomain;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      const color = colors[Math.abs(hash) % colors.length];
      
      mbProviders.push({
        id: `moviebox_${idx}`,
        name: s.name || mbSearchDomain,
        icon: 'movie-open-play',
        color: color,
        logoUrl: null,
        searchUrl: `https://${mbSearchDomain}/search?q=`,
        customDomain: mbDomain,
      });
    });

    const defId = await loadDefaultProvider();
    if (defId) setDefaultProviderId(defId);

    try {
      const watchInfo = await fetchWatchProviders(tmdbId, mediaType);
      const found = [];
      if (watchInfo) {
        const allProviders = [...(watchInfo.flatrate || []), ...(watchInfo.buy || []), ...(watchInfo.rent || [])];
        const uniqueIds = [...new Set(allProviders.map(p => p.provider_id))];
        uniqueIds.forEach(id => {
          if (OTT_PROVIDER_MAP[id]) {
            const tmdbProvider = allProviders.find(p => p.provider_id === id);
            found.push({
              ...OTT_PROVIDER_MAP[id],
              logoUrl: tmdbProvider?.logo_path 
                ? `https://image.tmdb.org/t/p/w200${tmdbProvider.logo_path}` 
                : OTT_PROVIDER_MAP[id].logoUrl || null,
            });
          }
        });
      }
      setAvailableProviders([...initialProviders, ...mbProviders, ...found]);
    } catch (e) {
      console.log('[MediaDetailsModal] Provider fetch error:', e);
      setAvailableProviders([...initialProviders, ...mbProviders]);
    }
  };

  const loadEpisodes = async (showId, seasonNumber) => {
    setLoadingEpisodes(true);
    const seasonData = await fetchTVSeasonDetails(showId, seasonNumber);
    if (seasonData?.episodes) {
      setEpisodes(seasonData.episodes);
    }
    setLoadingEpisodes(false);
  };

  const triggerPlayback = async (provider, forcedEpisode = null) => {
    if (saveAsDefault && provider) {
      await saveDefaultProvider(provider.id);
      setDefaultProviderId(provider.id);
    }
    
    const selectedProvider = provider || 
      availableProviders.find(p => p.id === defaultProviderId) || 
      availableProviders[0];

    if (!selectedProvider) return;

    const title = details?.name || details?.title || mediaItem?.title || mediaItem?.name;
    const mediaType = details?.media_type || mediaItem?.mediaType || mediaItem?.media_type;
    const tmdbId = details?.id || mediaItem?.tmdbId || mediaItem?.id;
    const thumb = forcedEpisode?.still_path ? `https://image.tmdb.org/t/p/w400${forcedEpisode.still_path}` : (mediaItem?.thumb || mediaItem?.poster_path);

    onClose();

    await navigateToOTT(
      selectedProvider,
      forcedEpisode ? forcedEpisode.name : title,
      tmdbId,
      mediaType,
      selectedProvider.customDomain,
      navigation,
      forcedEpisode ? (forcedEpisode.season_number || selectedSeason) : 1,
      forcedEpisode ? forcedEpisode.episode_number : 1,
      0,
      thumb,
      title
    );
  };

  const handlePlay = () => {
    if (details?.media_type === 'tv') {
      triggerPlayback(null, { season_number: selectedSeason, episode_number: 1, name: `Episode 1` });
    } else {
      triggerPlayback(null);
    }
  };

  const handlePlayEpisode = (episode) => {
    triggerPlayback(null, episode);
  };

  const handlePlayProvider = (provider, forcedEpisode = null) => {
    triggerPlayback(provider, forcedEpisode);
  };

  const handleTrailer = () => {
    if (!details?.videos?.results) return;
    const trailer = details.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) {
      Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`);
    }
  };

  if (!visible) return null;

  const title = details?.title || details?.name || mediaItem?.title;
  const year = (details?.release_date || details?.first_air_date || '').split('-')[0];
  const rating = details?.vote_average?.toFixed(1);
  const backdrop = details?.backdrop_path || mediaItem?.backdrop_path;
  const ageRating = getAgeRating(details);
  const durationStr = details?.media_type === 'tv' 
    ? `${details.number_of_seasons} Seasons` 
    : formatRuntime(details?.runtime);
  const hasTrailer = details?.videos?.results?.some(v => v.type === 'Trailer' && v.site === 'YouTube');

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Fixed close button — always at top-right regardless of scroll */}
        <TouchableOpacity
          style={[styles.closeBtnFixed, { top: (insets.top || 16) + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <ScrollView style={styles.scrollview} bounces={false} showsVerticalScrollIndicator={false}>
          {/* Backdrop Header */}
          <View style={styles.header}>
            <Image
              source={{ uri: backdrop ? `${TMDB_IMAGE_ORIGINAL}${backdrop}` : 'https://via.placeholder.com/1280x720/111118' }}
              style={styles.backdropImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)', Colors.bgPrimary]}
              style={styles.backdropGradient}
            />
          </View>

          <View style={styles.contentContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.accentPurple} style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Title */}
                <Text style={styles.title}>{title}</Text>

                {/* Metadata Row */}
                <View style={styles.metaRow}>
                  {rating && (
                    <View style={styles.metaBadge}>
                      <Ionicons name="star" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                      <Text style={styles.metaBadgeText}>{rating}/10</Text>
                    </View>
                  )}
                  {year && (
                    <View style={styles.metaBadge}>
                      <Ionicons name="calendar-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.metaBadgeText}>{year}</Text>
                    </View>
                  )}
                  {durationStr && (
                    <View style={styles.metaBadgeOutline}>
                      <Text style={styles.metaBadgeOutlineText}>{durationStr}</Text>
                    </View>
                  )}
                  {ageRating && (
                    <View style={styles.metaBadgeOutlineRed}>
                      <Text style={styles.metaBadgeOutlineRedText}>{ageRating}</Text>
                    </View>
                  )}
                </View>

                {/* Genres */}
                <View style={styles.genresRow}>
                  {details?.genres?.slice(0, 3).map(g => (
                    <View key={g.id} style={styles.genreBadge}>
                      <Text style={styles.genreText}>{g.name}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
                    <Ionicons name="play" size={20} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.playBtnText}>
                      {details?.media_type === 'tv' ? `Play S${selectedSeason} E1` : 'Play'}
                    </Text>
                  </TouchableOpacity>

                  {hasTrailer && (
                    <TouchableOpacity style={styles.trailerBtn} onPress={handleTrailer}>
                      <Ionicons name="film-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.trailerBtnText}>Trailer</Text>
                    </TouchableOpacity>
                  )}

                  {/* + / ✓ Library button */}
                  <TouchableOpacity
                    style={[styles.iconBtn, inWatchlist && styles.iconBtnActive]}
                    onPress={async () => {
                      const item = {
                        id: details?.id || mediaItem?.id || mediaItem?.tmdbId,
                        tmdbId: details?.id || mediaItem?.tmdbId,
                        title: details?.title || details?.name || mediaItem?.title,
                        media_type: details?.media_type || mediaItem?.mediaType || mediaItem?.media_type || 'movie',
                        poster_path: details?.poster_path || mediaItem?.poster_path,
                        backdrop_path: details?.backdrop_path || mediaItem?.backdrop_path,
                        vote_average: details?.vote_average,
                        overview: details?.overview || mediaItem?.overview,
                        release_date: details?.release_date,
                        first_air_date: details?.first_air_date,
                      };
                      const updated = await toggleWatchlistItem(item);
                      const id = item.id;
                      setInWatchlist(updated?.some(w => String(w.id) === String(id)) || false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={inWatchlist ? 'checkmark' : 'add'}
                      size={24}
                      color={inWatchlist ? Colors.accentPurple : '#fff'}
                    />
                  </TouchableOpacity>
                </View>

                {/* StreamDeck Engine footnote */}
                <Text style={styles.engineFootnote}>Default: StreamDeck Engine</Text>

                {/* Synopsis */}
                <Text style={styles.synopsis}>{details?.overview || mediaItem?.overview}</Text>

                {/* Cast Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cast</Text>
                  {details?.credits?.cast?.length > 0 ? (
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={details.credits.cast.slice(0, 10)}
                      style={{ marginHorizontal: -Spacing.xl }}
                      keyExtractor={item => item.id.toString()}
                      renderItem={({ item }) => (
                        <View style={styles.castItem}>
                          {item.profile_path ? (
                            <Image
                              source={{ uri: `${TMDB_IMAGE_BASE}${item.profile_path}` }}
                              style={styles.castImage}
                            />
                          ) : (
                            <View style={[styles.castImage, styles.castPlaceholder]}>
                              <Ionicons name="person" size={28} color="rgba(255,255,255,0.2)" />
                            </View>
                          )}
                          <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.castCharacter} numberOfLines={1}>{item.character}</Text>
                        </View>
                      )}
                      contentContainerStyle={{ paddingHorizontal: Spacing.xl }}
                    />
                  ) : (
                    /* Default placeholder cast row */
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.xl }} contentContainerStyle={{ paddingHorizontal: Spacing.xl, flexDirection: 'row', gap: 12 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <View key={i} style={styles.castItem}>
                          <View style={[styles.castImage, styles.castPlaceholder]}>
                            <Ionicons name="person" size={28} color="rgba(255,255,255,0.2)" />
                          </View>
                          <Text style={[styles.castName, { color: 'rgba(255,255,255,0.2)' }]}>Unknown</Text>
                          <Text style={[styles.castCharacter, { color: 'rgba(255,255,255,0.12)' }]}>—</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Provider Quick Actions — single horizontal pill row, after synopsis */}
                {availableProviders.filter(p => p.id !== 'direct' && p.id !== 'youtube').length > 0 && (
                  <View style={styles.providersSection}>
                    <View style={styles.providersHeaderRow}>
                      <Text style={styles.providersTitle}>Also stream on:</Text>
                      <View style={styles.defaultToggleRow}>
                        <Text style={styles.defaultToggleText}>Set as default</Text>
                        <Switch
                          value={saveAsDefault}
                          onValueChange={setSaveAsDefault}
                          trackColor={{ false: '#333', true: Colors.accentPurple }}
                          thumbColor={saveAsDefault ? '#fff' : '#aaa'}
                        />
                      </View>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginHorizontal: -Spacing.xl }}
                      contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: 8, flexDirection: 'row', alignItems: 'center' }}
                    >
                      {availableProviders.filter(p => p.id !== 'direct' && p.id !== 'youtube').map(p => (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.providerPill, defaultProviderId === p.id && styles.providerPillActive]}
                          onPress={() => handlePlayProvider(p, details?.media_type === 'tv' ? { season_number: selectedSeason, episode_number: 1, name: `Episode 1` } : null)}
                          activeOpacity={0.75}
                        >
                          {p.logoUrl ? (
                            <Image source={{ uri: p.logoUrl }} style={styles.providerPillLogo} />
                          ) : (
                            <View style={[styles.providerPillIcon, { backgroundColor: p.color }]}>
                              <Ionicons name={p.icon || 'play'} size={14} color="#fff" />
                            </View>
                          )}
                          <Text style={styles.providerPillName} numberOfLines={1}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* TV Show Episodes Section */}
                {details?.media_type === 'tv' && (
                  <View style={styles.section}>
                    <View style={styles.episodesHeader}>
                      <Text style={styles.sectionTitle}>Episodes</Text>
                    </View>
                    <FlatList
                      ref={seasonsListRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 20, marginHorizontal: -Spacing.xl }}
                      contentContainerStyle={{ paddingHorizontal: Spacing.xl }}
                      data={details.seasons?.filter(s => s.season_number > 0) || []}
                      keyExtractor={s => s.season_number.toString()}
                      renderItem={({ item: s, index }) => (
                        <TouchableOpacity
                          style={[
                            styles.seasonTab,
                            selectedSeason === s.season_number && styles.seasonTabActive
                          ]}
                          onPress={() => {
                            setSelectedSeason(s.season_number);
                            loadEpisodes(details.id, s.season_number);
                            seasonsListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                          }}
                        >
                          <Text style={[
                            styles.seasonTabText,
                            selectedSeason === s.season_number && styles.seasonTabTextActive
                          ]}>Season {s.season_number}</Text>
                        </TouchableOpacity>
                      )}
                    />
                    
                    {loadingEpisodes ? (
                      <ActivityIndicator size="small" color={Colors.accentPurple} style={{ marginTop: 20 }} />
                    ) : (
                      <View style={styles.episodesList}>
                        {episodes.map(ep => (
                          <TouchableOpacity 
                            key={ep.id} 
                            style={styles.episodeItem}
                            onPress={() => handlePlayEpisode(ep)}
                          >
                            <Text style={styles.episodeNumber}>{ep.episode_number}</Text>
                            <Image 
                              source={{ uri: ep.still_path ? `${TMDB_IMAGE_BASE}${ep.still_path}` : 'https://via.placeholder.com/250x140/333' }} 
                              style={styles.episodeImage}
                            />
                            <View style={styles.episodeInfo}>
                              <View style={styles.episodeTitleRow}>
                                <Text style={styles.episodeTitle} numberOfLines={1}>{ep.name}</Text>
                                <Text style={styles.episodeRuntime}>{formatRuntime(ep.runtime)}</Text>
                              </View>
                              <Text style={styles.episodeDate}>{ep.air_date}</Text>
                              <Text style={styles.episodePlot} numberOfLines={3}>{ep.overview}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scrollview: {
    flex: 1,
  },
  header: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backdropGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnFixed: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 999,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 10,
    marginTop: -30,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  metaBadgeOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 12,
  },
  metaBadgeOutlineText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  metaBadgeOutlineRed: {
    borderWidth: 1,
    borderColor: 'rgba(226, 29, 72, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 12,
  },
  metaBadgeOutlineRedText: {
    color: '#e21d48',
    fontSize: 11,
    fontWeight: '800',
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  genreBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  playBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  trailerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  trailerBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: Colors.accentPurple,
  },
  providersSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  providersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: 12,
  },
  providersTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  defaultToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultToggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  providerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
    maxWidth: 140,
  },
  providerPillActive: {
    borderColor: Colors.accentPurple,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  providerPillIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerPillLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  providerPillName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  engineFootnote: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: -16,
    marginBottom: 20,
    paddingHorizontal: 2,
    letterSpacing: 0.3,
  },
  synopsis: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  castItem: {
    width: 100,
    marginRight: 12,
  },
  castImage: {
    width: 100,
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
  },
  castName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  castCharacter: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  castPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodesHeader: {
    marginBottom: 8,
  },
  seasonTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  seasonTabActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  seasonTabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  seasonTabTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  episodesList: {
    gap: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  episodeNumber: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 24,
    fontWeight: '800',
    width: 30,
    marginTop: 10,
  },
  episodeImage: {
    width: 130,
    height: 74,
    borderRadius: 6,
    marginRight: 12,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  episodeRuntime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  episodeDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginBottom: 6,
  },
  episodePlot: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  }
});

export default MediaDetailsModal;
