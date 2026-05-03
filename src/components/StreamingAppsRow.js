// StreamDeck Mobile — Streaming Apps Row Component
// Large branded icons for streaming platforms
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import SectionHeader from './SectionHeader';
import {STREAMING_APPS} from '../services/apps';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.md * 2) / 3;

const AppCard = ({app, onPress}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(app)}
      activeOpacity={0.7}>
      <View style={styles.cardInner}>
        {/* Colored background glow */}
        <View
          style={[
            styles.iconGlow,
            {
              backgroundColor: app.color,
              shadowColor: app.color,
            },
          ]}
        />

        {/* Icon Container */}
        <View
          style={[
            styles.iconContainer,
            {
              borderColor: app.color + '40',
            },
          ]}>
          <Text style={styles.iconEmoji}>{app.icon}</Text>
          <View
            style={[
              styles.letterBadge,
              {backgroundColor: app.color},
            ]}>
            <Text style={styles.letterText}>{app.letter}</Text>
          </View>
        </View>

        {/* App Name */}
        <Text style={styles.appName} numberOfLines={1}>
          {app.name}
        </Text>
        <Text style={styles.appDesc} numberOfLines={1}>
          {app.desc}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const StreamingAppsRow = ({onAppPress}) => {
  const visibleApps = STREAMING_APPS.filter(app => !app.isSpecial);

  return (
    <View style={styles.container}>
      <SectionHeader title="Streaming Apps" subtitle="Your entertainment hubs" />
      <FlatList
        data={visibleApps}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <AppCard app={item} onPress={onAppPress} />
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
    width: CARD_SIZE,
    marginRight: Spacing.md,
  },
  cardInner: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconGlow: {
    position: 'absolute',
    top: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.15,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 24,
  },
  letterBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  appName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  appDesc: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

export default StreamingAppsRow;
