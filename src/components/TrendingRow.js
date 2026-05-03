// StreamDeck Mobile — Trending Row Component
// Horizontal scrollable row of poster cards for trending content
import React from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {Spacing} from '../theme/colors';
import SectionHeader from './SectionHeader';
import PosterCard from './PosterCard';

const TrendingRow = ({title, subtitle, movies = [], onMoviePress, style}) => {
  if (movies.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      <SectionHeader title={title} subtitle={subtitle} />
      <FlatList
        data={movies}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        renderItem={({item}) => (
          <PosterCard movie={item} onPress={onMoviePress} />
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
});

export default TrendingRow;
