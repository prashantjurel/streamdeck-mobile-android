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
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {MOVIE_GENRES} from '../services/movieAdventure';

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
      navigation.navigate('AdventureMain');
    } catch (e) {}
  };

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
          {MOVIE_GENRES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.7}
              onPress={() => toggleCategory(cat.id)}
              style={[
                styles.catCard,
                selectedIds.includes(cat.id) && styles.catCardSelected,
              ]}>
              <View style={styles.catEmojiBox}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                <View style={styles.checkRow}>
                   <View style={[styles.checkbox, selectedIds.includes(cat.id) && styles.checkboxSelected]}>
                     {selectedIds.includes(cat.id) && <Text style={styles.checkIcon}>✓</Text>}
                   </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Premium Floating Action Bar */}
      <View style={[styles.floatingBottomBar, { bottom: insets.bottom + 80 }]}>
        <View style={styles.bottomBarContent}>
          <TouchableOpacity 
            style={styles.secondaryActionBtn} 
            onPress={toggleAll}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryActionText}>
              {selectedIds.length === MOVIE_GENRES.length ? 'Clear Selection' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.primaryActionBtn} 
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedIds.length === 0 ? ['#F59E0B', '#EF4444'] : ['#8B5CF6', '#D946EF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.primaryGradient}
            >
            <Text style={styles.primaryActionText}>
              {selectedIds.length === MOVIE_GENRES.length 
                ? 'Mix Everything! 🍿' 
                : selectedIds.length > 0 
                  ? `Explore ${selectedIds.length} Genres` 
                  : 'Ask Me Questions 🤔'}
            </Text>
            </LinearGradient>
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
    paddingBottom: 280, // Massive padding to ensure categories aren't hidden behind buttons
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catCard: {
    width: COLUMN_WIDTH,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catCardSelected: {
    borderColor: Colors.accentPurple,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  catEmojiBox: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catEmoji: {
    fontSize: 24,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  checkRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.accentPurple,
    borderColor: Colors.accentPurple,
  },
  checkIcon: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  floatingBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  secondaryActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryActionBtn: {
    minWidth: 160,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

export default AdventurePreferencesScreen;
