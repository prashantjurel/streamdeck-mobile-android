// StreamDeck Mobile — Continue Watching Row Component
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import SectionHeader from './SectionHeader';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ContinueWatchingInfoModal from './ContinueWatchingInfoModal';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.35; 
const CARD_HEIGHT = CARD_WIDTH * 1.5;

const ContinueWatchingCard = ({item, onPress}) => {
  const progress = item.progress || 0;
  const title = item.mediaType === 'tv' && item.showName ? item.showName : (item.title || 'Continue Watching');
  const subtitle = item.mediaType === 'tv' && item.showName ? `S${item.season || 1} E${item.episode || 1}` : 'Movie';
  
  // Format lastWatched timestamp
  let timeInfo = '';
  const lastTime = item.timestamp || item.lastWatched;
  if (lastTime) {
    const diffMs = Date.now() - lastTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      timeInfo = diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      timeInfo = `${diffHours}h ago`;
    } else if (diffDays === 1) {
      timeInfo = 'Yesterday';
    } else {
      timeInfo = `${diffDays}d ago`;
    }
  }

  // Format time remaining
  let durationInfo = '';
  if (item.currentTime && item.duration && item.duration > 0) {
    const remainingSeconds = Math.max(0, item.duration - item.currentTime);
    if (remainingSeconds < 60) {
      durationInfo = 'Almost done';
    } else {
      const h = Math.floor(remainingSeconds / 3600);
      const m = Math.floor((remainingSeconds % 3600) / 60);
      if (h > 0) {
        durationInfo = `${h}h ${m}m left`;
      } else {
        durationInfo = `${m} min left`;
      }
    }
  }
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={() => onPress && onPress(item)}
        activeOpacity={0.9}>
        
        {/* Poster Image */}
        <View style={styles.posterContainer}>
          <ImageBackground
            source={(item.poster || item.thumb) ? {uri: item.poster || item.thumb} : null}
            style={styles.backgroundImage}
            imageStyle={{borderRadius: BorderRadius.md}}
            resizeMode="cover"
          >
            {(!item.poster && !item.thumb) && (
              <LinearGradient
                colors={['#1e1e2e', '#0f0f1a']}
                style={styles.placeholderContainer}
              >
                <View style={styles.placeholderIconBox}>
                  <Ionicons name="play" size={24} color="rgba(255,255,255,0.2)" />
                </View>
              </LinearGradient>
            )}

            {/* Progress Bar at bottom of poster */}
            <View style={styles.posterProgressBarBg}>
              <LinearGradient
                colors={[Colors.accentPurple, Colors.accentPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.posterProgressBarFill, { width: `${Math.max(2, Math.min(progress, 100))}%` }]}
              />
            </View>

          </ImageBackground>
        </View>

        {/* Text Content Below Poster */}
        <View style={styles.textContainer}>
          <View style={styles.rowBetween}>
            <Text style={styles.titleText} numberOfLines={2}>{title}</Text>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
          {item.mediaType === 'tv' && item.season && (
            <Text style={[styles.subText, { color: Colors.accentPurple, fontWeight: '700', marginBottom: 2 }]} numberOfLines={1}>
              S{item.season} E{item.episode || 1}
            </Text>
          )}
          <View style={styles.rowBetween}>
            <Text style={styles.subText} numberOfLines={1}>{timeInfo}</Text>
            {durationInfo ? <Text style={[styles.subText, { color: 'rgba(255,255,255,0.5)' }]}>{durationInfo}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const ContinueWatchingRow = ({items = [], onItemPress, onRemoveItem}) => {
  const [showInfo, setShowInfo] = useState(false);
  
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader 
        title="Continue Watching" 
        titleExtra={
          <TouchableOpacity 
            onPress={() => setShowInfo(true)} 
            style={styles.infoBtn} 
            activeOpacity={0.6}
          >
            <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ContinueWatchingCard 
            item={{...item, onRemove: onRemoveItem}} 
            onPress={onItemPress} 
          />
        )}
      />

      <ContinueWatchingInfoModal 
        visible={showInfo} 
        onClose={() => setShowInfo(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xs,
  },
  cardContainer: {
    marginRight: Spacing.lg,
    position: 'relative',
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  posterContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#111118',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backgroundImage: {
    flex: 1,
  },
  overlayBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    paddingHorizontal: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  progressText: {
    color: Colors.accentPink,
    fontSize: 11,
    fontWeight: '900',
  },
  subText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  posterProgressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  posterProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  infoBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});

export default ContinueWatchingRow;
