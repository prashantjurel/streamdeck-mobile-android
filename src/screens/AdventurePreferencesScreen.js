// StreamDeck Mobile — Adventure Preferences Screen
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {MOVIE_GENRES} from '../services/movieAdventure';

import Ionicons from 'react-native-vector-icons/Ionicons';

const {width} = Dimensions.get('window');
const COLUMN_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

const AdventurePreferencesScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('global'); // Default to Global
  const rotation = useSharedValue(0);

  const LANGUAGES = [
    { id: 'global', name: 'Global', icon: 'earth' },
    { id: 'IN', name: 'Indian', icon: 'star' },
  ];

  useEffect(() => {
    loadPrefs();
  }, []);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const loadPrefs = async () => {
    try {
      const saved = await AsyncStorage.getItem('streamdeck_adventure_prefs');
      if (saved) setSelectedIds(JSON.parse(saved));
      
      const savedLang = await AsyncStorage.getItem('streamdeck_adventure_lang');
      if (savedLang === 'IN' || savedLang === 'global') {
        setSelectedLanguage(savedLang);
      } else {
        // Reset stale/empty IDs to the new global standard
        setSelectedLanguage('global');
      }
    } catch (e) {}
  };

  const toggleCategory = id => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === MOVIE_GENRES.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(MOVIE_GENRES.map(c => c.id));
    }
  };

  const handleStart = async () => {
    try {
      if (selectedIds.length === 0) {
        // If 0 selections, navigate to questions screen with the current vibe
        navigation.navigate('AdventureQuestions', { selectedLanguage });
        return;
      }
      
      await AsyncStorage.setItem(
        'streamdeck_adventure_prefs',
        JSON.stringify(selectedIds),
      );
      await AsyncStorage.setItem(
        'streamdeck_adventure_lang',
        selectedLanguage,
      );
      navigation.navigate('AdventureMain', { 
        genreIds: selectedIds,
        selectedLanguage: selectedLanguage,
        isMoodBased: true // Trigger immediate refresh with new vibe
      });
    } catch (e) {}
  };

  // Removed duplicate hook from here to stabilize order at top


  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Safe area handling
  const topPadding = insets.top || StatusBar.currentHeight || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, {paddingTop: topPadding + Spacing.xl}]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tune Your Discovery</Text>
          <Text style={styles.subtitle}>
            Pick what interests you to personalize your discovery feed.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Content Vibe</Text>
        </View>
        <View style={styles.vibeGrid}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity 
              key={lang.id} 
              onPress={() => setSelectedLanguage(lang.id)}
              style={[styles.vibeItem, selectedLanguage === lang.id && styles.vibeItemActive]}
            >
              <Ionicons 
                name={lang.icon} 
                size={18} 
                color={selectedLanguage === lang.id ? '#fff' : 'rgba(255,255,255,0.4)'} 
              />
              <Text style={[styles.vibeText, selectedLanguage === lang.id && styles.vibeTextActive]}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>

        <View style={styles.grid}>
          {MOVIE_GENRES.map(cat => {
            const isSelected = selectedIds.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.8}
                onPress={() => toggleCategory(cat.id)}
                style={[
                  styles.catCard,
                  isSelected && styles.catCardSelected,
                ]}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.8)', 'rgba(217, 70, 239, 0.8)']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                )}
                <View style={[styles.catIconBox, isSelected && styles.catIconBoxActive]}>
                  <Ionicons 
                    name={cat.icon} 
                    size={20} 
                    color={isSelected ? '#fff' : 'rgba(255,255,255,0.6)'} 
                  />
                </View>
                <View style={styles.catInfo}>
                  <Text style={[styles.catName, isSelected && styles.catNameActive]}>
                    {cat.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Premium Sticky Footer */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 85 }]}>
        <View style={styles.actionRow}>
          {/* Secondary Action: Select All */}
          <TouchableOpacity 
            style={[
              styles.styleButton, 
              { flex: 1 },
              selectedIds.length === MOVIE_GENRES.length && styles.styleButtonActive
            ]} 
            onPress={toggleAll}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={selectedIds.length === MOVIE_GENRES.length ? 'close-circle-outline' : 'infinite-outline'} 
              size={20} 
              color={selectedIds.length === MOVIE_GENRES.length ? '#fff' : 'rgba(255, 255, 255, 0.6)'} 
            />
            <Text style={[
              styles.styleButtonText,
              selectedIds.length === MOVIE_GENRES.length && styles.styleButtonTextActive
            ]}>
              {selectedIds.length === MOVIE_GENRES.length ? 'Clear' : 'Select All'}
            </Text>
          </TouchableOpacity>

          {/* Primary Action: Questions/Explore */}
          <TouchableOpacity 
            style={[
              styles.styleButton, 
              styles.primaryButtonActive,
              { flex: 1 } 
            ]} 
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons 
              name={selectedIds.length === 0 ? 'sparkles' : 'compass-outline'} 
              size={18} 
              color="#fff" 
            />
            <Text style={[styles.styleButtonText, styles.styleButtonTextActive]}>
              {selectedIds.length === 0 
                ? 'Help Me Choose' 
                : selectedIds.length === MOVIE_GENRES.length
                  ? 'Start Adventure'
                  : `Adventure (${selectedIds.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl, // Normalized
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 22,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.accentPink,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  vibeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  vibeItem: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  vibeItemActive: {
    backgroundColor: Colors.accentPurple,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  vibeText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  vibeTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catCard: {
    width: COLUMN_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 10,
    height: 54, 
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  catCardSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#8b5cf6',
    elevation: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  catIconBox: {
    width: 34,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  catIconBoxActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#a78bfa',
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  catNameActive: {
    color: '#fff',
    fontWeight: '900',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
  },
  stickyFooter: {
    backgroundColor: 'rgba(10, 10, 15, 0.98)',
    paddingHorizontal: Spacing.xl,
    paddingTop: 15,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  styleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 40, 50, 0.95)', // Darker, more solid
    height: 56, // Proportional impact
    paddingHorizontal: 15,
    borderRadius: 18,
    gap: 8,
    borderWidth: 2, // Thicker for visibility marker
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  styleButtonActive: {
    borderColor: 'rgba(139, 92, 246, 0.4)',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  primaryButtonActive: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  styleButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    includeFontPadding: false, // Prevents Android-specific vertical shift
    textAlignVertical: 'center', // Centers text vertically
  },
  styleButtonTextActive: {
    color: '#fff',
  },
});

export default AdventurePreferencesScreen;
