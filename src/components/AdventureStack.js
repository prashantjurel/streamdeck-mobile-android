import React, {useCallback, useImperativeHandle, forwardRef, useEffect} from 'react';
import {StyleSheet, View, Dimensions} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import DiscoveryCard, {CARD_WIDTH, CARD_HEIGHT} from './DiscoveryCard';

const {width, height} = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.4;

const SwipeableCard = forwardRef(({item, isTopCard, isNextCard, onSwiped}, ref) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // When a card becomes the top card, we want it to gracefully scale up to 1.0
  const scale = useSharedValue(isTopCard ? 1 : 0.9);
  const opacity = useSharedValue(isTopCard ? 1 : 0.5);

  // RIGHT-PEEK stack logic
  useEffect(() => {
    // Top card is W-32 (from each side)
    // Next card peeks out to the right
  }, [isTopCard, isNextCard]);

  const handleSwipeComplete = useCallback((direction) => {
    onSwiped(direction, item);
  }, [onSwiped, item]);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => {
      if (!isTopCard) return;
      translateX.value = withTiming(-width * 1.5, { duration: 400 }, () => {
        runOnJS(handleSwipeComplete)('left');
      });
    },
    swipeRight: () => {
      if (!isTopCard) return;
      translateX.value = withTiming(width * 1.5, { duration: 400 }, () => {
        runOnJS(handleSwipeComplete)('right');
      });
    },
    swipeUp: () => {
      if (!isTopCard) return;
      translateY.value = withTiming(-CARD_HEIGHT * 2, { duration: 400 }, () => {
        runOnJS(handleSwipeComplete)('up');
      });
    }
  }));

  const gesture = Gesture.Pan()
    .enabled(isTopCard) // Only the top card can be dragged
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const {velocityX, velocityY, translationX, translationY} = event;
      
      // Horizontal swipe (Skip/Save)
      if (Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 1000) {
        const direction = translationX > 0 ? 'right' : 'left';
        translateX.value = withSpring(
          direction === 'right' ? width * 1.5 : -width * 1.5,
          { velocity: velocityX, damping: 25, stiffness: 100, mass: 0.8 },
          () => {} // Animation callback is no longer primary for state
        );
        runOnJS(handleSwipeComplete)(direction);
      } 
      // Vertical swipe (Watch Now)
      else if (translationY < -SWIPE_THRESHOLD * 0.8 || velocityY < -800) {
        translateY.value = withSpring(
          -height * 1.5,
          { velocity: velocityY, damping: 25, stiffness: 100, mass: 0.8 },
          () => {}
        );
        runOnJS(handleSwipeComplete)('up');
      } 
      // Reset position
      else {
        translateX.value = withSpring(0, { damping: 25, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 25, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Side peeking logic:
    // Top card: dist = 0
    // Next card: dist = 1
    const dist = isTopCard ? 0 : (isNextCard ? 1 : 2);
    
    const swipeRotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-10, 0, 10],
      Extrapolation.CLAMP
    );

    // Shift background cards to the right to peek
    const peekTranslateX = interpolate(
      dist,
      [0, 1, 2],
      [0, 24, 44],
      Extrapolation.CLAMP
    );

    const cardScale = interpolate(
      dist,
      [0, 1, 2],
      [1, 0.96, 0.92],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value + peekTranslateX },
        { translateY: translateY.value },
        { rotate: isTopCard ? `${swipeRotate}deg` : '0deg' },
        { scale: cardScale }
      ],
      width: CARD_WIDTH,
      opacity: isTopCard ? 1 : (isNextCard ? 0.8 : 0.4),
      zIndex: isTopCard ? 100 : (isNextCard ? 90 : 80),
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.cardWrapper, animatedStyle, { alignSelf: 'center' }]} pointerEvents={isTopCard ? "auto" : "none"}>
        <DiscoveryCard item={item} />
      </Animated.View>
    </GestureDetector>
  );
});

const AdventureStack = forwardRef(({data, currentIndex, setCurrentIndex, onSwipeLeft, onSwipeRight, onSwipeUp}, ref) => {
  
  // We need a ref to the top card to trigger programmatic swipes
  let topCardRef = null;

  useImperativeHandle(ref, () => ({
    swipeLeft: () => topCardRef?.swipeLeft(),
    swipeRight: () => topCardRef?.swipeRight(),
    swipeUp: () => topCardRef?.swipeUp(),
  }));

  const onSwiped = (direction, item) => {
    setCurrentIndex(prev => prev + 1);
    if (direction === 'right') onSwipeRight?.(item);
    else if (direction === 'left') onSwipeLeft?.(item);
    else if (direction === 'up') onSwipeUp?.(item);
  };

  if (currentIndex >= data.length) return null;

  // Render a fixed window of 3 cards to keep memory low.
  // We reverse it so the active card (index 0 in the slice) is rendered last and physically sits on top of the DOM.
  const visibleCards = data.slice(currentIndex, currentIndex + 3).reverse();

  return (
    <View style={styles.container}>
      {visibleCards.map((item, mapIndex) => {
        // Because the array is reversed (e.g. [Card 3, Card 2, Card 1])
        // The active card is ALWAYS the LAST item in the array.
        const isTopCard = mapIndex === visibleCards.length - 1;
        const isNextCard = mapIndex === visibleCards.length - 2;

        return (
          <SwipeableCard
            key={item.id || item.url || item.title || Math.random().toString()}
            item={item}
            isTopCard={isTopCard}
            isNextCard={isNextCard}
            onSwiped={onSwiped}
            ref={(r) => { if (isTopCard) topCardRef = r; }}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Center of the screen
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdventureStack;
