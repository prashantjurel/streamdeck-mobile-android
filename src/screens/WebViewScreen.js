// StreamDeck Mobile — WebView Screen
// Universal WebView for all streaming platforms
import React, {useState, useEffect, useRef, useCallback} from 'react';
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
import { addContinueWatchingEntry } from '../utils/storage';
import { syncWithCloud } from '../services/sync';

const WebViewScreen = ({navigation, route}) => {
  const {
    url, title, appId, color, isAdventure, cards, initialIndex, 
    onUpdateIndex, type, engineSource, tmdbId, mediaType, 
    season, episode, resumeTime, thumb, showName, userId
  } = route.params;
  
  // 1. All hooks at the top
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const webViewRef = useRef(null);
  const eventEmitterRef = useRef(null);
  
  const [isFullscreen, setIsFullscreen] = useState(type === 'direct_engine' || type === 'moviebox');
  const [loading, setLoading] = useState(true);
  const [isPiPState, setIsPiPState] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [pageTitle, setPageTitle] = useState(title || 'Loading...');
  const [advIndex, setAdvIndex] = useState(initialIndex || 0);
  const [isAdvLoading, setIsAdvLoading] = useState(false);

  // 2. Derived state
  // Only trigger automatic PiP layout if the window is truly small (actual PiP/Split window)
  const isPiP = isPiPState || (width > 0 && width < 150) || (height > 0 && height < 150);
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 0;

  // Extract the allowed domain from the initial URL to block cross-domain redirects
  const allowedDomain = useRef('');
  useEffect(() => {
    try {
      const parsed = new URL(url);
      allowedDomain.current = parsed.hostname.replace('www.', '');
    } catch (e) {
      allowedDomain.current = '';
    }
  }, [url]);

  // Determine if this is a direct engine playback
  const isDirectEngine = type === 'direct_engine';
  const isMovieBox = type === 'moviebox';

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
        // If it's a direct engine playback, always go back to Home immediately
        // instead of navigating within the WebView history or toggling UI
        if (isDirectEngine || isMovieBox || isFullscreen) {
          navigation.goBack();
          return true;
        }

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
    }, [canGoBack, isDirectEngine, isMovieBox, isFullscreen]),
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
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // 3. Cloud Sync on Unmount (Save progress to other devices)
  useEffect(() => {
    return () => {
      if (userId) {
        console.log('[WebView] Component unmounting — triggering sync for:', userId);
        syncWithCloud(userId).catch(err => console.warn('[Sync] Post-playback sync failed:', err));
      }
    };
  }, [userId]);
  const [errorDetails, setErrorDetails] = useState(null);

  // Safety Timeout: Force show player after 12s if stuck
  useEffect(() => {
    let timer;
    if (!isPlayerReady && !errorDetails && !loading) {
      timer = setTimeout(() => {
        console.log('[WebView] Post-load safety timeout - Force showing player');
        setIsPlayerReady(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isPlayerReady, errorDetails, loading]);

  const lastProgressUpdate = useRef(0);
  
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // 1. CineSrc Handlers
      if (data.type === 'cinesrc:ready') {
        console.log('[WebView] CineSrc Engine Ready');
        setIsPlayerReady(true);
        // Explicitly seek to requested time (even if 0) to override internal player memory
        webViewRef.current.injectJavaScript(`
          window.postMessage({ type: 'cinesrc:seek', time: ${resumeTime || 0} }, '*');
        `);
      } 
      
      // 2. Robust Progress Extraction
      const rawEvent = data.type === 'PLAYER_EVENT' ? (data.event || (data.data && data.data.event)) : (data.event || data.type || (data.data && data.data.event));
      const rawCurrentTime = data.currentTime ?? data.time ?? data.seconds ?? data.data?.currentTime ?? data.data?.time ?? data.data?.seconds;
      const rawDuration = data.duration ?? data.totalTime ?? data.total_time ?? data.data?.duration ?? data.data?.totalTime;

      if (rawEvent === 'timeupdate' || data.type === 'cinesrc:timeupdate') {
        if (rawCurrentTime !== undefined && rawDuration !== undefined) {
          handleProgressUpdate(rawCurrentTime, rawDuration);
        }
      } else if (rawEvent === 'ended' || data.type === 'cinesrc:ended') {
        handleAutoNext();
      } else if (data.type === 'cinesrc:error') {
        setErrorDetails('This source is currently unavailable. Please try another server.');
      } else if (data.type === 'cinesrc:close') {
        navigation.goBack();
      } else if (data.type === 'rive:ready' || data.type === 'ready') {
        console.log('[WebView] Engine Ready');
        setIsPlayerReady(true);
      } else if (data.type === 'fullscreen') {
        setIsFullscreen(data.enabled);
      }
    } catch (e) {
      const rawData = event.nativeEvent.data;
      if (rawData === 'video_playing' || rawData === 'player_ready' || rawData === 'cinesrc:ready') {
        setIsPlayerReady(true);
      }
    }
  };

  const [showTrackingIndicator, setShowTrackingIndicator] = useState(false);

  const handleProgressUpdate = (currentTime, duration) => {
    if (!tmdbId || !duration) return;
    
    const progress = (currentTime / duration) * 100;
    const now = Date.now();
    
    // Throttle storage updates to every 5 seconds
    if (now - lastProgressUpdate.current > 5000) {
      lastProgressUpdate.current = now;
      
      try {
        addContinueWatchingEntry({
          tmdbId,
          mediaType,
          showName: showName || null,
          season: season !== undefined ? Number(season) : null,
          episode: episode !== undefined ? Number(episode) : null,
          title,
          progress,
          currentTime,
          duration,
          thumb,
          appId,
          url,
          showName,
        });

        // Show indicator briefly
        setShowTrackingIndicator(true);
        setTimeout(() => setShowTrackingIndicator(false), 2000);
      } catch (err) {
        console.error('[WebView] Progress save failed:', err);
      }
    }
  };

  const handleAutoNext = async () => {
    if (mediaType === 'tv' && tmdbId) {
      console.log('[WebView] Episode ended — Triggering Auto-Next');
      const nextEpisode = (episode || 1) + 1;
      const { navigateToOTT, checkDirectEngineAvailability } = require('../utils/OTTNavigation');
      
      // Close current and navigate to next
      navigation.goBack();
      
      // Small delay to allow home to focus and then trigger next
      setTimeout(async () => {
        const provider = { id: 'direct', name: 'StreamDeck Engine', color: color };
        await navigateToOTT(provider, title, tmdbId, mediaType, null, navigation, season, nextEpisode, 0, thumb, showName);
      }, 500);
    } else {
      navigation.goBack();
    }
  };

  // Comprehensive ad/popup/redirect domain block list
  const AD_BLOCK_LIST = [
    // Ad networks & malicious redirectors
    'onclick', 'popunder', 'adsterra', 'doubleclick', 'adnxs', 'trafficjunky',
    'propellerads', 'exoclick', 'juicyads', 'bet365', '1xbet', 'linebet',
    'adserve', 'adsense', 'googlesyndication', 'googleadservices',
    'moatads', 'outbrain', 'taboola', 'revcontent',
    'popcash', 'popads', 'onclickads', 'deloton', 'vidoza', 'doodstream',
    'bit.ly', 'tinyurl', 'shorturl', 'ouo.io', 'linkvertise',
    'youtube.com', 'play.google.com', 'apps.apple.com', 'itunes.apple.com',
    'facebook.com/sharer', 'twitter.com/intent', 'pinterest.com/pin',
    'amazon.in', 'amazon.com', 'flipkart.com', 'myntra.com', 'ajio.com', 'tatacliq.com', 'reliance.com',
  ];

  // Domains that are allowed for the embed players to work
  const ALLOWED_ENGINE_DOMAINS = [
    'cinesrc.st',
    'vidking.net',
    // Common CDN domains used by these players for actual video streaming
    'googleapis.com',
    'gstatic.com',
    'cloudflare.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
    'vidsrc',
    'febbox',
    'filemoon',
    'vidplay',
    'rabbitstream',
    'megacloud',
    'dokicloud',
    'mp4upload',
    'streamlare',
    'upstream',
    'mixdrop',
    'stream',
    'embed',
    'kayel',
    'vcdn',
    'hls',
    'm3u8',
    'ts',
    'akamai',
    'fastly',
    'edge',
  ];

  const themeColor = color || Colors.accentPurple;

  // Engine display label
  const engineLabel = engineSource 
    ? engineSource.toUpperCase() 
    : (appId === 'direct' ? 'DIRECT ENGINE' : appId?.toUpperCase());

  // Build the injected JavaScript based on the type
  const buildInjectedJS = () => {
    // CineSrc/VidKing bypass

    const adSelectors = [
      '[class*="banner"], [id*="banner"]',
      '[class*="popup"], [id*="popup"]',
      '[class*="overlay"]:not([class*="video"]):not([class*="player"])',
      '[id*="modal"], [class*="modal"]:not([class*="video"])',
      'iframe:not([src*="cinesrc"]):not([src*="vidking"])',
      'ins.adsbygoogle',
      '#aswift_0_expand',
      '#google_ads_iframe',
      '.ad-container',
      '.ad-placement',
    ];

    const baseScript = `
      (function() {
        // Intercept window.open to prevent popup redirects
        window.open = function() {
          console.log('[AdBlock] Blocked window.open attempt');
          return {
            focus: function() {},
            close: function() {},
            closed: true
          };
        };

        // Suppress all alerts, confirms, prompts
        window.alert = function() { return true; };
        window.confirm = function() { return true; };
        window.prompt = function() { return ''; };

        // 1. Video detection & readiness reporter

        // 1. Video detection & readiness reporter
        let playAttemptCount = 0;
        let hasStartedOnce = false;
        let loadTime = Date.now();
        
        function setupVideoListener() {
          const video = document.querySelector('video');
          const isEnginePage = window.location.href.includes('cinesrc') || 
                              window.location.href.includes('vidking');

          // Robust detection of "Started" state
          if (video && (video.currentTime > 0.5 || !video.paused)) {
            hasStartedOnce = true;
          }

          // Readiness pulse
          if (isEnginePage || video) {
            window.ReactNativeWebView.postMessage('cinesrc:ready');
          }

          // Force play logic: 
          // 1. Only at start (before hasStartedOnce)
          // 2. Max 20 attempts
          // 3. Stop trying after 30 seconds of page load to prevent forever-loops
          const timeSinceLoad = Date.now() - loadTime;
          if (video && video.paused && !hasStartedOnce && playAttemptCount < 20 && timeSinceLoad < 30000) {
            video.play().catch(() => {
              // Click simulation (only if play fails)
              const evt = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2
              });
              document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)?.dispatchEvent(evt);
            });
            playAttemptCount++;
          }

          function check(doc) {
            if (!doc) return;
            const v = doc.querySelector('video');
            if (v) {
              if (!v.paused) {
                hasStartedOnce = true;
                window.ReactNativeWebView.postMessage('video_playing');
              } else if (!hasStartedOnce && playAttemptCount < 20 && timeSinceLoad < 30000) {
                v.play().catch(() => {});
              }
            }
            
            const frames = doc.querySelectorAll('iframe');
            frames.forEach(f => {
              try { check(f.contentDocument || f.contentWindow.document); } catch(e) {}
            });
          }
          check(document);
        }
        setInterval(setupVideoListener, 2000);
        // Initial auto-play attempt after a short delay
        setTimeout(() => { 
          document.querySelector('video')?.play().catch(() => {});
          // If no video found, try a global click to trigger the player's own internal logic
          if (!document.querySelector('video')) document.body.click();
        }, 5000);

        // 2. Forward Player postMessage events to React Native (Aggressive)
        window.addEventListener('message', function(event) {
          try {
            if (event.data) {
              if (typeof event.data === 'object') {
                window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
              } else if (typeof event.data === 'string' && event.data.includes('{')) {
                window.ReactNativeWebView.postMessage(event.data);
              }
            }
          } catch(e) {}
        });
        // 3. Fullscreen Detection
        const onFsChange = () => {
          const isFs = !!(document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreenElement || document.msFullscreenElement);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fullscreen',
            enabled: isFs
          }));
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        document.addEventListener('mozfullscreenchange', onFsChange);
        document.addEventListener('MSFullscreenChange', onFsChange);

        // 4. Inject Viewport Meta Tag for correct scaling
        const existingMeta = document.querySelector('meta[name="viewport"]');
        if (existingMeta) {
          existingMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        } else {
          const meta = document.createElement('meta');
          meta.name = 'viewport';
          meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
          document.head.appendChild(meta);
        }
        
        // Monitor video elements and player classes for fullscreen (fallback)
        setInterval(() => {
          const v = document.querySelector('video');
          const isVjsFs = !!document.querySelector('.vjs-fullscreen, .player-fullscreen, [class*="fullscreen"]');
          const isFs = !!(document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreenElement || document.msFullscreenElement);
          
          if (isVjsFs || isFs) {
            onFsChange();
          }

          if (v) {
            v.onwebkitbeginfullscreen = () => onFsChange();
            v.onwebkitendfullscreen = () => onFsChange();
          }
        }, 2000);
      })();
      true;
    `;

    // For direct engine embeds, add cleanup CSS to maximize the player
    if (isDirectEngine || isMovieBox) {
      return `
        ${baseScript}
        (function() {
          const selectors = [${adSelectors.map(s => `'${s}'`).join(', ')}];
          
          function cleanup() {
            // 1. Inject Style Shield (Forcing edge-to-edge)
            if (!document.getElementById('sdm-shield')) {
              const style = document.createElement('style');
              style.id = 'sdm-shield';
              style.innerHTML = selectors.join(', ') + " { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; height: 0 !important; width: 0 !important; position: absolute !important; left: -9999px !important; } " +
                "html, body { margin: 0 !important; padding: 0 !important; background: #000 !important; width: 100% !important; height: 100% !important; min-width: 100% !important; min-height: 100% !important; overflow: hidden !important; } " +
                "iframe[src*='cinesrc'], iframe[src*='vidking'], video { display: block !important; width: 100% !important; height: 100% !important; border: none !important; margin: 0 !important; padding: 0 !important; min-width: 100% !important; min-height: 100% !important; object-fit: contain !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 10 !important; } " +
                ".vjs-control-bar, .vjs-big-play-button, .player-controls, [class*='controls'], .control-bar { z-index: 2147483647 !important; pointer-events: auto !important; opacity: 1 !important; visibility: visible !important; } " +
                "* { box-sizing: border-box !important; }";
              document.head.appendChild(style);
            }

            // 2. Physical Removal of stray elements
            selectors.forEach(sel => {
              try {
                document.querySelectorAll(sel).forEach(el => {
                  if (!el.querySelector('video') && !el.querySelector('iframe[src*="cinesrc"]') && !el.querySelector('iframe[src*="vidking"]')) {
                     el.remove();
                  }
                });
              } catch(e) {}
            });

            // 3. RELENTLESS OVERLAY CLEARANCE
            // Find and remove invisible overlay blockers that prevent play/pause clicks
            document.querySelectorAll('div[style*="position: fixed"], div[style*="position: absolute"], a[style*="position: fixed"]').forEach(div => {
              try {
                const style = window.getComputedStyle(div);
                const zIndex = parseInt(style.zIndex);
                if (zIndex > 10 && (div.offsetWidth > window.innerWidth * 0.5 || div.offsetHeight > window.innerHeight * 0.5)) {
                  const hasPlayer = !!(div.querySelector('video') || div.querySelector('iframe') || div.querySelector('canvas') || div.querySelector('.artplayer-app') || div.querySelector('.vjs-tech'));
                  if (!hasPlayer && !div.id.includes('player') && !div.className.includes('controls')) {
                    div.remove();
                  }
                }
              } catch(e) {}
            });

            // 3. Auto-click "Continue" buttons (Safe)
            document.querySelectorAll('button, a').forEach(el => {
              try {
                const txt = (el.innerText || '').toLowerCase();
                if (txt.includes('continue anyways') || txt.includes('i understand')) {
                   el.click();
                }
              } catch(e) {}
            });
          }

          const observer = new MutationObserver(cleanup);
          observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

          if (document.readyState === 'complete') cleanup();
          else window.addEventListener('load', cleanup);
          setInterval(cleanup, 1500);
        })();
        true;
      `;
    }

    return baseScript;
  };

  const webViewSource = { uri: url };

  return (
    <View style={[
      styles.screen, 
      {paddingTop: (isPiP || isFullscreen) ? 0 : topPadding},
      isFullscreen && {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
        paddingTop: 0,
        width: '100%',
        height: '100%'
      }
    ]}>
      <StatusBar hidden={isFullscreen || isDirectEngine || isMovieBox} barStyle="light-content" backgroundColor="transparent" translucent />


      {/* Top Bar - Permanently hidden for Engines */}
      {(!isPiP && !isFullscreen && !isDirectEngine && !isMovieBox) && (
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
              StreamDeck Engine • {engineLabel}
            </Text>
          </View>

          <View style={styles.actions}>
        {isFullscreen && <StatusBar hidden />}
        
        {/* Back Button Overlay (Only when not fullscreen) */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setIsFullscreen(!isFullscreen)}
              activeOpacity={0.7}>
              <Ionicons name={isFullscreen ? "contract" : "expand"} size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setIsPlayerReady(false);
                setErrorDetails(null);
                webViewRef.current?.reload();
              }}
              activeOpacity={0.7}>
              <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading Bar */}
      {loading && !isPlayerReady && (
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
        source={webViewSource}
        style={[
          styles.webview, 
          { opacity: loading ? 0 : 1 },
          (isFullscreen || isDirectEngine || isMovieBox) && {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: 999,
            marginTop: 0,
            marginBottom: 0
          }
        ]}
        scrollEnabled={false}
        overScrollMode="never"
        onLoadStart={() => {
          setLoading(true);
          setErrorDetails(null);
        }}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        injectedJavaScriptBeforeContentLoaded={`
          // If we want to start from 0, clear any internal player storage
          if (${resumeTime === 0}) {
            try {
              localStorage.clear();
              sessionStorage.clear();
              console.log('[PlayerReset] Storage cleared for 0:00 start');
            } catch(e) {}
          }

          // Forward ALL postMessage events to React Native
          window.addEventListener('message', function(event) {
            try {
              if (event.data) {
                if (typeof event.data === 'object') {
                  window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
                } else if (typeof event.data === 'string' && event.data.includes('{')) {
                  window.ReactNativeWebView.postMessage(event.data);
                }
              }
            } catch(e) {}
          });
          true;
        `}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        allowsFullscreenVideo={true}
        // Allow popup checks which some players use for verification
        javaScriptCanOpenWindowsAutomatically={true}
        setSupportMultipleWindows={true}
        // Allow local storage for player state and caching
        incognito={false}
        cacheEnabled={true}
        databaseEnabled={true}
        androidLayerType="hardware"
        thirdPartyCookiesEnabled={true}
        scalesPageToFit={true}
        useWideViewPort={true}
        loadWithOverviewMode={true}
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        injectedJavaScript={buildInjectedJS()}
        onShouldStartLoadWithRequest={(request) => {
          const requestUrl = request.url.toLowerCase();
          
          // Always allow the initial URL and about:blank
          if (requestUrl.startsWith('about:blank')) return true;
          if (requestUrl.startsWith('blob:')) return true;
          if (requestUrl.startsWith('data:')) return true;
          if (request.url === url) return true;
          
          // Global block for known ad/redirect domains
          const isAd = AD_BLOCK_LIST.some(ad => requestUrl.includes(ad));
          if (isAd) {
            console.log('[AdBlock] Blocked:', request.url);
            return false;
          }

          // WHITELIST ENFORCEMENT (Crucial for VidSrc/CineSrc stability)
          if (isDirectEngine || isMovieBox) {
            const isAllowed = ALLOWED_ENGINE_DOMAINS.some(domain => requestUrl.includes(domain.toLowerCase()));
            
            // If it's a top-frame navigation (redirecting the whole app), be very strict
            if (request.isTopFrame && !isAllowed && request.url !== url) {
              console.log('[Whitelist] Blocked external top-frame redirect:', request.url);
              return false;
            }
          }

          // Allow everything else (sub-frames, scripts, etc. are handled by AD_BLOCK_LIST)
          return true;
        }}
      />

      {/* Cinematic Loading Overlay */}
      {(!isPlayerReady || errorDetails) && (
        <View style={[styles.loadingOverlay, !loading && { backgroundColor: 'transparent' }]} pointerEvents={loading ? 'auto' : 'none'}>
          {errorDetails ? (
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={64} color={Colors.accentPink} />
              <Text style={styles.errorTitle}>Playback Error</Text>
              <Text style={styles.errorSubtitle}>{errorDetails}</Text>
              <TouchableOpacity
                style={styles.errorActionBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.errorActionGradient}>
                  <Text style={styles.errorActionText}>Try Another Source</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator size="large" color={themeColor} />
              <Text style={styles.loadingText}>Initializing StreamDeck Engine...</Text>
              <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.5 }]}>
                {engineSource ? `Connecting to ${engineSource.toUpperCase()} server` : 'Finding the best server for you'}
              </Text>
            </View>
          )}
        </View>
      )}

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
  screen: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    zIndex: 1000,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
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
  errorContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
