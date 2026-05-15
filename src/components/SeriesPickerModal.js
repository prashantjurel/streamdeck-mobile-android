// StreamDeck Mobile — Series & Episode Picker Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Colors, Spacing } from '../theme/colors';
import { fetchTVDetails, fetchTVSeasonDetails } from '../services/tmdb';

const SeriesPickerModal = ({ 
  visible, 
  onClose, 
  item, 
  onSelectEpisode,
  continueWatching = []
}) => {
  const [isFetching, setIsFetching] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [seasonCache, setSeasonCache] = useState({}); // Cache to make season switching instant

  useEffect(() => {
    if (visible && item?.tmdbId) {
      loadSeriesDetails();
    } else if (!visible) {
      // Reset state when closing to avoid ghosting
      setSeasons([]);
      setSelectedSeason(null);
      setEpisodes([]);
      setSearchQuery('');
    }
  }, [visible, item?.tmdbId]);

  const loadSeriesDetails = async () => {
    if (isFetching) return;
    setIsFetching(true);
    try {
      console.log('[SeriesPicker] Fetching details for ID:', item.tmdbId);
      const details = await fetchTVDetails(item.tmdbId);
      
      if (!details) {
        console.error('[SeriesPicker] No details returned from TMDB');
        setIsFetching(false);
        return;
      }

      let allSeasons = details.seasons || [];
      
      // If seasons are missing but we know they exist, it might be a weird TMDB response
      if (allSeasons.length === 0 && details.number_of_seasons > 0) {
        console.warn('[SeriesPicker] Seasons array empty but number_of_seasons > 0. Retrying...');
      }

      const validSeasons = allSeasons
        .filter(s => s && typeof s.season_number === 'number' && s.season_number >= 0 && s.episode_count > 0)
        .sort((a, b) => {
          // Move Season 0 to the end
          if (a.season_number === 0) return 1;
          if (b.season_number === 0) return -1;
          return a.season_number - b.season_number;
        });
      
      console.log('[SeriesPicker] Found valid seasons:', validSeasons.length);
      setSeasons(validSeasons);
      
      // Auto-select FIRST season ONLY if nothing is selected yet
      if (!selectedSeason && validSeasons.length > 0) {
        const firstSeason = validSeasons[0];
        console.log('[SeriesPicker] Initial auto-select (ascending):', firstSeason.season_number);
        await handleSelectSeason(firstSeason, validSeasons);
      }
    } catch (err) {
      console.error('[SeriesPicker] loadSeriesDetails exception:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSelectSeason = async (season, currentSeasons) => {
    // Check cache first for instant switching
    if (seasonCache[season.id]) {
      console.log(`[SeriesPicker] Using cache for season ${season.season_number}`);
      setSelectedSeason(season);
      setEpisodes(seasonCache[season.id]);
      return;
    }

    setSelectedSeason(season);
    setIsFetching(true);
    try {
      const seasonData = await fetchTVSeasonDetails(item.tmdbId, season.season_number);
      
      const newEpisodes = seasonData?.episodes || [];
      console.log(`[SeriesPicker] Loaded ${newEpisodes.length} episodes for season ${season.season_number}`);
      
      // Update cache
      setSeasonCache(prev => ({
        ...prev,
        [season.id]: newEpisodes
      }));
      
      setEpisodes(newEpisodes);
    } catch (err) {
      console.error('[SeriesPicker] Failed to load episodes:', err);
      setEpisodes([]);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalDismissZone} 
          onPress={onClose} 
          activeOpacity={1} 
        />
        <Animated.View 
          entering={FadeInDown.duration(300)}
          exiting={FadeOutDown.duration(200)}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 4, height: 18, backgroundColor: Colors.accentPink, borderRadius: 2, marginRight: 10 }} />
              <Text style={styles.modalTitle}>Episodes</Text>
            </View>
            <Text style={styles.modalSubtitle} numberOfLines={1}>{item?.name}</Text>
          </View>

          {/* Season Selection (Horizontal Chips) */}
          <View style={styles.seasonChipsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seasonChipsContent}
            >
              {seasons.map((s, idx) => {
                const isSelected = selectedSeason?.season_number === s.season_number;
                return (
                  <TouchableOpacity
                    key={`season-chip-${s.id || s.season_number || idx}`}
                    onPress={() => {
                      console.log('[SeriesPicker] Selected season:', s.season_number);
                      handleSelectSeason(s, seasons);
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.seasonChip}
                      >
                        <Text style={styles.seasonChipTextActive}>Season {s.season_number}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.seasonChip}>
                        <Text style={styles.seasonChipText}>Season {s.season_number}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Search & Sort Controls */}
          <View style={styles.episodeControls}>
            <View style={styles.episodeSearchBox}>
              <Ionicons name="search" size={14} color="rgba(255,255,255,0.3)" />
              <TextInput
                style={styles.episodeSearchInput}
                placeholder="Search episode..."
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity 
              style={styles.sortToggle}
              onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              <Ionicons 
                name={sortOrder === 'desc' ? "trending-down" : "trending-up"} 
                size={16} 
                color={Colors.accentPink} 
              />
            </TouchableOpacity>
          </View>

          {/* Episode List Area */}
          <View style={{ flex: 1 }}>
            {isFetching ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.accentPink} />
                <Text style={styles.modalLoadingText}>Loading episodes...</Text>
              </View>
            ) : (
              <FlatList
                data={(episodes || [])
                  .filter(ep => 
                    ep.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    `episode ${ep.episode_number}`.includes(searchQuery.toLowerCase())
                  )
                  .sort((a, b) => {
                    if (sortOrder === 'desc') return b.episode_number - a.episode_number;
                    return a.episode_number - b.episode_number;
                  })}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20 }}
                ListHeaderComponent={() => <Text style={styles.providerCategoryTitle}>ALL EPISODES</Text>}
                ListEmptyComponent={() => (
                  <View style={styles.emptyEpisodesContainer}>
                    <Ionicons name="alert-circle-outline" size={32} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyEpisodesText}>No episodes found for this season.</Text>
                  </View>
                )}
                renderItem={({ item: episode }) => {
                  const epThumb = episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : null;
                  const isCurrentlyWatching = continueWatching.find(cw => 
                    cw.tmdbId === item?.tmdbId && 
                    cw.season === selectedSeason?.season_number && 
                    cw.episode === episode.episode_number
                  );
                  
                  return (
                    <TouchableOpacity
                      key={episode.id}
                      style={[styles.episodeCard, isCurrentlyWatching && styles.episodeCardActive]}
                      onPress={() => onSelectEpisode(episode, selectedSeason)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.epThumbContainer}>
                        {epThumb ? (
                          <Image source={{ uri: epThumb }} style={styles.epThumb} />
                        ) : (
                          <View style={[styles.epThumb, { backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.1)" />
                          </View>
                        )}
                        <View style={styles.epBadge}>
                          <Text style={styles.epBadgeText}>{episode.episode_number}</Text>
                        </View>
                        {isCurrentlyWatching && (
                          <View style={styles.nowWatchingBadge}>
                            <Text style={styles.nowWatchingText}>WATCHING</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.epInfo}>
                        <Text style={styles.epTitle} numberOfLines={1}>{episode.name}</Text>
                        <View style={styles.epMetaRow}>
                          {episode.runtime ? (
                            <Text style={styles.epMeta}>{episode.runtime} min</Text>
                          ) : null}
                          {episode.air_date ? (
                            <Text style={styles.epMeta}> • {new Date(episode.air_date).getFullYear()}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.epOverview} numberOfLines={2}>
                          {episode.overview || 'No description available for this episode.'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          <TouchableOpacity style={styles.closeModalBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeModalText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissZone: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 32,
    height: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'visible', // CRITICAL: Prevents clipping of absolute children on Android
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.accentPink,
    borderRadius: 2,
    marginBottom: 20,
    opacity: 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    marginTop: 4,
  },
  episodeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  episodeSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 40,
    gap: 8,
  },
  episodeSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    paddingVertical: 0,
  },
  sortToggle: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerCategoryTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  epThumbContainer: {
    width: 100,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  epThumb: {
    width: '100%',
    height: '100%',
  },
  epBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  epInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  epTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  epMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  epMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  epOverview: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 15,
  },
  episodeCardActive: {
    backgroundColor: 'rgba(157, 78, 221, 0.05)',
    borderColor: 'rgba(157, 78, 221, 0.2)',
    borderWidth: 1.5,
  },
  nowWatchingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.accentPink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nowWatchingText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 12,
  },
  closeModalBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.accentPink,
    letterSpacing: 0.5,
  },
  // Season Chip Styles
  seasonChipsContainer: {
    marginBottom: 20,
  },
  seasonChipsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  seasonChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  seasonChipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '700',
  },
  seasonChipTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyEpisodesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    opacity: 0.5,
  },
  emptyEpisodesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  }
});

export default SeriesPickerModal;
