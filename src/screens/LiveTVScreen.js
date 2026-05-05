// StreamDeck Mobile — Live TV Screen
import React, {useState} from 'react';
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
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import SectionHeader from '../components/SectionHeader';
import { loadSettings } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { fetchLiveSportsData } from '../services/sports';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const SPORT_CATEGORIES = [
  {id: 'all', name: 'All Sports', icon: '🏆'},
  {id: 'cricket', name: 'Cricket', icon: '🏏'},
  {id: 'football', name: 'Football', icon: '⚽'},
  {id: 'f1', name: 'F1 Racing', icon: '🏎️'},
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
        />

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}>
          {SPORT_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.7}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.id && styles.categoryTextActive,
                ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

        {/* Quick Access Section */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
          <View style={styles.quickGrid}>
            {[
              {name: 'IPL Live', icon: '🏏', url: 'https://www.hotstar.com', color: '#1F74DB'},
              {name: 'Football', icon: '⚽', url: 'https://sportslivetoday.com', color: '#38003C'},
              {name: 'F1 Live', icon: '🏎️', url: 'https://fancode.com', color: '#E10600'},
              {name: 'Others', icon: '🌍', url: 'https://fmhy.net/video#live-tv', color: '#8B5CF6'},
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.quickCard, {borderColor: item.color + '40'}]}
                onPress={() => handleQuickAccessPress(item)}
                activeOpacity={0.7}>
                <Text style={styles.quickIcon}>{item.icon}</Text>
                <Text style={styles.quickName}>{item.name}</Text>
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
  categoryScroll: {
    marginBottom: Spacing.lg,
  },
  categoryContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 6,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.accentPurple + '20',
    borderColor: Colors.accentPurple + '60',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: Colors.accentPurple,
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
    width: 240,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
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
    marginTop: Spacing.xxl,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  quickCard: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md) / 2,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickIcon: {
    fontSize: 32,
  },
  quickName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
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
});

export default LiveTVScreen;
