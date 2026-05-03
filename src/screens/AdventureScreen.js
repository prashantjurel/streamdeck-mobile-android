import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Linking,
  TouchableOpacity,
  Alert
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {useFocusEffect} from '@react-navigation/native';
import {fetchDiscoveryContent, ADVENTURE_CATEGORIES} from '../services/discovery';
import AdventureStack from '../components/AdventureStack';
import LinearGradient from 'react-native-linear-gradient';

const SAVED_ADVENTURES_KEY = 'streamdeck_mobile_adventure_saved';

const AdventureScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(null);
  const stackRef = useRef(null);

  // Check preferences every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkPrefs();
    }, [])
  );

  const checkPrefs = async () => {
    try {
      const saved = await AsyncStorage.getItem('streamdeck_adventure_prefs');
      if (!saved) {
        // Force onboarding
        navigation.navigate('AdventurePreferences');
      } else {
        const parsedPrefs = JSON.parse(saved);
        setPrefs(parsedPrefs);
        
        // If we have no cards or prefs changed, reload
        if (cards.length === 0) {
          loadContent(parsedPrefs);
        }
      }
    } catch (e) {
      navigation.navigate('AdventurePreferences');
    }
  };

  const loadContent = async (currentPrefs) => {
    setLoading(true);
    try {
      const selectedIds = currentPrefs || prefs;
      const data = await fetchDiscoveryContent(selectedIds);
      if (data && data.length > 0) {
        setCards((prev) => [...prev, ...data]);
      }
    } catch (e) {
      console.error('[Adventure] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeRight = async (card) => {
    console.log('[Adventure] Saved:', card.title);
    try {
      const saved = await AsyncStorage.getItem(SAVED_ADVENTURES_KEY);
      const list = saved ? JSON.parse(saved) : [];
      if (!list.find(a => a.url === card.url)) {
        list.unshift(card);
        await AsyncStorage.setItem(SAVED_ADVENTURES_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.error('[Adventure] Save failed:', e);
    }
  };

  const handleSwipeUp = async (card) => {
    // Always use the internal WebView to keep the user inside the app
    navigation.navigate('WebView', {
      url: card.url,
      title: card.title,
      isAdventure: true,
      cards: cards,
      initialIndex: currentIndex,
      onUpdateIndex: (newIndex) => {
        setCurrentIndex(newIndex);
      }
    });
  };

  const handleSwipeLeft = (card) => {
    // If cards running low, fetch more
    if (cards.length - currentIndex < 5) {
      loadContent(prefs);
    }
  };

  return (
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      
      <View style={[styles.header, {paddingTop: (insets.top || StatusBar.currentHeight || 0) + Spacing.md}]}>
        <Text style={styles.title}>Adventure</Text>
        <View style={styles.badgeRow}>
           <Text style={styles.subtitle}>Discovery Feed</Text>
           {prefs && (
             <TouchableOpacity onPress={() => navigation.navigate('AdventurePreferences')}>
               <Text style={styles.editPrefs}>Change Interests</Text>
             </TouchableOpacity>
           )}
        </View>
      </View>
      
      <View style={styles.container}>
        {loading && cards.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.accentPurple} />
            <Text style={styles.loadingText}>Curating your feed...</Text>
          </View>
        ) : (
          <AdventureStack 
            ref={stackRef}
            data={cards} 
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            onSwipeLeft={handleSwipeLeft} 
            onSwipeRight={handleSwipeRight}
            onSwipeUp={handleSwipeUp}
          />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.btn, styles.skipBtn]} 
          onPress={() => stackRef.current?.swipeLeft()}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => stackRef.current?.swipeUp()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[styles.btn, styles.exploreBtn]}
          >
            <Text style={[styles.btnText, {color: '#fff'}]}>Explore Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.saveBtn]} 
          onPress={() => stackRef.current?.swipeRight()}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.accentPink,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editPrefs: {
    fontSize: 12,
    color: Colors.accentPurple,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  container: {
    flex: 1,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textMuted,
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100, // Explicitly push above the 80px tab bar
    gap: 10,
  },
  btn: {
    height: 54,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skipBtn: {
    flex: 1,
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  exploreBtn: {
    minWidth: 140,
    borderWidth: 0,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
});

export default AdventureScreen;
