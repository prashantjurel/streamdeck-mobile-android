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

const {width} = Dimensions.get('window');

const MOOD_FLOW = {
  initial: {
    id: 'mood',
    text: "How was your day today?",
    options: [
      { id: 'stress', text: "Stressful, I need to laugh and unwind", emoji: "😅", next: 'light' },
      { id: 'boring', text: "A bit boring, I need some excitement!", emoji: "🥱", next: 'action' },
      { id: 'thought', text: "Great! I'm feeling thoughtful and deep", emoji: "🤔", next: 'deep' },
      { id: 'chill', text: "Just chill. Open to anything", emoji: "😎", next: 'any' },
    ]
  },
  light: {
    id: 'light',
    text: "What kind of humor are you in the mood for?",
    options: [
      { text: "Pure silliness and slapstick", genres: [35, 10751], emoji: "🤡" },
      { text: "Smart, witty dialogue", genres: [35, 18], emoji: "😏" },
      { text: "Romantic and feel-good", genres: [35, 10749], emoji: "🥂" },
      { text: "Animation and wonder", genres: [16, 14], emoji: "✨" },
    ]
  },
  action: {
    id: 'action',
    text: "Where should the adrenaline take you?",
    options: [
      { text: "A high-stakes heist or crime", genres: [80, 53], emoji: "💰" },
      { text: "Saving the world from chaos", genres: [28, 12], emoji: "💥" },
      { text: "Deep space or the future", genres: [878, 12], emoji: "🚀" },
      { text: "A gritty, realistic survival", genres: [53, 12], emoji: "🏔️" },
    ]
  },
  deep: {
    id: 'deep',
    text: "What kind of story do you want to ponder?",
    options: [
      { text: "A powerful human drama", genres: [18], emoji: "🎭" },
      { text: "A fascinating true story", genres: [99, 36], emoji: "📜" },
      { text: "A dark mystery or puzzle", genres: [9648, 80], emoji: "🔍" },
      { text: "Something artistic and indie", genres: [18, 99], emoji: "🎨" },
    ]
  },
  any: {
    id: 'any',
    text: "If you could escape right now, where would you go?",
    options: [
      { text: "A far-off galaxy", genres: [878], emoji: "🌌" },
      { text: "A magical realm", genres: [14], emoji: "🧙" },
      { text: "A spooky thriller", genres: [27, 53], emoji: "👻" },
      { text: "A relaxing romantic trip", genres: [10749], emoji: "💖" },
    ]
  }
};

const AdventureQuestionsScreen = ({navigation}) => {
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
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem('streamdeck_adventure_prefs', JSON.stringify(uniqueGenres));
      } catch (e) {
        console.error('[Adventure] Failed to persist mood prefs:', e);
      }
      
      navigation.navigate('AdventureMain', { 
        genreIds: uniqueGenres,
        isMoodBased: true
      });
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
          <View style={[styles.progressBarFill, { width: `${(progress / stepCount) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.questionText}>{currentQ.text}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQ.options.map((opt, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.optionCard}
              activeOpacity={0.8}
              onPress={() => handleOptionPress(opt)}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={styles.optionText}>{opt.text}</Text>
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
    backgroundColor: Colors.bgCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
});

export default AdventureQuestionsScreen;
