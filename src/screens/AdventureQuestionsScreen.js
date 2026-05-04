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

const QUESTIONS = [
  {
    id: 'q1',
    text: "How was your day today?",
    options: [
      { text: "Stressful, I need to laugh and unwind", genres: [35, 16, 10751], emoji: "😅" }, // Comedy, Animation, Family
      { text: "A bit boring, I need some excitement!", genres: [28, 12, 53], emoji: "🥱" }, // Action, Adventure, Thriller
      { text: "Great! I'm feeling thoughtful and deep", genres: [18, 99, 36], emoji: "🤔" }, // Drama, Documentary, History
      { text: "Just chill. Open to anything", genres: [878, 14, 10402], emoji: "😎" }, // Sci-Fi, Fantasy, Music
    ]
  },
  {
    id: 'q2',
    text: "If you could escape right now, where would you go?",
    options: [
      { text: "A far-off galaxy or the future", genres: [878], emoji: "🚀" }, // Sci-Fi
      { text: "A spooky, abandoned mansion", genres: [27, 53], emoji: "👻" }, // Horror, Thriller
      { text: "A magical realm with wizards", genres: [14], emoji: "🧙" }, // Fantasy
      { text: "Solving a gritty city crime", genres: [80, 9648], emoji: "🕵️" }, // Crime, Mystery
      { text: "A romantic getaway", genres: [10749], emoji: "💖" }, // Romance
    ]
  }
];

const AdventureQuestionsScreen = ({navigation}) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [collectedGenres, setCollectedGenres] = useState([]);

  const handleOptionPress = (genres) => {
    const newGenres = [...collectedGenres, ...genres];
    
    if (currentQIndex < QUESTIONS.length - 1) {
      setCollectedGenres(newGenres);
      setCurrentQIndex(currentQIndex + 1);
    } else {
      // Finished questions
      // Deduplicate genres
      const uniqueGenres = [...new Set(newGenres)];
      
      navigation.navigate('AdventureMain', { 
        genreIds: uniqueGenres,
        isMoodBased: true
      });
    }
  };

  const currentQ = QUESTIONS[currentQIndex];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Question {currentQIndex + 1} of {QUESTIONS.length}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentQIndex + 1) / QUESTIONS.length) * 100}%` }]} />
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
              onPress={() => handleOptionPress(opt.genres)}
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
