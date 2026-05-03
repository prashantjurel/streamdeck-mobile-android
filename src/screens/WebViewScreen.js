// StreamDeck Mobile — WebView Screen
// Universal WebView for all streaming platforms
import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  BackHandler,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {useFocusEffect} from '@react-navigation/native';

const WebViewScreen = ({navigation, route}) => {
  const {url, title, appId, color, isAdventure, cards, initialIndex, onUpdateIndex} = route.params;
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [pageTitle, setPageTitle] = useState(title || 'Loading...');
  
  // Track adventure progress locally
  const [advIndex, setAdvIndex] = useState(initialIndex || 0);
  const [isAdvLoading, setIsAdvLoading] = useState(false);

  // Safe area handling
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 0;

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => subscription.remove();
    }, [canGoBack]),
  );

  const handleNavigationStateChange = navState => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
    if (navState.title) {
      setPageTitle(navState.title);
    }
    // If we were waiting for an adventure load, clear the state
    if (!navState.loading && isAdvLoading) {
      setIsAdvLoading(false);
    }
  };

  const handleNextAdventure = () => {
    if (!cards || advIndex >= cards.length - 1) {
      navigation.goBack();
      return;
    }

    const nextIndex = advIndex + 1;
    const nextCard = cards[nextIndex];
    
    setAdvIndex(nextIndex);
    setIsAdvLoading(true);
    setPageTitle(nextCard.title);
    
    // Notify parent of progress so deck is ready if we go back
    onUpdateIndex?.(nextIndex);

    // Navigate webview
    if (webViewRef.current) {
      setTimeout(() => {
        webViewRef.current.injectJavaScript(`window.location.href = '${nextCard.url}';`);
      }, 100);
    }
  };

  const handlePrevAdventure = () => {
    if (!cards || advIndex <= 0) return;

    const prevIndex = advIndex - 1;
    const prevCard = cards[prevIndex];
    
    setAdvIndex(prevIndex);
    setIsAdvLoading(true);
    setPageTitle(prevCard.title);
    
    // Notify parent
    onUpdateIndex?.(prevIndex);

    // Navigate webview
    if (webViewRef.current) {
      setTimeout(() => {
        webViewRef.current.injectJavaScript(`window.location.href = '${prevCard.url}';`);
      }, 100);
    }
  };

  const themeColor = color || Colors.accentPurple;

  return (
    <View style={[styles.screen, {paddingTop: topPadding}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.titleSection}>
          <View style={[styles.appDot, {backgroundColor: themeColor}]} />
          <Text style={styles.title} numberOfLines={1}>
            {pageTitle}
          </Text>
        </View>

        <View style={styles.actions}>
          {canGoBack && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => webViewRef.current?.goBack()}
              activeOpacity={0.7}>
              <Text style={styles.actionIcon}>◀</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => webViewRef.current?.reload()}
            activeOpacity={0.7}>
            <Text style={styles.actionIcon}>⟲</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Bar */}
      {loading && (
        <View style={styles.loadingBar}>
          <LinearGradient
            colors={[themeColor, Colors.accentPink]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.loadingProgress}
          />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{uri: url}}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        allowsFullscreenVideo={true}
        startInLoadingState={true}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) => {
          const isExternal = !request.url.startsWith('http');
          if (isExternal) return false;
          return true;
        }}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={themeColor} />
            <Text style={styles.loadingText}>Loading Discovery...</Text>
          </View>
        )}
        userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
      />

      {/* Adventure Navigation Bar */}
      {isAdventure && (
        <View style={[styles.advBar, {bottom: bottomPadding + 20}]}>
          <TouchableOpacity 
            style={[styles.advPrevBtn, advIndex === 0 && styles.advBtnDisabled]} 
            onPress={handlePrevAdventure}
            disabled={advIndex === 0 || isAdvLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.advPrevIcon}>◀</Text>
          </TouchableOpacity>

          <View style={styles.advUrlBox}>
            <Text style={styles.advUrlText} numberOfLines={1}>
              Adventure {advIndex + 1} of {cards.length}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.advNextBtn, isAdvLoading && styles.advBtnDisabled]} 
            onPress={handleNextAdventure}
            disabled={isAdvLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.advNextGradient}
            >
              {isAdvLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.advNextText}>Next</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backIcon: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
    gap: Spacing.sm,
  },
  appDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionIcon: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  loadingBar: {
    height: 2,
    backgroundColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    width: '60%',
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
  },
  advBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 60,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 8,
  },
  advPrevBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  advPrevIcon: {
    color: '#fff',
    fontSize: 16,
  },
  advUrlBox: {
    flex: 1,
    alignItems: 'center',
  },
  advUrlText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  advNextBtn: {
    width: 100,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  advBtnDisabled: {
    opacity: 0.5,
  },
  advNextGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advNextText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});

export default WebViewScreen;
