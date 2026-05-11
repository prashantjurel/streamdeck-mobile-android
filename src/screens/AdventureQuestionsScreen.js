import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width} = Dimensions.get('window');

const MOOD_FLOW = {
  initial: {
    id: 'mood',
    text: "How was your day today?",
    options: [
      { id: 'stress', text: "Stressful, I need to laugh and unwind", icon: "cafe-outline", next: 'light' },
      { id: 'boring', text: "A bit boring, I need some excitement!", icon: "flash-outline", next: 'action' },
      { id: 'thought', text: "Great! I'm feeling thoughtful and deep", icon: "bulb-outline", next: 'deep' },
      { id: 'chill', text: "Just chill. Open to anything", icon: "leaf-outline", next: 'any' },
    ]
  },
  light: {
    id: 'light',
    text: "What kind of humor are you in the mood for?",
    options: [
      { text: "Pure silliness and slapstick", genres: [35, 10751], icon: "color-palette-outline" },
      { text: "Smart, witty dialogue", genres: [35, 18], icon: "glasses-outline" },
      { text: "Romantic and feel-good", genres: [35, 10749], icon: "heart-outline" },
      { text: "Animation and wonder", genres: [16, 14], icon: "sparkles-outline" },
    ]
  },
  action: {
    id: 'action',
    text: "Where should the adrenaline take you?",
    options: [
      { text: "A high-stakes heist or crime", genres: [80, 53], icon: "cube-outline" },
      { text: "Saving the world from chaos", genres: [28, 12], icon: "flame-outline" },
      { text: "Deep space or the future", genres: [878, 12], icon: "planet-outline" },
      { text: "A gritty, realistic survival", genres: [53, 12], icon: "compass-outline" },
    ]
  },
  deep: {
    id: 'deep',
    text: "What kind of story do you want to ponder?",
    options: [
      { text: "A powerful human drama", genres: [18], icon: "people-outline" },
      { text: "A fascinating true story", genres: [99, 36], icon: "book-outline" },
      { text: "A dark mystery or puzzle", genres: [9648, 80], icon: "search-outline" },
      { text: "Something artistic and indie", genres: [18, 99], icon: "brush-outline" },
    ]
  },
  any: {
    id: 'any',
    text: "If you could escape right now, where would you go?",
    options: [
      { text: "A far-off galaxy", genres: [878], icon: "rocket-outline" },
      { text: "A magical realm", genres: [14], icon: "color-wand-outline" },
      { text: "A spooky thriller", genres: [27, 53], icon: "skull-outline" },
      { text: "A relaxing romantic trip", genres: [10749], icon: "airplane-outline" },
    ]
  }
};

const AdventureQuestionsScreen = ({navigation, route}) => {
  const { selectedLanguage } = route.params || {};
  const [currentStep, setCurrentStep] = useState('initial');
  const [collectedGenres, setCollectedGenres] = useState([]);

  const handleOptionPress = (opt) => {
    const nextStep = opt.next;
    const newGenres = opt.genres ? [...collectedGenres, ...opt.genres] : collectedGenres;
    
    if (nextStep) {
      setCollectedGenres(newGenres);
      setCurrentStep(nextStep);
    } else {
      // Finished questions
      // Deduplicate genres
      const uniqueGenres = [...new Set(newGenres)];
      
      // PERSIST: Save these as the current adventure prefs so the tab remembers
      const saveAndNavigate = async () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('streamdeck_adventure_prefs', JSON.stringify(uniqueGenres));
          if (selectedLanguage !== undefined) {
            await AsyncStorage.setItem('streamdeck_adventure_lang', selectedLanguage);
          }
          
          navigation.navigate('AdventureMain', { 
            genreIds: uniqueGenres,
            isMoodBased: true,
            selectedLanguage: selectedLanguage
          });
        } catch (e) {
          console.error('[Adventure] Failed to persist mood prefs:', e);
          navigation.navigate('AdventureMain');
        }
      };
      
      saveAndNavigate();
    }
  };

  const currentQ = MOOD_FLOW[currentStep];
  const stepCount = 2; // Fixed 2-step survey
  const progress = currentStep === 'initial' ? 1 : 2;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Step {progress} of {stepCount}</Text>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${(progress / stepCount) * 100}%` }]}
          />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.questionText}>{currentQ.text}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQ.options.map((opt, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={() => handleOptionPress(opt)}
            >
              <View style={styles.optionIconBox}>
                <Ionicons name={opt.icon} size={22} color={Colors.accentPurple} />
              </View>
              <Text style={styles.optionText}>{opt.text}</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.1)" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  progressText: {
    color: Colors.accentPink,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accentPurple,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  questionText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: Spacing.xxl,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  optionText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});

export default AdventureQuestionsScreen;
