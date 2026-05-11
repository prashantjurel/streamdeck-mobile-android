import React, {useCallback, useImperativeHandle, forwardRef, useEffect, useRef} from 'react';
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
const SWIPE_THRESHOLD = width * 0.25; // MORE SENSITIVE (was 0.4)

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
      translateX.value = withTiming(-width * 1.5, { duration: 400 }, () => {
        runOnJS(handleSwipeComplete)('left');
      });
    },
    swipeRight: () => {
      translateX.value = withTiming(width * 1.5, { duration: 400 }, () => {
        runOnJS(handleSwipeComplete)('right');
      });
    },
    swipeUp: () => {
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
    .onFinalize((event) => {
      const {velocityX, velocityY, translationX, translationY} = event;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      // 1. HORIZONTAL COMMIT (Prioritize if horizontal movement is dominant)
      if (absX > absY && (absX > SWIPE_THRESHOLD || Math.abs(velocityX) > 500)) {
        const direction = translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(
          direction === 'right' ? width * 1.5 : -width * 1.5,
          { duration: 350 },
          () => {
            runOnJS(handleSwipeComplete)(direction);
          }
        );
      } 
      // 2. VERTICAL COMMIT (Watch Now)
      else if (absY > absX && (translationY < -SWIPE_THRESHOLD * 0.7 || velocityY < -600)) {
        translateY.value = withTiming(
          -height * 1.5,
          { duration: 350 },
          () => {
            runOnJS(handleSwipeComplete)('up');
          }
        );
      } 
      // 3. DECISIVE RESET (Snap back faster)
      else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 180 });
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
  
  // Use a ref to store the current top card instance
  const topCardRef = useRef(null);

  useImperativeHandle(ref, () => ({
    swipeLeft: () => {
      if (topCardRef.current) topCardRef.current.swipeLeft();
    },
    swipeRight: () => {
      if (topCardRef.current) topCardRef.current.swipeRight();
    },
    swipeUp: () => {
      if (topCardRef.current) topCardRef.current.swipeUp();
    },
  }));

  const onSwiped = (direction, item) => {
    setCurrentIndex(prev => prev + 1);
    if (direction === 'right') onSwipeRight?.(item);
    else if (direction === 'left') onSwipeLeft?.(item);
    else if (direction === 'up') onSwipeUp?.(item);
  };

  if (currentIndex >= data.length) return null;

  // Render a fixed window of 3 cards to keep memory low.
  const visibleCards = data.slice(currentIndex, currentIndex + 3).reverse();

  return (
    <View style={styles.container}>
      {visibleCards.map((item, mapIndex) => {
        const isTopCard = mapIndex === visibleCards.length - 1;
        const isNextCard = mapIndex === visibleCards.length - 2;

        return (
          <SwipeableCard
            key={item.id ? `card-${item.id}` : `card-idx-${currentIndex + (visibleCards.length - 1 - mapIndex)}`}
            item={item}
            isTopCard={isTopCard}
            isNextCard={isNextCard}
            onSwiped={onSwiped}
            ref={(r) => { 
              if (isTopCard && r) {
                topCardRef.current = r; 
              }
            }}
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
