// StreamDeck Mobile — Section Header Component
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing} from '../theme/colors';

const SectionHeader = ({title, subtitle, style}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <LinearGradient
          colors={[Colors.accentPurple, Colors.accentPink]}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.accentBar}
        />
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 4,
    height: 24,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginLeft: Spacing.lg + 4,
  },
});

export default SectionHeader;
