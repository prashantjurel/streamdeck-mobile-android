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
  ScrollView,
  BackHandler,
  NativeModules,
  NativeEventEmitter,
  Image,
  Animated,
  Easing,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {useFocusEffect} from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { addContinueWatchingEntry, getSubtitlePreferences, getSkipPreferences } from '../utils/storage';
import { syncWithCloud } from '../services/sync';
import { checkDirectEngineAvailability } from '../utils/OTTNavigation';
import { enrichWithOMDb } from '../services/omdb';
import { fetchSubtitles, fetchSubtitleFile, cuesToVTT } from '../services/subtitles';
import { fetchSkipSegments, getActiveSegment, getSkipTarget } from '../services/introdb';
import { resolveStream } from '../services/febbox';

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
  
  // Detect live sports — no cinematic loader, no continue watching
  const isLiveSports = type === 'live_sports';

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isPiPState, setIsPiPState] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [pageTitle, setPageTitle] = useState(title || 'Loading...');
  const [advIndex, setAdvIndex] = useState(initialIndex || 0);
  const [isAdvLoading, setIsAdvLoading] = useState(false);
  const [currentThumb, setCurrentThumb] = useState(
    thumb && typeof thumb === 'string' && thumb.startsWith('http') ? thumb : null
  );
  const [activeEngineSource, setActiveEngineSource] = useState(engineSource);
  const [metadata, setMetadata] = useState(null);
  const progressPercent = useRef(new Animated.Value(0)).current;
  const progressWidth = progressPercent; // alias
  const [progressDisplay, setProgressDisplay] = useState(0);
  const progressAnimRef = useRef(null);
  const scrollViewRef = useRef(null);
  
  // For live sports, skip the loader entirely
  const [isPlayerReady, setIsPlayerReady] = useState(isLiveSports ? true : false);
  const [isLoaderVisible, setIsLoaderVisible] = useState(isLiveSports ? false : true);
  const loaderOpacity = useRef(new Animated.Value(isLiveSports ? 0 : 1)).current;
  const [errorDetails, setErrorDetails] = useState(null);

  // ── NEW: Subtitle, Skip, OMDb, FebBox state ──────────────
  const [skipSegments, setSkipSegments] = useState([]);
  const [activeSkipSegment, setActiveSkipSegment] = useState(null);
  const [skipDismissed, setSkipDismissed] = useState(false);
  const [omdbData, setOmdbData] = useState(null);
  const [subtitleLoaded, setSubtitleLoaded] = useState(false);
  const skipPrefsRef = useRef(null);
  const subtitlePrefsRef = useRef(null);

  // Handle lazy resolution of Direct Engine to avoid UI freezes
  useEffect(() => {
    if (url === 'streamdeck://direct') {
      console.log('[WebView] Lazy loading StreamDeck Engine availability...');
      checkDirectEngineAvailability(tmdbId, mediaType, season, episode, resumeTime)
        .then(resolved => {
          if (resolved) {
            console.log('[WebView] Stream resolved to:', resolved.url);
            setActiveEngineSource(resolved.id);
            setCurrentUrl(resolved.url);
          } else {
            console.log('[WebView] Stream unavailable.');
            setErrorDetails('This title is not currently available on StreamDeck Engine. Please try other sources.');
          }
        })
        .catch(err => {
          setErrorDetails('Failed to connect to StreamDeck Engine.');
        });
    }
    // Handle FebBox stream resolution
    if (url === 'streamdeck://febbox') {
      console.log('[WebView] Lazy loading FebBox stream...');
      resolveStream(tmdbId, mediaType, season, episode)
        .then(stream => {
          if (stream) {
            console.log('[WebView] FebBox stream resolved:', stream.type, stream.quality);
            // Load the local HLS player page with the stream URL
            const hlsPlayerUri = 'file:///android_asset/hlsPlayer.html';
            const encodedUrl = encodeURIComponent(stream.url);
            const playerUrl = `${hlsPlayerUri}?url=${encodedUrl}&t=${resumeTime || 0}`;
            setActiveEngineSource('febbox');
            setCurrentUrl(playerUrl);
          } else {
            setErrorDetails('FebBox: No stream found for this title. Check your token in Settings.');
          }
        })
        .catch(err => {
          console.error('[WebView] FebBox resolution failed:', err);
          setErrorDetails('FebBox stream resolution failed. Please try another source.');
        });
    }
  }, [url, tmdbId, mediaType, season, episode, resumeTime]);

  // ── NEW: Fetch skip segments (TheIntroDB) ────────────────
  useEffect(() => {
    if (!tmdbId) return;
    (async () => {
      try {
        const prefs = await getSkipPreferences();
        skipPrefsRef.current = prefs;
        if (!prefs.enabled) return;

        const segments = await fetchSkipSegments(
          tmdbId,
          mediaType === 'tv' ? season : undefined,
          mediaType === 'tv' ? episode : undefined
        );
        if (segments.length > 0) {
          console.log(`[WebView] Loaded ${segments.length} skip segments from TheIntroDB`);
          setSkipSegments(segments);
        }
      } catch (e) {
        console.warn('[WebView] Skip segments fetch failed:', e);
      }
    })();
  }, [tmdbId, mediaType, season, episode]);

  // ── NEW: Fetch OMDb ratings (lazy, enrichment only) ──────
  useEffect(() => {
    if (!tmdbId || !mediaType) return;
    enrichWithOMDb(tmdbId, mediaType)
      .then(data => {
        if (data) {
          console.log('[WebView] OMDb data loaded:', data.imdbRating, data.rottenTomatoes);
          setOmdbData(data);
        }
      })
      .catch(() => { /* non-critical */ });
  }, [tmdbId, mediaType]);

  // ── NEW: Load and inject subtitles ───────────────────────
  useEffect(() => {
    if (!tmdbId || !isPlayerReady || subtitleLoaded) return;
    (async () => {
      try {
        const prefs = await getSubtitlePreferences();
        subtitlePrefsRef.current = prefs;
        if (!prefs.enabled) return;

        const subs = await fetchSubtitles(
          tmdbId, mediaType,
          mediaType === 'tv' ? season : undefined,
          mediaType === 'tv' ? episode : undefined,
          prefs.language
        );
        if (subs.length === 0) return;

        // Download the best subtitle file
        const bestSub = subs[0];
        const cues = await fetchSubtitleFile(bestSub.url);
        if (cues.length === 0) return;

        // Convert to VTT and inject into WebView
        const vttContent = cuesToVTT(cues);
        if (webViewRef.current && vttContent) {
          webViewRef.current.injectJavaScript(`
            (function() {
              try {
                var allFrames = document.querySelectorAll('iframe');
                var cmd = { command: 'addSubtitleTrack', args: ['${btoa(vttContent)}', '${prefs.language}', '${bestSub.label}'] };
                for (var i = 0; i < allFrames.length; i++) {
                  try { allFrames[i].contentWindow.postMessage(JSON.stringify(cmd), '*'); } catch(e) {}
                }
                // Also try direct video element
                var v = document.querySelector('video');
                if (v) {
                  var track = document.createElement('track');
                  track.kind = 'subtitles';
                  track.src = 'data:text/vtt;base64,' + '${btoa(vttContent)}';
                  track.srclang = '${prefs.language}';
                  track.label = '${bestSub.label}';
                  track.default = true;
                  v.appendChild(track);
                  if (v.textTracks && v.textTracks.length > 0) {
                    v.textTracks[v.textTracks.length - 1].mode = 'showing';
                  }
                }
              } catch(e) { console.warn('Subtitle injection failed:', e); }
            })();
            true;
          `);
          console.log('[WebView] Subtitles injected:', bestSub.label);
          setSubtitleLoaded(true);
        }
      } catch (e) {
        console.warn('[WebView] Subtitle loading failed:', e);
      }
    })();
  }, [tmdbId, mediaType, season, episode, isPlayerReady, subtitleLoaded]);

  // Activate the native Android Dialog Blocker to suppress ALL JS popups
  // (alert/confirm/prompt) from cross-origin iframes like CineSrc
  useEffect(() => {
    if (NativeModules.DialogBlockerModule) {
      // Continuous patching for 60s to catch any WebView recreation
      NativeModules.DialogBlockerModule.enableContinuous(60000);
      console.log('[WebView] ✓ Native DialogBlocker activated — all JS dialogs will be auto-dismissed');
    }
  }, []);

  // Initial Continue Watching entry creation — register immediately but with
  // resumeTime-aware progress so it doesn't reset to 1% on re-entry
  // Skip for live sports — they are not shows or movies
  useEffect(() => {
    if (tmdbId && !isLiveSports) {
      console.log('[WebView] Registering initial Continue Watching entry for:', title);
      try {
        // If resuming, preserve existing progress estimate; otherwise start at 0.5%
        const initialProgress = resumeTime > 0 ? undefined : 0.5;
        addContinueWatchingEntry({
          tmdbId,
          mediaType,
          showName: showName || null,
          season: season !== undefined ? Number(season) : null,
          episode: episode !== undefined ? Number(episode) : null,
          title,
          progress: initialProgress,
          currentTime: resumeTime || 0,
          duration: 0, // Will be populated by first timeupdate
          thumb: currentThumb,
          appId,
          url: currentUrl,
          showName,
        });
      } catch (err) {
        console.warn('[WebView] Initial CW save failed:', err);
      }
    }
  }, [tmdbId, mediaType, season, episode, title, appId, currentUrl]);

  // Fetch TMDB Cast, Tagline & Details to keep user engaged
  useEffect(() => {
    if (tmdbId && mediaType) {
      const fetchUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=4cb1eeab94f45affe2536f2c684a5c9e&append_to_response=credits`;
      fetch(fetchUrl)
        .then(res => res.json())
        .then(data => {
          setMetadata(data);
          let updatedThumb = currentThumb;
          if (data.poster_path && (!currentThumb || !currentThumb.startsWith('http'))) {
            updatedThumb = `https://image.tmdb.org/t/p/w400${data.poster_path}`;
            setCurrentThumb(updatedThumb);
          }

          // Re-update CW entry with high-resolution thumbnail only (preserve existing progress)
          // Skip for live sports
          if (tmdbId && !isLiveSports) {
            try {
              addContinueWatchingEntry({
                tmdbId,
                mediaType,
                showName: showName || null,
                season: season !== undefined ? Number(season) : null,
                episode: episode !== undefined ? Number(episode) : null,
                title,
                thumb: updatedThumb,
                appId,
                url: currentUrl,
                showName,
              });
            } catch(e) {}
          }
          

        })
        .catch(err => console.warn('[WebView] Failed to fetch TMDB details:', err));
    }
  }, [tmdbId, mediaType]);

  // NOTE: Auto-scroll removed — it was fighting user manual scrolling.
  // Cast section is now freely scrollable by the user.

  // Animated Progress Bar logic — linear progress with instant player-ready dismiss
  useEffect(() => {
    let timer;
    if (!isPlayerReady) {
      setIsLoaderVisible(true);
      loaderOpacity.setValue(1);
      progressPercent.setValue(0);
      setProgressDisplay(0);
      
      // Single smooth LINEAR animation from 0→90 over 10s
      const anim = Animated.timing(progressPercent, {
        toValue: 90,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      progressAnimRef.current = anim;
      
      // Track numeric display
      progressPercent.addListener(({ value }) => {
        setProgressDisplay(Math.round(value));
      });
      
      anim.start();
    } else {
      // Stop the fake progress animation immediately
      if (progressAnimRef.current) {
        progressAnimRef.current.stop();
      }
      progressPercent.stopAnimation();
      
      // Flash to 100% then fade out
      Animated.parallel([
        Animated.timing(progressPercent, {
          toValue: 100,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(loaderOpacity, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          })
        ])
      ]).start(() => {
        setIsLoaderVisible(false);
        setProgressDisplay(100);
        console.log('[WebView] Loader overlay dismissed!');
      });

      // Safety fallback
      timer = setTimeout(() => {
        setIsLoaderVisible(false);
      }, 800);
    }

    return () => {
      if (timer) clearTimeout(timer);
      progressPercent.removeAllListeners();
    };
  }, [isPlayerReady]);

  useEffect(() => {
    if ((!currentThumb || !currentThumb.startsWith('http')) && mediaType === 'tv' && tmdbId && season && episode) {
      // Use the generic TMDB API key to fetch the episode image
      fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=4cb1eeab94f45affe2536f2c684a5c9e`)
        .then(res => res.json())
        .then(data => {
          if (data.still_path) {
            setCurrentThumb(`https://image.tmdb.org/t/p/w400${data.still_path}`);
          }
        })
        .catch(err => console.warn('[WebView] Failed to fetch thumbnail', err));
    }
  }, [currentThumb, mediaType, tmdbId, season, episode]);

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
  // 3. Cloud Sync on Unmount (Save progress to other devices)
  useEffect(() => {
    return () => {
      if (userId) {
        console.log('[WebView] Component unmounting — triggering sync for:', userId);
        syncWithCloud(userId).catch(err => console.warn('[Sync] Post-playback sync failed:', err));
      }
    };
  }, [userId]);

  // Safety Timeout: Force show player after 12s if stuck
  useEffect(() => {
    let timer;
    if (!isPlayerReady && !errorDetails) {
      timer = setTimeout(() => {
        console.log('[WebView] Stuck load safety timeout - Force showing player');
        setIsPlayerReady(true);
      }, 12000);
    }
    return () => clearTimeout(timer);
  }, [isPlayerReady, errorDetails]);

  const lastProgressUpdate = useRef(0);
  const hasSeekedRef = useRef(false);
  
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // 1. Robust Progress Extraction — handle CineSrc, raw video, and nested structures
      const rawEvent = data.type === 'PLAYER_EVENT' ? (data.event || (data.data && data.data.event)) : (data.event || data.type || (data.data && data.data.event));
      const rawCurrentTime = data.currentTime ?? data.time ?? data.seconds ?? data.data?.currentTime ?? data.data?.time ?? data.data?.seconds;
      const rawDuration = data.duration ?? data.totalTime ?? data.total_time ?? data.data?.duration ?? data.data?.totalTime;
      
      // 2. CineSrc & General Engine Handlers + secondary playback detection signal
      const isDirectReady = data.type === 'cinesrc:ready' || data.type === 'cinesrc:loadedmetadata' || rawEvent === 'sdm:video_ready' || rawEvent === 'sdm:playback_started' || data.type === 'rive:ready' || data.type === 'cinesrc:pulse_spoofed';
      
      if (isDirectReady || (!isDirectEngine && !isMovieBox && (rawEvent === 'ready' || rawEvent === 'player_ready' || rawEvent === 'video_playing'))) {
        console.log('[WebView] CineSrc Engine Ready Triggered! hasSeeked:', hasSeekedRef.current);
        setIsPlayerReady(true);

        // Re-patch dialog blocker whenever player becomes ready (WebView may have recreated)
        if (NativeModules.DialogBlockerModule) {
          NativeModules.DialogBlockerModule.patchWebViews();
        }

        // Use CineSrc's command API to seek via postMessage (correct per docs)
        if (!hasSeekedRef.current) {
          hasSeekedRef.current = true;
          const seekTime = resumeTime || 0;
          console.log('[WebView] Sending CineSrc seek command! resumeTime:', seekTime);
          webViewRef.current?.injectJavaScript(`
            (function() {
              // CineSrc Command API: seek via postMessage
              var cinesrcFrames = document.querySelectorAll('iframe[src*="cinesrc"]');
              var seekCmd = { type: 'cinesrc:command', command: 'seek', args: [${seekTime}] };
              var playCmd = { type: 'cinesrc:command', command: 'play', args: [] };
              
              for (var i = 0; i < cinesrcFrames.length; i++) {
                try {
                  cinesrcFrames[i].contentWindow.postMessage(seekCmd, 'https://cinesrc.st');
                  cinesrcFrames[i].contentWindow.postMessage(playCmd, 'https://cinesrc.st');
                } catch(e) {}
              }
              
              // Fallback: broadcast to all iframes
              var allFrames = document.querySelectorAll('iframe');
              for (var j = 0; j < allFrames.length; j++) {
                try {
                  allFrames[j].contentWindow.postMessage(seekCmd, '*');
                  allFrames[j].contentWindow.postMessage(playCmd, '*');
                } catch(e) {}
              }

              // Also try direct video element seek
              try {
                var v = document.querySelector('video');
                if (v && ${seekTime} > 0) { v.currentTime = ${seekTime}; v.play().catch(function(){}); }
              } catch(e) {}
            })();
            true;
          `);
        }

        // If loadedmetadata, extract duration for better initial tracking
        if (data.type === 'cinesrc:loadedmetadata' && data.duration) {
          console.log('[WebView] CineSrc loadedmetadata — duration:', data.duration);
          handleProgressUpdate(resumeTime || 0, data.duration);
        }
      } 

      // 3. Progress Tracking — handle ALL timeupdate event formats
      if (rawEvent === 'timeupdate' || data.type === 'cinesrc:timeupdate') {
        if (rawCurrentTime !== undefined && rawDuration !== undefined && rawDuration > 0) {
          handleProgressUpdate(rawCurrentTime, rawDuration);
          
          // Safety fallback: if video is actively playing but loader is still showing, mark player ready
          if (!isPlayerReady) {
            console.log('[WebView] Active playback detected via timeupdate - marking player ready');
            setIsPlayerReady(true);
          }

          // ── Skip segment detection ──────────────────────
          if (skipSegments.length > 0 && rawCurrentTime !== undefined) {
            const active = getActiveSegment(skipSegments, rawCurrentTime);
            if (active && !skipDismissed) {
              setActiveSkipSegment(active);
              // Auto-skip if enabled
              if (skipPrefsRef.current?.autoSkip) {
                const target = getSkipTarget(active);
                webViewRef.current?.injectJavaScript(`
                  (function() {
                    var v = document.querySelector('video');
                    if (v) { v.currentTime = ${target}; }
                    var frames = document.querySelectorAll('iframe');
                    for (var i = 0; i < frames.length; i++) {
                      try { frames[i].contentWindow.postMessage({ command: 'seek', args: [${target}] }, '*'); } catch(e) {}
                    }
                  })();
                  true;
                `);
                setActiveSkipSegment(null);
              }
            } else if (!active) {
              setActiveSkipSegment(null);
              setSkipDismissed(false);
            }
          }
        }
      } else if (data.type === 'cinesrc:seeked' || data.type === 'cinesrc:seeking') {
        // Track seek events too for immediate progress update
        if (data.currentTime !== undefined && data.duration !== undefined && data.duration > 0) {
          handleProgressUpdate(data.currentTime, data.duration);
        }
      } else if (rawEvent === 'ended' || data.type === 'cinesrc:ended') {
        // Mark as complete before auto-next
        if (tmdbId) {
          handleProgressUpdate(100, 100); // 100% complete
        }
        handleAutoNext();
      } else if (data.type === 'cinesrc:nextepisode') {
        // CineSrc auto-advanced to next episode
        console.log('[WebView] CineSrc nextepisode:', data.season, data.episode);
        handleAutoNext();
      } else if (data.type === 'cinesrc:error') {
        setErrorDetails('This source is currently unavailable. Please try another server.');
      } else if (data.type === 'cinesrc:close') {
        navigation.goBack();
      } else if (data.type === 'fullscreen') {
        setIsFullscreen(data.enabled);
      } else if (data.type === 'cinesrc:response') {
        // Handle responses from CineSrc command API (getCurrentTime/getDuration)
        if (data.command === 'getCurrentTime' && data.result !== undefined) {
          cinesrcTimeRef.current = data.result;
        } else if (data.command === 'getDuration' && data.result !== undefined) {
          cinesrcDurationRef.current = data.result;
        }
        // If we have both values from polling, update progress
        if (cinesrcTimeRef.current > 0 && cinesrcDurationRef.current > 0) {
          handleProgressUpdate(cinesrcTimeRef.current, cinesrcDurationRef.current);
        }
      }
    } catch (e) {
      const rawData = event.nativeEvent.data;
      if (rawData === 'video_playing' || rawData === 'player_ready' || rawData === 'cinesrc:ready') {
        setIsPlayerReady(true);
      }
    }
  };

  const [showTrackingIndicator, setShowTrackingIndicator] = useState(false);
  const cinesrcTimeRef = useRef(0);
  const cinesrcDurationRef = useRef(0);

  const handleProgressUpdate = (currentTime, duration) => {
    if (!tmdbId || !duration || duration <= 0) return;
    
    const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));
    const now = Date.now();
    
    // Throttle storage updates to every 2 seconds for near-real-time tracking
    if (now - lastProgressUpdate.current > 2000) {
      lastProgressUpdate.current = now;
      console.log(`[WebView] Progress: ${progress.toFixed(1)}% (${Math.floor(currentTime)}s / ${Math.floor(duration)}s)`);
      
      try {
        addContinueWatchingEntry({
          tmdbId,
          mediaType,
          showName: showName || null,
          season: season !== undefined ? Number(season) : null,
          episode: episode !== undefined ? Number(episode) : null,
          title,
          progress,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration),
          thumb: currentThumb,
          appId,
          url,
          showName,
        });
      } catch (err) {
        console.error('[WebView] Progress save failed:', err);
      }
    }
  };

  // Active CineSrc Progress Polling — fallback if postMessage events aren't received
  // Uses CineSrc's command API: getCurrentTime() and getDuration() via postMessage
  useEffect(() => {
    if (!isPlayerReady || !isDirectEngine) return;
    
    const pollInterval = setInterval(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            var frames = document.querySelectorAll('iframe[src*="cinesrc"]');
            if (frames.length > 0) {
              var cmd1 = { type: 'cinesrc:command', command: 'getCurrentTime', args: [] };
              var cmd2 = { type: 'cinesrc:command', command: 'getDuration', args: [] };
              for (var i = 0; i < frames.length; i++) {
                try {
                  frames[i].contentWindow.postMessage(cmd1, 'https://cinesrc.st');
                  frames[i].contentWindow.postMessage(cmd2, 'https://cinesrc.st');
                } catch(e) {}
              }
            }
            // Also try direct video element
            var v = document.querySelector('video');
            if (v && v.duration > 0 && !isNaN(v.currentTime)) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'cinesrc:timeupdate',
                currentTime: v.currentTime,
                duration: v.duration
              }));
            }
          })();
          true;
        `);
      }
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(pollInterval);
  }, [isPlayerReady, isDirectEngine]);

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
    'adshield', 'ad-score', 'clktg', 'cobalten', 'highcpmgate', 'pubfuture', 'ezodn', 'ezoic', 'monetag', 'yandex',
    'adkeeper', 'mgid', 'runative', 'adoperator', 'recreativ', 'popmyads', 'ero-advertising', 'plugrush',
  ];

  // Domains that are allowed for the embed players to work
  const ALLOWED_ENGINE_DOMAINS = [
    'cinesrc.st',
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
    const AD_SELECTORS = [
      '[class*="banner"], [id*="banner"]',
      '[class*="popup"], [id*="popup"]',
      '[class*="overlay"]:not([class*="video"]):not([class*="player"])',
      '[id*="modal"], [class*="modal"]:not([class*="video"])',
      'iframe:not([src*="cinesrc"]):not([src*="rive"])',
      'ins.adsbygoogle',
      '#aswift_0_expand',
      '#google_ads_iframe',
      '.ad-container',
      '.ad-placement',
      '[class*="orientation"], [id*="orientation"]',
      '[class*="rotate"], [id*="rotate"]'
    ];

    const baseScript = `
      (function() {
        // A. Centralized dialog suppression helper
        function suppressDialogs(win) {
          try {
            if (!win) return;
            
            // Override directly on the window object
            win.alert = function() { console.log('[DialogBlock] Blocked alert'); return true; };
            win.confirm = function() { console.log('[DialogBlock] Blocked confirm'); return true; };
            win.prompt = function() { console.log('[DialogBlock] Blocked prompt'); return ""; };
            win.open = function(url) { console.log('[DialogBlock] Blocked window.open attempt to:', url); return null; };
            win.onbeforeunload = null;
            
            // Enforce using defineProperty so page scripts cannot easily overwrite them back
            try {
              Object.defineProperty(win, 'open', { value: function(url) { console.log('[DialogBlock] Blocked open:', url); return null; }, writable: false, configurable: false });
              Object.defineProperty(win, 'alert', { value: function() { return true; }, writable: false, configurable: false });
              Object.defineProperty(win, 'confirm', { value: function() { return true; }, writable: false, configurable: false });
              Object.defineProperty(win, 'prompt', { value: function() { return ""; }, writable: false, configurable: false });
              Object.defineProperty(win, 'onbeforeunload', { get: function() { return null; }, set: function() {}, configurable: false });
            } catch(e) {}

            // Intercept and drop 'beforeunload' event listeners
            try {
              var originalAdd = win.addEventListener;
              win.addEventListener = function(type, listener, options) {
                if (type === 'beforeunload') {
                  console.log('[DialogBlock] Blocked beforeunload listener');
                  return;
                }
                return originalAdd.apply(this, arguments);
              };
            } catch(e) {}
          } catch(e) {}
        }

        // B. Instantly suppress dialogs on the main frame window
        suppressDialogs(window);

        // C. Prototype-level interceptor for all dynamic same-origin iframe elements
        try {
          var iframeDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
          if (iframeDesc && iframeDesc.get) {
            Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
              get: function() {
                var win = iframeDesc.get.call(this);
                if (win) {
                  suppressDialogs(win);
                }
                return win;
              },
              configurable: true,
              enumerable: true
            });
          }
        } catch(e) {}

        try {
          var docDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
          if (docDesc && docDesc.get) {
            Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
              get: function() {
                var doc = docDesc.get.call(this);
                if (doc) {
                  var win = doc.defaultView || doc.parentWindow;
                  if (win) {
                    suppressDialogs(win);
                  }
                }
                return doc;
              },
              configurable: true,
              enumerable: true
            });
          }
        } catch(e) {}

        // D. Safe message posting helper
        function safePostMessage(msg) {
          try {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(msg);
            } else {
              window.parent.postMessage(msg, '*');
              window.top.postMessage(msg, '*');
            }
          } catch (e) {
            console.error('[AdBlock] safePostMessage failed:', e);
          }
        }

        // E. Intercept click redirects
        var EARLY_AD_BLOCK_LIST = \${JSON.stringify(AD_BLOCK_LIST)};

        document.addEventListener('click', function(e) {
          var target = e.target.closest('a');
          if (target) {
            var href = target.getAttribute('href');
            if (href) {
              var lowerHref = href.toLowerCase();
              var isBlocked = EARLY_AD_BLOCK_LIST.some(function(ad) {
                return lowerHref.includes(ad);
              });
              if (isBlocked || lowerHref.startsWith('intent://') || lowerHref.startsWith('market://')) {
                console.log('[AdBlock Early] Blocked click redirect to:', href);
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }
          }
        }, true);

        try {
          var realCreateElement = document.createElement;
          document.createElement = function(tagName, options) {
            var el = realCreateElement.call(document, tagName, options);
            if (tagName && tagName.toLowerCase() === 'a') {
              el.addEventListener('click', function(e) {
                var href = el.getAttribute('href') || el.href;
                if (href) {
                  var lowerHref = href.toLowerCase();
                  var isBlocked = EARLY_AD_BLOCK_LIST.some(function(ad) {
                    return lowerHref.includes(ad);
                  });
                  if (isBlocked || !lowerHref.startsWith('http')) {
                    console.log('[AdBlock Early] Blocked dynamic a tag redirect:', href);
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }
              }, true);
            }
            return el;
          };
        } catch(e) {}

        // F. Video detection & status reporting
        let playAttemptCount = 0;
        let hasStartedOnce = false;
        let loadTime = Date.now();

        function setupVideoListener() {
          const video = document.querySelector('video');
          const isEnginePage = window.location.href.includes('cinesrc');

          if (video && (video.currentTime > 0.5 || !video.paused)) {
            hasStartedOnce = true;
          }

          if (isEnginePage || video) {
            safePostMessage(JSON.stringify({ type: 'cinesrc:pulse_spoofed' }));
          }

          const timeSinceLoad = Date.now() - loadTime;
          if (video && video.paused && !hasStartedOnce && playAttemptCount < 20 && timeSinceLoad < 30000) {
            video.play().catch(() => {
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
              if (!v.dataset.sdmHooked) {
                v.dataset.sdmHooked = 'true';
                console.log('[WebView] Hooked native video element!');
                
                safePostMessage(JSON.stringify({ event: 'sdm:video_ready' }));
                
                v.addEventListener('timeupdate', function() {
                  safePostMessage(JSON.stringify({
                    event: 'timeupdate',
                    currentTime: v.currentTime,
                    duration: v.duration
                  }));
                });
                
                v.addEventListener('ended', function() {
                  safePostMessage(JSON.stringify({ event: 'ended' }));
                });
                
                v.addEventListener('play', function() {
                  hasStartedOnce = true;
                  // Signal to React Native that actual video playback has started
                  safePostMessage(JSON.stringify({ event: 'sdm:playback_started' }));
                });
              }

              if (!v.paused) {
                hasStartedOnce = true;
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
        setInterval(setupVideoListener, 1200);

        // G. Custom controls and gestures
        setInterval(() => {
          let v = null;
          let targetDoc = null;
          
          const searchDoc = (doc) => {
            if (!doc) return;
            const vid = doc.querySelector('video');
            if (vid) { 
              v = vid; 
              targetDoc = doc; 
              return; 
            }
            const frames = doc.querySelectorAll('iframe');
            for(let i = 0; i < frames.length; i++) {
              try { searchDoc(frames[i].contentDocument || frames[i].contentWindow.document); } catch(e) {}
              if (v) return;
            }
          };
          searchDoc(document);

          if (v && targetDoc && !targetDoc.getElementById('sdm-custom-controls-container')) {
             const container = targetDoc.createElement('div');
             container.id = 'sdm-custom-controls-container';
             container.style.cssText = 'position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; width: 100% !important; display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: center !important; gap: 30px !important; z-index: 2147483647 !important; pointer-events: none !important; opacity: 1 !important; visibility: visible !important;';
             
             const brightnessOverlay = targetDoc.createElement('div');
             brightnessOverlay.id = 'sdm-brightness-overlay';
             brightnessOverlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: black !important; opacity: 0 !important; z-index: 2147483645 !important; pointer-events: none !important; display: block !important; visibility: visible !important;';
             targetDoc.body.appendChild(brightnessOverlay);

             const indicator = targetDoc.createElement('div');
             indicator.id = 'sdm-gesture-indicator';
             indicator.style.cssText = 'position: fixed !important; top: 20% !important; left: 50% !important; transform: translateX(-50%) !important; background: rgba(0,0,0,0.7) !important; color: white !important; padding: 10px 20px !important; border-radius: 20px !important; font-family: sans-serif !important; font-size: 16px !important; font-weight: bold !important; z-index: 2147483647 !important; opacity: 0 !important; transition: opacity 0.2s !important; pointer-events: none !important; display: flex !important; align-items: center !important; gap: 8px !important; backdrop-filter: blur(4px) !important; visibility: visible !important;';
             targetDoc.body.appendChild(indicator);

             const createBtn = (svg, size) => {
               const btn = targetDoc.createElement('div');
               btn.style.cssText = 'width: ' + size + 'px !important; height: ' + size + 'px !important; background: rgba(0,0,0,0.6) !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; backdrop-filter: blur(4px) !important; border: 2px solid rgba(255,255,255,0.2) !important; flex-shrink: 0 !important; pointer-events: auto !important; visibility: visible !important; opacity: 1 !important;';
               btn.innerHTML = svg;
               return btn;
             };

             const playIcon = '<svg viewBox="0 0 24 24" fill="white" width="40" height="40" style="margin-left: 4px;"><path d="M8 5v14l11-7z"/></svg>';
             const pauseIcon = '<svg viewBox="0 0 24 24" fill="white" width="40" height="40"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
             const rwIcon = '<svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.1 11H9.5v-3.7H8V11.2h2.9v4.8zm3.3-4.8c-.8 0-1.4.6-1.4 1.4v2c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-2c0-.8-.6-1.4-1.4-1.4zm-.5 3.3c0 .3.2.5.5.5s.5-.2.5-.5v-1.8c0-.3-.2-.5-.5-.5s-.5.2-.5.5v1.8z"/></svg>';
             const ffIcon = '<svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M12 5c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4zm1.1 11h1.4v-3.7h1.5v-1.1h-2.9v4.8zm-3.3-4.8c.8 0 1.4.6 1.4 1.4v2c0 .8-.6 1.4-1.4 1.4s-1.4-.6-1.4-1.4v-2c0-.8.6-1.4 1.4-1.4zm.5 3.3c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-1.8c0-.3.2-.5.5-.5s.5.2.5.5v1.8z"/></svg>';

             const rwBtn = createBtn(rwIcon, 48);
             const playBtn = createBtn(v.paused ? playIcon : pauseIcon, 64);
             const ffBtn = createBtn(ffIcon, 48);

             container.appendChild(rwBtn);
             container.appendChild(playBtn);
             container.appendChild(ffBtn);
             targetDoc.body.appendChild(container);

             v.addEventListener('play', () => { 
               playBtn.innerHTML = pauseIcon; 
             });
             
             v.addEventListener('pause', () => { 
               playBtn.innerHTML = playIcon;
             });

             playBtn.addEventListener('click', (e) => {
               e.stopPropagation();
               if (v.paused) v.play().catch(()=>{});
               else v.pause();
             });

             rwBtn.addEventListener('click', (e) => {
               e.stopPropagation();
               v.currentTime = Math.max(0, v.currentTime - 10);
               showIndicator('⏪ -10s');
             });

             ffBtn.addEventListener('click', (e) => {
               e.stopPropagation();
               v.currentTime = Math.min(v.duration, v.currentTime + 10);
               showIndicator('⏩ +10s');
             });

             let indTimeout;
             const showIndicator = (text) => {
               indicator.innerHTML = text;
               indicator.style.opacity = '1';
               clearTimeout(indTimeout);
               indTimeout = setTimeout(() => { indicator.style.opacity = '0'; }, 1000);
             };

             let touchStartY = 0;
             let touchStartX = 0;
             let touchZone = '';
             let initialVol = v.volume;
             let initialBright = parseFloat(brightnessOverlay.style.opacity || '0');
             
             targetDoc.addEventListener('touchstart', (e) => {
               if (e.touches.length === 1) {
                 const t = e.touches[0];
                 touchStartX = t.clientX;
                 touchStartY = t.clientY;
                 
                 const width = window.innerWidth;
                 if (touchStartX < width * 0.3) {
                   touchZone = 'left';
                   initialBright = parseFloat(brightnessOverlay.style.opacity || '0');
                 } else if (touchStartX > width * 0.7) {
                   touchZone = 'right';
                   initialVol = v.volume;
                 } else {
                   touchZone = '';
                 }
               }
             }, {passive: true});

             targetDoc.addEventListener('touchmove', (e) => {
               if (touchZone && e.touches.length === 1) {
                 const t = e.touches[0];
                 const deltaY = touchStartY - t.clientY;
                 const height = window.innerHeight;
                 const deltaPercent = deltaY / (height * 0.3); 

                 if (touchZone === 'right') {
                   let newVol = Math.max(0, Math.min(1, initialVol + deltaPercent));
                   v.volume = newVol;
                   const percent = Math.round(newVol * 100);
                   showIndicator('🔊 Volume: ' + percent + '%');
                 } else if (touchZone === 'left') {
                   let newOpacity = initialBright - (deltaPercent * 0.8);
                   newOpacity = Math.max(0, Math.min(0.8, newOpacity));
                   brightnessOverlay.style.opacity = newOpacity;
                   const brightPercent = Math.round((1 - (newOpacity / 0.8)) * 100);
                   showIndicator('☀️ Brightness: ' + brightPercent + '%');
                 }
               }
             }, {passive: true});

             targetDoc.addEventListener('touchend', () => {
               touchZone = '';
             });
          }
        }, 1000);

        // H. Auto click/dismiss Captchas, Age gates, and Ad modals
        function findAndClickCaptchas(doc) {
          if (!doc) return;
          try {
            const elements = doc.querySelectorAll('button, a, div, span, input, svg, path, img, iframe');
            elements.forEach(el => {
              if (el.tagName === 'IFRAME') {
                try {
                  if (el.contentDocument) findAndClickCaptchas(el.contentDocument);
                } catch(e) {}
                return;
              }
              
              const text = (el.innerText || el.textContent || el.value || '').toLowerCase().trim();
              const id = (el.id || '').toLowerCase();
              const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
              const alt = (el.getAttribute?.('alt') || '').toLowerCase();
              
              let isGreenCircle = false;
              try {
                const style = window.getComputedStyle(el);
                const bg = style.backgroundColor || '';
                const hasRadius = style.borderRadius && (style.borderRadius.includes('50%') || parseInt(style.borderRadius) > 15);
                const g = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (g && hasRadius) {
                  const r = parseInt(g[1]);
                  const greenVal = parseInt(g[2]);
                  const b = parseInt(g[3]);
                  if (greenVal > r + 15 && greenVal > b + 15) {
                    isGreenCircle = true;
                  }
                }
              } catch(e) {}

              let shouldClick = 
                isGreenCircle ||
                text.includes('not a robot') ||
                text.includes('im not a robot') ||
                text.includes('i\'m not a robot') ||
                text.includes('click allow') ||
                text.includes('i am 18') ||
                text.includes('i\'m 18') ||
                text.includes('over 18') ||
                text.includes('18+') ||
                text.includes('agree') ||
                text.includes('continue anyways') ||
                text === 'continue anyways' ||
                id.includes('verify') ||
                cls.includes('verify') ||
                alt.includes('verify') ||
                alt.includes('check') ||
                alt.includes('checkmark') ||
                (el.tagName === 'path' && el.getAttribute('d')?.length > 100 && (cls.includes('check') || cls.includes('confirm')));

              if (!shouldClick) {
                const parentText = (el.parentElement?.innerText || '').toLowerCase();
                const parentHasAdKeywords = parentText.includes('attention') || parentText.includes('update') || parentText.includes('hurry') || parentText.includes('rotate') || parentText.includes('robot') || parentText.includes('verification') || parentText.includes('captcha') || parentText.includes('allow');
                if (parentHasAdKeywords) {
                  if (text === 'close' || text === 'continue' || text === 'allow' || text === 'x' || text === '×' || text.includes('close') || text.includes('continue') || text.includes('allow') || text.includes('×')) {
                    shouldClick = true;
                  }
                }
              }

              if (shouldClick) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  console.log('[AutoClick Recursive] Clicking element:', text || el.tagName);
                  
                  let current = el;
                  for (let i = 0; i < 3 && current; i++) {
                    current.click();
                    const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                    current.dispatchEvent(clickEvt);
                    try {
                      const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
                      current.dispatchEvent(touchStart);
                      const touchEnd = new Event('touchend', { bubbles: true, cancelable: true });
                      current.dispatchEvent(touchEnd);
                    } catch(e) {}
                    current = current.parentElement;
                  }
                }
              }
            });
          } catch(e) {}
        }

        // I. Hide dialog overlays & ad-blocks recursive same-origin
        function hideSameOriginBlockers(doc) {
          if (!doc) return;
          try {
            const bodyText = (doc.body?.innerText || '').toLowerCase();
            const triggers = ['robot', 'allow', 'antispam', 'rotate', 'phone', '18', 'attention', 'update', 'hurry', 'important'];
            const hasTrigger = triggers.some(t => bodyText.includes(t));
            
            if (hasTrigger) {
              doc.querySelectorAll('div, section, iframe, dialog').forEach(el => {
                if (el.tagName === 'IFRAME') {
                  try {
                    if (el.contentDocument) hideSameOriginBlockers(el.contentDocument);
                  } catch(e) {}
                  return;
                }
                
                const style = window.getComputedStyle(el);
                const position = style.position;
                const zIndex = parseInt(style.zIndex);
                const elText = (el.innerText || el.textContent || '').toLowerCase();
                
                // Match the modal dialog overlay
                const isAdOverlay = 
                  elText.includes('rotate') ||
                  elText.includes('phone') ||
                  elText.includes('over 18') ||
                  elText.includes('under 18') ||
                  elText.includes('18+') ||
                  elText.includes('attention') ||
                  elText.includes('confirm that you') ||
                  elText.includes('click "allow"') ||
                  elText.includes('click allow') ||
                  elText.includes('not a robot') ||
                  elText.includes('robot') ||
                  elText.includes('hurry up') ||
                  elText.includes('important update') ||
                  ((elText.includes('attention') || elText.includes('click more')) && (elText.includes('close') || elText.includes('more')));

                if (isAdOverlay) {
                  // Check if this element contains a video player (we never hide the video player)
                  if (!el.querySelector('video') && !el.querySelector('iframe[src*="cinesrc"]') && !el.querySelector('iframe[src*="rive"]')) {
                    
                    // BEFORE we hide the modal, let's auto-click any confirm/allow button inside it!
                    try {
                      const clickables = el.querySelectorAll('button, a, [role="button"], div, span, svg, path, img');
                      clickables.forEach(clickEl => {
                        const clickText = (clickEl.innerText || clickEl.textContent || '').toLowerCase().trim();
                        const clickCls = (typeof clickEl.className === 'string' ? clickEl.className : '').toLowerCase();
                        const clickId = (clickEl.id || '').toLowerCase();
                        
                        // Check if this clickEl is a green checkmark or confirm button
                        const isConfirmBtn = 
                          clickText === 'allow' || clickText === 'ok' || clickText.includes('allow') || clickText.includes('agree') || clickText.includes('confirm') || clickText.includes('over 18') ||
                          clickCls.includes('green') || clickCls.includes('success') || clickCls.includes('agree') || clickCls.includes('allow') || clickCls.includes('confirm') || clickCls.includes('check') ||
                          clickId.includes('agree') || clickId.includes('allow') || clickId.includes('confirm') || clickId.includes('check') ||
                          (clickEl.tagName === 'path' && clickEl.getAttribute('d')?.length > 50 && (clickCls.includes('check') || clickCls.includes('confirm') || clickCls.includes('success')));
                        
                        if (isConfirmBtn) {
                          const rect = clickEl.getBoundingClientRect();
                          if (rect.width > 0 && rect.height > 0) {
                            console.log('[AutoConfirm] Auto-clicking confirm button inside ad overlay:', clickText || clickEl.tagName);
                            clickEl.click();
                            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                            clickEl.dispatchEvent(evt);
                          }
                        }
                      });
                    } catch(e) {}

                    // Now hide and physically remove it!
                    el.style.setProperty('display', 'none', 'important');
                    el.style.setProperty('visibility', 'hidden', 'important');
                    el.style.setProperty('pointer-events', 'none', 'important');
                    try { el.remove(); } catch(e) {}
                  }
                }
              });
            }
          } catch(e) {}
        }

        // J. Recursively override same-origin iframe dialogs & strip sandbox
        function blockIframeDialogs(doc) {
          if (!doc) return;
          try {
            const win = doc.defaultView || doc.parentWindow;
            if (win) {
              suppressDialogs(win);
            }
            const frames = doc.querySelectorAll('iframe');
            frames.forEach(f => {
              try {
                // Remove sandbox restrictions ONLY from engine player iframes (not all iframes)
                var iframeSrc = (f.src || '').toLowerCase();
                var isEngineIframe = iframeSrc.includes('cinesrc') || iframeSrc.includes('rive') || iframeSrc.includes('vidsrc') || iframeSrc.includes('embed') || iframeSrc.includes('vidplay');
                if (f.hasAttribute('sandbox') && isEngineIframe) {
                  console.log('[WebView] Stripping sandbox attribute from engine iframe:', f.src);
                  f.removeAttribute('sandbox');
                }

                const iframeWin = f.contentWindow;
                if (iframeWin) {
                  suppressDialogs(iframeWin);
                }
                const iframeDoc = f.contentDocument || f.contentWindow.document;
                if (iframeDoc) {
                  blockIframeDialogs(iframeDoc);
                }
              } catch (e) {}
            });
          } catch (e) {}
        }

        // Relentless overlay clearance recursively for all same-origin levels
        function relentlessClearance(doc) {
          if (!doc) return;
          try {
            doc.querySelectorAll('div, a, section, iframe, dialog').forEach(div => {
              try {
                const style = window.getComputedStyle(div);
                const position = style.position;
                if (position === 'fixed' || position === 'absolute') {
                  const zIndex = parseInt(style.zIndex || '0');
                  const width = div.offsetWidth;
                  const height = div.offsetHeight;
                  if (zIndex > 10 && (width > window.innerWidth * 0.4 || height > window.innerHeight * 0.4)) {
                    // Check if it contains the video player or allowed iframes
                    const hasPlayer = !!(
                      div.querySelector('video') || 
                      div.querySelector('iframe[src*="cinesrc"]') || 
                      div.querySelector('iframe[src*="rive"]') || 
                      div.querySelector('canvas') || 
                      div.querySelector('.artplayer-app') || 
                      div.querySelector('.vjs-tech')
                    );
                    
                    if (!hasPlayer && !div.id.includes('player') && !div.id.includes('sdm-custom-controls-container') && !div.id.includes('sdm-brightness-overlay') && !div.id.includes('sdm-gesture-indicator') && !div.className.includes('controls')) {
                      console.log('[AdBlock] Relentlessly removing overlay:', div.id || div.className || div.tagName);
                      div.remove();
                    }
                  }
                }
              } catch(e) {}
            });
            
            const frames = doc.querySelectorAll('iframe');
            frames.forEach(f => {
              try { relentlessClearance(f.contentDocument || f.contentWindow.document); } catch(e) {}
            });
          } catch(e) {}
        }

        // Setup double-action shield triggers (MutationObserver + periodic safety Sweeps)
        try {
          const runBlockers = () => {
            findAndClickCaptchas(document);
            hideSameOriginBlockers(document);
            relentlessClearance(document);
            blockIframeDialogs(document);
          };
          
          if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(runBlockers);
            observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
          }
          
          // Fallback sweep interval
          setInterval(runBlockers, 300);
          
          // Initial trigger
          runBlockers();
        } catch(e) {}

        // K. CSS Style Shield Injection
        function injectCSS() {
          if (!document.getElementById('sdm-shield')) {
            const style = document.createElement('style');
            style.id = 'sdm-shield';
            style.innerHTML = ${JSON.stringify(AD_SELECTORS)}.join(', ') + " { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; height: 0 !important; width: 0 !important; position: absolute !important; left: -9999px !important; } " +
              "html, body { margin: 0 !important; padding: 0 !important; background: #000 !important; width: 100% !important; height: 100% !important; min-width: 100% !important; min-height: 100% !important; overflow: hidden !important; } " +
              "iframe[src*='cinesrc'], iframe[src*='rive'], video { display: block !important; width: 100% !important; height: 100% !important; border: none !important; margin: 0 !important; padding: 0 !important; min-width: 100% !important; min-height: 100% !important; object-fit: contain !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 10 !important; } " +
              ".vjs-control-bar, .vjs-big-play-button, .player-controls, [class*='controls'], .control-bar { z-index: 2147483647 !important; pointer-events: auto !important; opacity: 1 !important; visibility: visible !important; } " +
              ".vjs-play-control, .plyr__controls, .jw-controls, [class*='play-button'], [class*='play-pause'] { display: flex !important; display: block !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; } " +
              "* { box-sizing: border-box !important; }";
            document.head.appendChild(style);
          }
        }
        
        if (document.readyState === 'complete') injectCSS();
        else window.addEventListener('load', injectCSS);
        setInterval(injectCSS, 1200);

        // L. Viewport locking
        const existingMeta = document.querySelector('meta[name="viewport"]');
        if (existingMeta) {
          existingMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        } else {
          const meta = document.createElement('meta');
          meta.name = 'viewport';
          meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
          document.head.appendChild(meta);
        }
      })();
      true;
    `;

    return baseScript;
  };

  const webViewSource = { uri: currentUrl };

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
      {currentUrl && currentUrl !== 'streamdeck://direct' && currentUrl !== 'streamdeck://febbox' && (
        <WebView
          ref={webViewRef}
        source={webViewSource}
        style={[
          styles.webview, 
          { opacity: isPlayerReady ? 1 : 0 },
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
          hasSeekedRef.current = false;
          // Re-activate dialog blocker on each load
          if (NativeModules.DialogBlockerModule) {
            NativeModules.DialogBlockerModule.patchWebViews();
          }
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
        javaScriptCanOpenWindowsAutomatically={true}
        setSupportMultipleWindows={true}
        injectedJavaScriptForMainFrameOnly={false}
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
          
          // 1. Always allow standard local schemes & initial navigation
          if (requestUrl.startsWith('about:blank')) return true;
          if (requestUrl.startsWith('blob:')) return true;
          if (requestUrl.startsWith('data:')) return true;
          if (request.url === url) return true;

          // 2. Block all non-http/https protocols (deep links, App store/Play Store redirects)
          if (
            !requestUrl.startsWith('http://') && 
            !requestUrl.startsWith('https://')
          ) {
            console.log('[AdBlock] Blocked non-http/https redirect intent:', request.url);
            return false;
          }
          
          // 3. Block known ad/redirect networks
          const isAd = AD_BLOCK_LIST.some(ad => requestUrl.includes(ad));
          if (isAd) {
            console.log('[AdBlock] Blocked (Blocklist matched):', request.url);
            return false;
          }

          // 4. Strict Top Frame Protection: Prevent ad scripts from hijacking the player frame
          const isTop = request.isTopFrame ?? true;
          if (isTop) {
            const matchesAllowed = ALLOWED_ENGINE_DOMAINS.some(domain => requestUrl.includes(domain.toLowerCase()));
            const matchesOriginal = allowedDomain.current && requestUrl.includes(allowedDomain.current.toLowerCase());
            
            if (!matchesAllowed && !matchesOriginal) {
              console.log('[AdBlock] Blocked suspicious top-frame ad redirect:', request.url);
              return false;
            }
          } else {
            // For direct engine/moviebox subframes, strictly enforce whitelist
            if (isDirectEngine || isMovieBox) {
              const isAllowed = ALLOWED_ENGINE_DOMAINS.some(domain => requestUrl.includes(domain.toLowerCase()));
              if (!isAllowed) {
                console.log('[Whitelist] Blocked non-whitelisted iframe load:', request.url);
                return false;
              }
            }
          }

          return true;
        }}
      />
      )}

      {/* Cinematic Loading Overlay */}
      {(isLoaderVisible || errorDetails) && (
        <Animated.View 
          style={[
            styles.loadingOverlay, 
            { opacity: loaderOpacity }
          ]} 
          pointerEvents={isPlayerReady && !errorDetails ? 'none' : 'auto'}
        >
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
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
              {/* Premium dark gradient background matching the app's cinematic dark theme */}
              <LinearGradient 
                colors={['#07070B', '#0F0F1A']} 
                style={StyleSheet.absoluteFill} 
              />
              
              {currentThumb && (
                <>
                  <Image 
                    source={{ uri: currentThumb }} 
                    style={[StyleSheet.absoluteFill, { opacity: 0.22 }]} 
                    blurRadius={25} 
                  />
                  <LinearGradient 
                    colors={['rgba(7, 7, 11, 0.4)', 'rgba(15, 15, 26, 0.96)']} 
                    style={StyleSheet.absoluteFill} 
                  />
                </>
              )}
              <View style={{ alignItems: 'center', zIndex: 10, width: '85%' }}>
                {currentThumb && (
                  <View style={[styles.loadingThumbContainer, { shadowColor: themeColor }]}>
                    <Image source={{uri: currentThumb}} style={styles.loadingThumb} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.85)']}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                )}
                
                {/* Title and details */}
                <Text style={styles.loadingTitle}>{showName || title}</Text>
                {mediaType === 'tv' && season && episode && (
                  <Text style={styles.loadingSubtitle}>
                    Season {season} • Episode {episode} {title !== showName ? `"${title}"` : ''}
                  </Text>
                )}
                
                {/* Tagline */}
                {metadata?.tagline ? (
                  <Text style={styles.loadingTagline}>"{metadata.tagline}"</Text>
                ) : null}

                {/* OMDb Multi-Source Ratings */}
                {omdbData && (omdbData.imdbRating || omdbData.rottenTomatoes || omdbData.metacritic) && (
                  <View style={styles.omdbRatingsRow}>
                    {omdbData.imdbRating && (
                      <View style={[styles.ratingPill, { backgroundColor: 'rgba(245, 197, 24, 0.15)', borderColor: 'rgba(245, 197, 24, 0.3)' }]}>
                        <Text style={{ fontSize: 12 }}>⭐</Text>
                        <Text style={[styles.ratingValue, { color: '#F5C518' }]}>{omdbData.imdbRating}</Text>
                        <Text style={styles.ratingLabel}>IMDb</Text>
                      </View>
                    )}
                    {omdbData.rottenTomatoes && (
                      <View style={[styles.ratingPill, { backgroundColor: 'rgba(250, 82, 56, 0.15)', borderColor: 'rgba(250, 82, 56, 0.3)' }]}>
                        <Text style={{ fontSize: 12 }}>🍅</Text>
                        <Text style={[styles.ratingValue, { color: '#FA5238' }]}>{omdbData.rottenTomatoes}</Text>
                        <Text style={styles.ratingLabel}>RT</Text>
                      </View>
                    )}
                    {omdbData.metacritic && (
                      <View style={[styles.ratingPill, { backgroundColor: 'rgba(102, 204, 51, 0.15)', borderColor: 'rgba(102, 204, 51, 0.3)' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#66CC33' }}>M</Text>
                        <Text style={[styles.ratingValue, { color: '#66CC33' }]}>{omdbData.metacritic}</Text>
                        <Text style={styles.ratingLabel}>Meta</Text>
                      </View>
                    )}
                  </View>
                )}

                {omdbData?.awards && (
                  <View style={styles.awardsBadge}>
                    <Ionicons name="trophy" size={12} color="#FFD700" />
                    <Text style={styles.awardsText} numberOfLines={1}>{omdbData.awards}</Text>
                  </View>
                )}
 
                {/* Animated Progress Bar with % label */}
                <View style={{ width: '100%', marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>LOADING</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800' }}>{progressDisplay}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <Animated.View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: progressPercent.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }) 
                        }
                      ]} 
                    >
                      <LinearGradient
                        colors={[themeColor, Colors.accentPink]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  </View>
                </View>
 
                <Text style={styles.loadingStatusText}>
                  {isPlayerReady ? 'Starting playback...' : 'Optimizing connection speed...'}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
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
      {/* ── Skip Intro/Recap/Credits Button Overlay ──────── */}
      {activeSkipSegment && !skipDismissed && isPlayerReady && (
        <View style={styles.skipBtnContainer}>
          <TouchableOpacity
            style={styles.skipBtn}
            activeOpacity={0.8}
            onPress={() => {
              const target = getSkipTarget(activeSkipSegment);
              webViewRef.current?.injectJavaScript(`
                (function() {
                  var v = document.querySelector('video');
                  if (v) { v.currentTime = ${target}; }
                  var frames = document.querySelectorAll('iframe');
                  for (var i = 0; i < frames.length; i++) {
                    try { frames[i].contentWindow.postMessage({ command: 'seek', args: [${target}] }, '*'); } catch(e) {}
                  }
                })();
                true;
              `);
              setActiveSkipSegment(null);
              setSkipDismissed(true);
            }}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.85)', 'rgba(236, 72, 153, 0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.skipBtnGradient}
            >
              <Ionicons name={activeSkipSegment.icon || 'play-skip-forward'} size={16} color="#fff" />
              <Text style={styles.skipBtnText}>{activeSkipSegment.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipDismissBtn}
            onPress={() => setSkipDismissed(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Skip Button Overlay ────────────────────────────
  skipBtnContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10000,
    gap: 6,
  },
  skipBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  skipBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
  skipBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // ── OMDb Ratings ───────────────────────────────────
  omdbRatingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  ratingLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  awardsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    alignSelf: 'center',
  },
  awardsText: {
    color: 'rgba(255, 215, 0, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
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
  screen: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSizes.md,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingTagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  castContainer: {
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(13, 13, 22, 0.75)',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '100%',
    flex: 1, // Fill remaining bottom screen space
    minHeight: 300,
  },
  castTitle: {
    color: '#8b5cf6',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  scrollView: {
    width: '100%',
  },
  actorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
    paddingHorizontal: 4,
  },
  actorCard: {
    alignItems: 'center',
    width: '30%',
    marginHorizontal: '1.5%',
    marginBottom: 12,
  },
  actorImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 6,
  },
  actorPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 6,
  },
  actorName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  actorCharacter: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
    marginTop: 2,
  },
  progressBarBg: {
    width: '85%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    marginTop: 22,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  engagementContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(13, 13, 22, 0.75)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '90%',
  },
  engagementTitle: {
    color: '#8b5cf6',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  engagementText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  loadingStatusText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: FontSizes.xs,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loadingThumbContainer: {
    width: 140,
    height: 210,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    elevation: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 15,
  },
  loadingThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
