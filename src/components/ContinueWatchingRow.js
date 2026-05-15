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
const CARD_WIDTH = SCREEN_WIDTH * 0.55; 
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16;

const ContinueWatchingCard = ({item, onPress}) => {
  const progress = item.progress || 0;
  const title = item.title || 'Continue Watching';
  const showBadge = item.appId && item.appId !== 'direct';

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress && onPress(item)}
        activeOpacity={0.9}>
        <ImageBackground
          source={(item.thumb && item.thumb.length > 0) ? {uri: item.thumb} : null}
          style={styles.backgroundImage}
          imageStyle={{borderRadius: BorderRadius.md}}
          resizeMode="cover"
        >
          {(!item.thumb || item.thumb.length === 0) && (
            <LinearGradient
              colors={['#1e1e2e', '#0f0f1a']}
              style={styles.placeholderContainer}
            >
              <View style={styles.placeholderIconBox}>
                <Ionicons name="play" size={24} color="rgba(255,255,255,0.2)" />
              </View>
            </LinearGradient>
          )}

          {/* Top Actions */}
          <View style={styles.topActions}>
            {showBadge ? (
              <View style={[styles.appBadge, {backgroundColor: Colors.appColors[item.appId] || Colors.accentPurple}]}>
                <Text style={styles.appBadgeText}>{(item.appId || 'S').toUpperCase().charAt(0)}</Text>
              </View>
            ) : <View />}
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', '#000']}
            style={styles.bottomScrim}
          >
            {item.mediaType === 'tv' && item.showName ? (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.showNameText} numberOfLines={1}>{item.showName}</Text>
                <Text style={styles.episodeInfoText} numberOfLines={1}>
                  <Text style={{color: Colors.accentPink, fontWeight: '900'}}>S{item.season || 1} E{item.episode || 1}</Text>
                  {item.title ? ` • ${item.title}` : ''}
                </Text>
              </View>
            ) : (
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            )}
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={[styles.progressBarFill, {width: `${Math.max(2, Math.min(progress, 100))}%`}]}
                />
              </View>
              <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>

      {/* BIG Floating Remove Button (Top Right) */}
      <TouchableOpacity 
        style={styles.removeBtn}
        onPress={() => item.onRemove && item.onRemove(item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={20} color="#fff" />
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
    marginRight: Spacing.md,
    marginTop: 12, // Space for floating button
    position: 'relative',
    overflow: 'visible',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  backgroundImage: {
    flex: 1,
  },
  topActions: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  appBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.accentPurple,
  },
  appBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  removeBtn: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 20,
  },
  titleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  showNameText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 1,
  },
  episodeInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressPercent: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    width: 26,
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
