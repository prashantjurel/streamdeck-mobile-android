// StreamDeck Mobile — Continue Watching Row Component
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import SectionHeader from './SectionHeader';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const CARD_HEIGHT = CARD_WIDTH * 0.56;

const ContinueWatchingCard = ({item, onPress}) => {
  const progress = item.progress || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.7}>
      {/* Thumbnail */}
      {item.thumb ? (
        <Image
          source={{uri: item.thumb}}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumb]}>
          <Text style={styles.placeholderIcon}>▶</Text>
        </View>
      )}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.overlay}>
        {/* App Badge */}
        <View
          style={[
            styles.appBadge,
            {backgroundColor: Colors.appColors[item.appId] || Colors.accentPurple},
          ]}>
          <Text style={styles.appBadgeText}>
            {(item.appId || '').toUpperCase().charAt(0)}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {item.title || 'Continue Watching'}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[styles.progressFill, {width: `${Math.min(progress, 100)}%`}]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const ContinueWatchingRow = ({items = [], onItemPress}) => {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title="Continue Watching" />
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ContinueWatchingCard item={item} onPress={onItemPress} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
  },
  placeholderIcon: {
    fontSize: 24,
    color: Colors.textMuted,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  appBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appBadgeText: {
    color: '#fff',
    fontSize: FontSizes.xs,
    fontWeight: '800',
  },
  title: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
  },
});

export default ContinueWatchingRow;
