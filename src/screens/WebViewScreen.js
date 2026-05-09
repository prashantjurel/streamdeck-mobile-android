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
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {useFocusEffect} from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const WebViewScreen = ({navigation, route}) => {
  const {url, title, appId, color, isAdventure, cards, initialIndex, onUpdateIndex, type} = route.params;
  
  // 1. All hooks at the top
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const webViewRef = useRef(null);
  const eventEmitterRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [isPiPState, setIsPiPState] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [pageTitle, setPageTitle] = useState(title || 'Loading...');
  const [advIndex, setAdvIndex] = useState(initialIndex || 0);
  const [isAdvLoading, setIsAdvLoading] = useState(false);

  // 2. Derived state
  const isPiP = isPiPState || (width > 0 && width < 400) || (height > 0 && height < 400);
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 0;

  // 3. Effects
  useFocusEffect(
    useCallback(() => {
      // Enable PiP when focused
      if (NativeModules.PiPModule) {
        NativeModules.PiPModule.setPiPEnabled(true);
        
        // Initial check
        NativeModules.PiPModule.isPiPActive().then(setIsPiPState).catch(() => {});

        if (!eventEmitterRef.current) {
          eventEmitterRef.current = new NativeEventEmitter(NativeModules.PiPModule);
        }
        
        const subscription = eventEmitterRef.current.addListener('onPiPModeChanged', (isInPiP) => {
          setIsPiPState(isInPiP);
        });

        // Polling fallback
        const interval = setInterval(() => {
          NativeModules.PiPModule.isPiPActive().then(setIsPiPState).catch(() => {});
        }, 1000);
        
        return () => {
          NativeModules.PiPModule.setPiPEnabled(false);
          subscription.remove();
          clearInterval(interval);
        };
      }
    }, [width, height])
  );


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
    <View style={[styles.screen, {paddingTop: isPiP ? 0 : topPadding}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top Bar */}
      {!isPiP && (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <View style={[styles.appDot, {backgroundColor: themeColor}]} />
              <Text style={styles.title} numberOfLines={1}>
                {pageTitle}
              </Text>
            </View>
            <Text style={styles.urlText} numberOfLines={1}>
              {currentUrl}
            </Text>
          </View>

          <View style={styles.actions}>
            {canGoBack && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => webViewRef.current?.goBack()}
                activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => webViewRef.current?.reload()}
              activeOpacity={0.7}>
              <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
        injectedJavaScript={`
          (function() {
            // 1. Immediate Neutralization
            window.alert = function() { return true; };
            window.confirm = function() { return true; };
            window.prompt = function() { return null; };
            window.open = function() { return null; };

            function applyStyles() {
              // Re-neutralize in case site restores them
              window.alert = function() { return true; };
              window.confirm = function() { return true; };
              
              var isPiPMode = window.innerWidth < 300 || window.innerHeight < 300;
              
              var videos = document.querySelectorAll('video');
              videos.forEach(function(v) {
                if (isPiPMode) {
                  v.style.setProperty('width', '100vw', 'important');
                  v.style.setProperty('height', '100vh', 'important');
                  v.style.setProperty('object-fit', 'contain', 'important');
                  v.style.setProperty('position', 'fixed', 'important');
                  v.style.setProperty('top', '0', 'important');
                  v.style.setProperty('left', '0', 'important');
                  v.style.setProperty('z-index', '2147483647', 'important');
                  v.style.setProperty('background', 'black', 'important');
                } else {
                  v.style.setProperty('z-index', '1', 'important');
                }
                if (v.paused && isPiPMode) v.play().catch(function() {});
              });

              var blockers = document.querySelectorAll('[class*="overlay"], [class*="modal"], [class*="popup"], [id*="overlay"], [id*="modal"], [id*="popup"], div[style*="position: fixed"], div[style*="position: absolute"]');
              blockers.forEach(function(el) {
                if (el.tagName !== 'VIDEO') {
                  var text = (el.innerText || el.textContent || "").toLowerCase();
                  if (text.includes('robot') || text.includes('allow') || text.includes('continue')) {
                    // Trace up to the main container to hide the whole modal
                    var container = el;
                    while (container.parentElement && container.parentElement.tagName !== 'BODY' && container.parentElement.tagName !== 'HTML') {
                       if (window.getComputedStyle(container).position === 'fixed' || window.getComputedStyle(container).position === 'absolute') break;
                       container = container.parentElement;
                    }
                    container.style.setProperty('display', 'none', 'important');
                    container.style.setProperty('pointer-events', 'none', 'important');
                    container.style.setProperty('opacity', '0', 'important');
                    container.style.setProperty('visibility', 'hidden', 'important');
                  }
                }
              });
            }

            applyStyles();
            var observer = new MutationObserver(applyStyles);
            observer.observe(document.body, { childList: true, subtree: true });
            setInterval(applyStyles, 500); // More frequent check
            window.onbeforeunload = null;
          })();
          true;
        `}
        startInLoadingState={true}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) => {
          const isExternal = !request.url.startsWith('http');
          if (isExternal) return false;
          return true;
        }}
        renderError={(errorName, errorCode, errorDesc) => (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorIcon}>📡</Text>
            <Text style={styles.errorTitle}>Provider Unavailable</Text>
            <Text style={styles.errorSubtitle}>
              This movie link seems to be broken or blocked. Please try changing your MovieBox provider in Settings.
            </Text>
            <TouchableOpacity
              style={styles.errorActionBtn}
              onPress={() => navigation.navigate('Settings', { 
                highlightSection: type === 'sports' ? 'sports' : 'moviebox' 
              })}
              activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.accentPurple, Colors.accentPink]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.errorActionGradient}>
                <Text style={styles.errorActionText}>Go to Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  urlText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
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
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  errorTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  errorActionBtn: {
    width: '80%',
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    elevation: 8,
  },
  errorActionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default WebViewScreen;
