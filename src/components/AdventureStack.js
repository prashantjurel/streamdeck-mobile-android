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

const {width} = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.4;

const SwipeableCard = forwardRef(({item, isTopCard, isNextCard, onSwiped}, ref) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // When a card becomes the top card, we want it to gracefully scale up to 1.0
  const scale = useSharedValue(isTopCard ? 1 : 0.9);
  const opacity = useSharedValue(isTopCard ? 1 : 0.5);

  useEffect(() => {
    if (isTopCard) {
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 300 });
    } else if (isNextCard) {
      scale.value = withSpring(0.9, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0.5, { duration: 300 });
    } else {
      scale.value = withSpring(0.8, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isTopCard, isNextCard, scale, opacity]);

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
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withSpring(
          event.translationX > 0 ? width * 1.5 : -width * 1.5, 
          { velocity: event.velocityX },
          () => { runOnJS(handleSwipeComplete)(direction); }
        );
      } else if (event.translationY < -SWIPE_THRESHOLD * 0.8) {
        translateY.value = withSpring(
          -CARD_HEIGHT * 2, 
          { velocity: event.velocityY },
          () => { runOnJS(handleSwipeComplete)('up'); }
        );
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-10, 0, 10],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value }
      ],
      opacity: opacity.value,
      zIndex: isTopCard ? 100 : (isNextCard ? 90 : 80),
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cardWrapper, animatedStyle]} pointerEvents={isTopCard ? "auto" : "none"}>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdventureStack;
