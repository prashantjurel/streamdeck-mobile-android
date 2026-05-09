// StreamDeck Mobile — Live TV Screen
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  Linking,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import SectionHeader from '../components/SectionHeader';
import { loadSettings } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { fetchLiveSportsData } from '../services/sports';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const SPORT_CATEGORIES = [
  {id: 'all', name: 'All Sports', icon: 'grid-outline'},
  {id: 'cricket', name: 'Cricket', icon: 'cricket', iconType: 'MCI'},
  {id: 'football', name: 'Football', icon: 'football-outline'},
  {id: 'f1', name: 'F1 Racing', icon: 'speedometer-outline'},
];

const PROVIDER_CONFIG = {
  'IPL Live': [
    { id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: '⭐' }
  ],
  'Football': [
    { id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: '⭐' }
  ],
  'F1 Live': [
    { id: 'fancode', name: 'FanCode', appScheme: 'fancode://', url: 'https://fancode.com', color: '#FF6B35', icon: '⚽' }
  ]
};

const LiveTVScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedQuickItem, setSelectedQuickItem] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [customProviders, setCustomProviders] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // Reanimated Hooks (Must be stable at the top)
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Fetch custom providers from settings whenever this screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings().then(settings => {
        setCustomProviders(settings.liveSportsProviders || []);
      });
      
      const loadMatches = async () => {
        setLoadingMatches(true);
        const matches = await fetchLiveSportsData();
        setLiveMatches(matches);
        setLoadingMatches(false);
      };
      
      loadMatches();
    }, [])
  );

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  const getCustomProviderAppearance = (name, url) => {
    const text = (name + url).toLowerCase();
    
    let icon = '⚡'; // Default
    if (text.includes('cric')) icon = '🏏';
    else if (text.includes('foot') || text.includes('soccer')) icon = '⚽';
    else if (text.includes('f1') || text.includes('race')) icon = '🏎️';
    else if (text.includes('sport')) icon = '🏟️';
    else if (text.includes('tv') || text.includes('stream') || text.includes('watch')) icon = '📺';
    else if (text.includes('live')) icon = '🔴';
    else if (text.includes('play')) icon = '▶️';
    else if (text.includes('flix') || text.includes('movie')) icon = '🍿';
    
    // Generate a consistent pseudo-random vibrant color based on the name string
    const colors = [
      '#FF3366', '#8B5CF6', '#3B82F6', '#10B981', 
      '#F59E0B', '#EC4899', '#14B8A6', '#6366F1'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    
    return { icon, color: colors[colorIndex] };
  };

  const handleQuickAccessPress = (item) => {
    setSelectedQuickItem(item);
    
    const nativeProviders = PROVIDER_CONFIG[item.name] || [];
    
    // Map user's custom providers to the provider schema with dynamic aesthetics
    const formattedCustomProviders = customProviders.map((p, idx) => {
      const appearance = getCustomProviderAppearance(p.name, p.url);
      return {
        id: `custom_${idx}`,
        name: p.name,
        url: p.url,
        color: appearance.color,
        icon: appearance.icon,
      };
    });

    setAvailableProviders([...nativeProviders, ...formattedCustomProviders]);
    setShowPicker(true);
  };

  const handleSelectProvider = async (provider) => {
    setShowPicker(false);
    
    if (provider.appScheme) {
      try {
        const canOpen = await Linking.canOpenURL(provider.appScheme);
        if (canOpen) {
          await Linking.openURL(provider.appScheme);
          return;
        }
      } catch (e) {
        console.warn(`[LiveTV] Could not open native app for ${provider.id}:`, e);
      }
    }

    // Fallback to WebView
    let finalUrl = provider.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    navigation.navigate('WebView', {
      url: finalUrl,
      title: `${selectedQuickItem.name} on ${provider.name}`,
      appId: provider.id,
      color: provider.color,
    });
  };

  const RenderMatchCard = ({ match }) => {
    const [img1Error, setImg1Error] = useState(false);
    const [img2Error, setImg2Error] = useState(false);

    return (
      <TouchableOpacity
        style={styles.matchCard}
        activeOpacity={0.8}
        onPress={() => handleQuickAccessPress({ name: match.quickAccessName })}
      >
        <View style={styles.matchThumbContainer}>
          <Image 
            source={{ 
              uri: match.type === 'f1' 
                ? 'https://images.pexels.com/photos/36920232/pexels-photo-36920232.jpeg?auto=compress&cs=tinysrgb&w=1200'
                : match.type === 'football'
                ? 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=800'
                : 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800'
            }} 
            style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} 
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 }]} />
          
          {match.type === 'f1' ? null : match.logo1 && match.logo2 ? (
            <View style={styles.splitThumb}>
              <View style={styles.teamSide}>
                {!img1Error ? (
                  <Image 
                    source={{ uri: match.logo1 }} 
                    style={{ width: 40, height: 40 }} 
                    resizeMode="contain" 
                    onError={() => setImg1Error(true)}
                  />
                ) : (
                  <Text style={styles.teamFallbackIcon}>
                    {match.type === 'football' ? '⚽' : match.type === 'cricket' ? '🏏' : '🏁'}
                  </Text>
                )}
              </View>
              <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
              <View style={styles.teamSide}>
                {!img2Error ? (
                  <Image 
                    source={{ uri: match.logo2 }} 
                    style={{ width: 40, height: 40 }} 
                    resizeMode="contain" 
                    onError={() => setImg2Error(true)}
                  />
                ) : (
                  <Text style={styles.teamFallbackIcon}>
                    {match.type === 'football' ? '⚽' : match.type === 'cricket' ? '🏏' : '🏁'}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.genericThumb}>
              <Text style={styles.genericIcon}>
                {match.type === 'football' ? '⚽' : match.type === 'cricket' ? '🏏' : '🏁'}
              </Text>
            </View>
          )}

          {match.status === 'LIVE' && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {match.status === 'soon' && (
            <View style={[styles.liveBadge, {backgroundColor: Colors.accentPurple}]}>
              <Text style={styles.liveBadgeText}>SOON</Text>
            </View>
          )}
        </View>

        <View style={styles.matchInfo}>
          <Text style={styles.matchTitle} numberOfLines={2}>{match.title}</Text>
          <Text style={[styles.matchTime, match.status === 'LIVE' && {color: '#10b981'}]}>
            {match.time}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop: topPadding}}
      >
        <View style={{height: Spacing.md}} />

        <SectionHeader
          title="Live TV"
          subtitle="Watch live sports and TV channels"
          rightAction={
            <TouchableOpacity 
              onPress={() => navigation.navigate('SourceManager', { type: 'sports' })}
              style={styles.headerPillAction}
            >
              <Ionicons name="add" size={16} color={Colors.textPrimary} style={{marginRight: 4}} />
              <Text style={styles.headerActionText}>Sources</Text>
            </TouchableOpacity>
          }
        />

        {/* Category Filter — Dynamic Glow Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContent}>
            {SPORT_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryChipContainer}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.categoryChip, isSelected && styles.categoryChipActive]}>
                    {isSelected && (
                      <Animated.View style={[styles.glowBorder, glowAnimatedStyle]}>
                        <LinearGradient
                          colors={[Colors.accentPink, 'transparent', Colors.accentPink, 'transparent', Colors.accentPink]}
                          style={{ flex: 1 }}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                      </Animated.View>
                    )}
                    <View style={[styles.categoryChipInner, isSelected && styles.categoryChipInnerActive]}>
                    {cat.iconType === 'MCI' ? (
                      <MaterialCommunityIcons 
                        name={cat.icon} 
                        size={18} 
                        color={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} 
                        style={{ marginRight: 6 }} 
                      />
                    ) : (
                      <Ionicons 
                        name={cat.icon} 
                        size={16} 
                        color={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} 
                        style={{ marginRight: 6 }} 
                      />
                    )}
                      <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                        {cat.name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Live Matches Section */}
        <View style={styles.liveMatchesSection}>
          <Text style={styles.sectionLabel}>LIVE MATCHES</Text>
          {loadingMatches ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Fetching live matches...</Text>
            </View>
          ) : liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status === 'LIVE').length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>No live matches right now.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchesScrollContent}
            >
              {liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status === 'LIVE').map((match) => (
                <RenderMatchCard key={match.id} match={match} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Upcoming Matches Section */}
        <View style={styles.liveMatchesSection}>
          <Text style={styles.sectionLabel}>UPCOMING MATCHES</Text>
          {loadingMatches ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Fetching schedules...</Text>
            </View>
          ) : liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status !== 'LIVE').length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>No upcoming matches found.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchesScrollContent}
            >
              {liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status !== 'LIVE').map((match) => (
                <RenderMatchCard key={match.id} match={match} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Premium Access Section */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionLabel}>PREMIUM ACCESS</Text>
          <View style={styles.premiumGrid}>
            {[
              {name: 'Cricket', icon: 'cricket', iconType: 'MCI', color: '#1F74DB'},
              {name: 'Football', icon: 'football-outline', color: '#3B82F6'},
              {name: 'F1 Live', icon: 'speedometer-outline', color: '#E10600'},
              {name: 'Others', icon: 'globe-outline', color: '#8B5CF6'},
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.premiumCard}
                onPress={() => handleQuickAccessPress(item)}
                activeOpacity={0.8}>
                <View style={[styles.premiumIconBox, {backgroundColor: item.color + '15'}]}>
                  {item.iconType === 'MCI' ? (
                    <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  )}
                </View>
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumName}>{item.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{height: 120}} />
      </ScrollView>

      {/* Smart Provider Selection Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{flex: 1}} onPress={() => setShowPicker(false)} />
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Available On</Text>
                <Text style={styles.modalSubtitle}>Select where to stream {selectedQuickItem?.name}</Text>
             </View>
             
             <View style={styles.providerGrid}>
                {availableProviders.map(provider => (
                  <TouchableOpacity 
                    key={provider.id} 
                    style={styles.providerItem}
                    onPress={() => handleSelectProvider(provider)}
                  >
                    <View style={[styles.providerIconBox, {backgroundColor: provider.color}]}>
                      <Text style={styles.providerIconText}>{provider.icon}</Text>
                    </View>
                    <Text style={styles.providerName}>{provider.name}</Text>
                  </TouchableOpacity>
                ))}
             </View>

             <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowPicker(false)}>
                <Text style={styles.closeModalText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  tabContainer: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  tabContent: {
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  categoryChipContainer: {
    marginRight: 4,
  },
  categoryChip: {
    padding: 1.5,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipActive: {
    backgroundColor: '#000',
    borderColor: Colors.accentPink + '40',
    shadowColor: Colors.accentPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  categoryChipInnerActive: {
    backgroundColor: '#000',
  },
  glowBorder: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: -75,
    left: -50,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  liveMatchesSection: {
    marginTop: Spacing.lg,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  matchesScrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  matchCard: {
    width: 260,
    backgroundColor: 'rgba(25, 25, 30, 0.9)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  matchThumbContainer: {
    height: 120,
    backgroundColor: '#161622',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitThumb: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  teamSide: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    // Added shadow and border for premium feel
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  teamFallbackIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  vsCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#161622',
  },
  vsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  genericThumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genericIcon: {
    fontSize: 32,
  },
  f1Thumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(225,6,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  f1Icon: {
    fontSize: 32,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  matchInfo: {
    padding: Spacing.md,
  },
  matchTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    marginBottom: 4,
  },
  matchTime: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  quickAccessSection: {
    marginTop: Spacing.xl,
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  premiumCard: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - 10) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 30, 0.95)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  premiumIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  premiumInfo: {
    flex: 1,
  },
  premiumName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.1,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#12121A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: Spacing.xl,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 },
  providerItem: { width: '28%', alignItems: 'center', marginBottom: Spacing.lg },
  providerIconBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  providerIconText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  providerName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  closeModalBtn: {
    marginTop: 10,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
  },
  closeModalText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  headerPillAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 20, 0.98)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
  },
  headerActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default LiveTVScreen;
