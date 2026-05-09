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

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const saved = await AsyncStorage.getItem('streamdeck_adventure_prefs');
      if (saved) setSelectedIds(JSON.parse(saved));
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
        // If 0 selections, navigate to questions screen
        navigation.navigate('AdventureQuestions');
        return;
      }
      
      await AsyncStorage.setItem(
        'streamdeck_adventure_prefs',
        JSON.stringify(selectedIds),
      );
      navigation.replace('AdventureMain');
    } catch (e) {}
  };

  // Animation for the rotating glow border
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

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
          <Text style={styles.title}>Select your Categories</Text>
          <Text style={styles.subtitle}>
            Pick what interests you to personalize your discovery feed.
          </Text>
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
                {isSelected && (
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.05)']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={[styles.catIconBox, isSelected && styles.catIconBoxActive]}>
                  <Ionicons 
                    name={cat.icon} 
                    size={20} 
                    color={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} 
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

      {/* Premium Floating Action Bar */}
      <View style={[styles.floatingBottomBar, { bottom: insets.bottom + 140 }]}>
        <View style={styles.actionRow}>
          {/* Secondary Action: Select All */}
          <TouchableOpacity 
            style={[
              styles.styleButton, 
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
              {selectedIds.length === MOVIE_GENRES.length ? 'Clear' : 'All'}
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
    paddingBottom: 240, 
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catCard: {
    width: COLUMN_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 10,
    height: 52, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  catCardSelected: {
    borderColor: 'rgba(139, 92, 246, 0.5)',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
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
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.1,
  },
  catNameActive: {
    color: '#fff',
    fontWeight: '800',
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
  floatingBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  styleButton: {
    flexDirection: 'row',
    alignItems: 'center', // Vertical center
    justifyContent: 'center', // Horizontal center
    backgroundColor: 'rgba(25, 25, 30, 0.95)',
    height: 46, // Standardized height
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
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
