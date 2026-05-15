// StreamDeck Mobile — Section Header Component
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing} from '../theme/colors';

const SectionHeader = ({title, subtitle, style, rightAction, onPress, showChevron, titleExtra}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <TouchableOpacity 
          style={styles.leftTitleRow} 
          onPress={onPress}
          disabled={!onPress}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
            style={styles.accentBar}
          />
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {showChevron && (
            <Text style={{ marginLeft: 6, color: Colors.accentPink, fontSize: 18, fontWeight: '700', marginTop: 2 }}>
              ˅
            </Text>
          )}
          {titleExtra && <View style={{marginLeft: 8}}>{titleExtra}</View>}
        </TouchableOpacity>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
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
    justifyContent: 'space-between',
  },
  leftTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
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
    flexShrink: 1,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginLeft: Spacing.lg + 4,
  },
});

export default SectionHeader;
