// StreamDeck Mobile — Settings Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
  Linking,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';

import {
  loadSettings,
  saveSettings,
  getDefaultSettings,
  getApiKey,
  saveApiKey as storageSaveApiKey,
  isDirectEngineEnabled,
  setDirectEngineEnabled,
  loadDefaultProvider,
  saveDefaultProvider,
} from '../utils/storage';
import SectionHeader from '../components/SectionHeader';
import { useApi } from '../context/ApiContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { signInWithGoogle, signOut, onAuthStateChanged, configureGoogleSignIn } from '../services/auth';
import { syncWithCloud } from '../services/sync';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fetchTMDBLanguages, fetchTMDBRegions } from '../services/tmdb';

const REGIONS = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
];



const CollapsibleHeader = ({ title, sectionKey, isExpanded, onToggle, subtitle }) => (
  <TouchableOpacity 
    style={styles.collapsibleHeader} 
    onPress={() => onToggle(sectionKey)}
    activeOpacity={0.7}
  >
    <Text style={styles.sectionLabel}>{title}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {!isExpanded && subtitle && (
        <View style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 12 }}>
          <Text style={{ color: '#4ADE80', fontSize: 11, fontFamily: 'Inter-Bold', letterSpacing: 0.5 }}>{subtitle}</Text>
        </View>
      )}
      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.textMuted} />
    </View>
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(getDefaultSettings());
  const [apiKey, setApiKeyState] = useState('');
  const [sourceStatuses, setSourceStatuses] = useState({});
  const [editingId, setEditingId] = useState(null); // Keep only for basic ref 
  const [showSaved, setShowSaved] = useState(false);

  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [directEngineActive, setDirectEngineActive] = useState(true);


  const [showApiKey, setShowApiKey] = useState(false);

  // Auto-scroll and flash refs
  const scrollRef = React.useRef(null);
  const movieboxY = React.useRef(0);
  const sportsY = React.useRef(0);
  const discoveryY = React.useRef(0);
  const flashOpacity = useSharedValue(0);
  const activeSection = useSharedValue('');

  const createFlashStyle = (section) => useAnimatedStyle(() => ({
    backgroundColor: Colors.accentPurple,
    opacity: activeSection.value === section ? flashOpacity.value * 0.15 : 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    zIndex: -1,
  }));

  const discoveryFlashStyle = createFlashStyle('discovery');
  const streamingFlashStyle = createFlashStyle('streaming');
  const sportsFlashStyle = createFlashStyle('sports');

  const { saveKey, checkKey } = useApi();

  const [expandedSections, setExpandedSections] = useState({
    account: true,
    personal: true,
    tmdb: false,
    region: false,
    directEngine: false,
    streaming: false,
    sports: false,
    playback: false,
    extensions: false,
    debrid: false,
    data: false
  });

  const [tmdbLanguages, setTmdbLanguages] = useState([]);
  const [langSearch, setLangSearch] = useState('');
  const [loadingLangs, setLoadingLangs] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  const [tmdbRegions, setTmdbRegions] = useState([]);
  const [regionSearch, setRegionSearch] = useState('');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key],
      // Close other sections for better focus if it's a major one
      ...(key === 'playback' ? { playback: !prev.playback } : {})
    }));
  };

  const [defaultProviderName, setDefaultProviderName] = useState('Not Set');

  const updateDefaultProviderName = async () => {
    const id = await loadDefaultProvider();
    if (!id) {
      setDefaultProviderName('Not Set');
      return;
    }
    
    // Map IDs to friendly names
    if (id === 'direct') setDefaultProviderName('StreamDeck Engine');
    else if (id === 'youtube') setDefaultProviderName('YouTube');
    else {
      // Try to find in settings sources
      const sources = [...(settings.movieboxSources || []), ...(settings.liveSportsProviders || [])];
      const source = sources.find((s, idx) => `moviebox_${idx}` === id || `custom_${idx}` === id);
      setDefaultProviderName(source ? source.name : 'Custom Provider');
    }
  };

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  // Auto-scroll and flash (moved Focus effect up to stabilize hook order)
  useFocusEffect(
    React.useCallback(() => {
      // Reload settings whenever screen is focused (e.g. returning from Source Manager)
      loadData();

      const { params } = navigation.getState().routes.find(r => r.name === 'Settings') || {};
      if (params?.highlightSection) {
        const section = params.highlightSection;
        setTimeout(() => {
          if (section === 'moviebox') {
            setExpandedSections(prev => ({ ...prev, streaming: true }));
            scrollRef.current?.scrollTo({ y: movieboxY.current - 100, animated: true });
          } else if (section === 'sports') {
            setExpandedSections(prev => ({ ...prev, sports: true }));
            scrollRef.current?.scrollTo({ y: sportsY.current - 100, animated: true });
          } else if (section === 'discovery') {
            setExpandedSections(prev => ({ ...prev, discovery: true }));
            scrollRef.current?.scrollTo({ y: discoveryY.current - 100, animated: true });
          }

          // Set active section for flash
          activeSection.value = section === 'moviebox' ? 'streaming' : section;

          // Flash for 3 seconds
          flashOpacity.value = withRepeat(
            withSequence(
              withTiming(1, { duration: 500 }),
              withTiming(0, { duration: 500 })
            ),
            3,
            true,
            () => {
              flashOpacity.value = 0;
              activeSection.value = '';
            }
          );

          // Clear params after handling so it doesn't flash again
          navigation.setParams({ highlightSection: null });
        }, 500);
      }
    }, [navigation])
  );

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);
    if (settings) {
      await saveSettings(settings); // Force flush current UI state to storage before syncing!
    }
    if (apiKey !== undefined) {
      const { saveApiKey: storageSaveApiKey } = require('../utils/storage');
      await storageSaveApiKey(apiKey.trim()); // Flush API key state too
    }
    await syncWithCloud(user.uid);
    setSyncing(false);
    loadData(); // Ensure UI reflects any merged cloud data
  };

  useEffect(() => {
    (async () => {
      setLoadingLangs(true);
      try {
        const langs = await fetchTMDBLanguages();
        // Sort: Put major Indian languages first if they exist
        const priority = ['hi', 'te', 'ta', 'ml', 'kn', 'bn', 'en', 'ko', 'ja'];
        const sorted = langs.sort((a, b) => {
          const aIdx = priority.indexOf(a.iso_639_1);
          const bIdx = priority.indexOf(b.iso_639_1);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return a.english_name.localeCompare(b.english_name);
        });
        setTmdbLanguages(sorted);
      } finally {
        setLoadingLangs(false);
      }

      setLoadingRegions(true);
      try {
        const regions = await fetchTMDBRegions();
        setTmdbRegions(regions.sort((a, b) => a.native_name.localeCompare(b.native_name)));
      } finally {
        setLoadingRegions(false);
      }
    })();
  }, []);


  const filteredLangs = tmdbLanguages.filter(l => 
    l.english_name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.iso_639_1.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleLanguageSelect = (langCode) => {
    setSettings(prev => {
      if (!langCode) {
        return { ...prev, preferredLanguages: [] };
      }
      const recent = prev.recentLanguages || [];
      const updatedRecent = [langCode, ...recent.filter(c => c !== langCode)].slice(0, 10);
      return { 
        ...prev, 
        preferredLanguages: [langCode],
        recentLanguages: updatedRecent
      };
    });
    setShowLangModal(false);
    setLangSearch('');
  };

  const handleRegionSelect = (regionCode) => {
    setSettings(prev => {
      const recent = prev.recentRegions || [];
      const updatedRecent = [regionCode, ...recent.filter(c => c !== regionCode)].slice(0, 10);
      return { 
        ...prev, 
        contentRegion: regionCode,
        recentRegions: updatedRecent
      };
    });
    setShowRegionModal(false);
    setRegionSearch('');
  };

  const currentLangName = settings.preferredLanguages?.length > 0 
    ? (tmdbLanguages.find(l => l.iso_639_1 === settings.preferredLanguages[0])?.english_name || 'Selected')
    : 'All Languages';

  const filteredRegions = tmdbRegions.filter(r => 
    r.english_name.toLowerCase().includes(regionSearch.toLowerCase()) ||
    r.iso_3166_1.toLowerCase().includes(regionSearch.toLowerCase()) ||
    r.native_name.toLowerCase().includes(regionSearch.toLowerCase())
  );


  const currentRegionName = tmdbRegions.find(r => r.iso_3166_1 === settings.contentRegion)?.english_name || 
                           REGIONS.find(r => r.code === settings.contentRegion)?.name || 'India';




  useEffect(() => {
    loadData();
    configureGoogleSignIn();
    
    const unsubscribe = onAuthStateChanged(async (u) => {
      setUser(u);
      
      // Auto-collapse Account section if signed in
      setExpandedSections(prev => ({
        ...prev,
        account: !u
      }));

      if (u) {
        setSyncing(true);
        await syncWithCloud(u.uid);
        setSyncing(false);
        loadData(); // RE-LOAD after sync
      }
    });
    updateDefaultProviderName();
    return unsubscribe;
  }, []);

  // Auto-save Settings
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (settings) {
        await saveSettings(settings);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 1500);
      }
    }, 1500); // Increased debounce to 1.5s
    return () => clearTimeout(timer);
  }, [settings]);

  // Auto-save API Key
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (apiKey !== undefined) {
        const cleanKey = apiKey.trim();
        await storageSaveApiKey(cleanKey);
        // Silently update API context
        if (cleanKey) {
          try {
            const res = await fetch(`https://api.tmdb.org/3/configuration?api_key=${cleanKey}`);
            if (res.ok) {
              // Valid key, we're good
            }
          } catch (e) {}
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [apiKey]);

  const loadData = async () => {
    const s = await loadSettings();
    setSettings(s);
    const key = await getApiKey();
    setApiKeyState(key || '');
    const directEnabled = await isDirectEngineEnabled();
    setDirectEngineActive(directEnabled);
    
    // Initial ping for enabled sources
    [...(s.movieboxSources || []), ...(s.liveSportsProviders || [])]
      .filter(source => source.enabled)
      .forEach(source => testConnection(source.url));
  };

  // focus effect moved up

  const testConnection = async (url) => {
    if (!url) return;
    setSourceStatuses(prev => ({ ...prev, [url]: 'testing' }));
    try {
      let testUrl = url.trim();
      if (!/^https?:\/\//i.test(testUrl)) {
        testUrl = `https://${testUrl}`;
      }
      
      // Use a standard GET with a short timeout via Promise.race
      const fetchPromise = fetch(testUrl);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const res = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (res && res.status >= 200) {
        setSourceStatuses(prev => ({ ...prev, [url]: 'success' }));
      } else {
        setSourceStatuses(prev => ({ ...prev, [url]: 'error' }));
      }
    } catch (e) {
      setSourceStatuses(prev => ({ ...prev, [url]: 'error' }));
    }
  };

  // handleSave removed in favor of auto-save effect

  const toggleSource = (type, index) => {
    const updated = { ...settings };
    const list = type === 'moviebox' ? updated.movieboxSources : updated.liveSportsProviders;
    
    if (!list[index].enabled) {
      const enabledCount = list.filter(s => s.enabled).length;
      if (enabledCount >= 3) {
        Alert.alert('Limit Reached', `You can only enable up to 3 ${type === 'moviebox' ? 'streaming sources' : 'sports providers'} at a time. Please disable one first.`);
        return;
      }
    }

    list[index].enabled = !list[index].enabled;
    setSettings(updated);
    if (list[index].enabled) testConnection(list[index].url);
  };

  // Handlers for managing sources moved to SourceManagerScreen




  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom || 80 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPadding }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Settings</Text>
            {showSaved && <Text style={styles.autoSaveText}>Auto-saved</Text>}
          </View>
          <View style={{ width: 40 }} /> 
        </View>

        <View style={{ height: Spacing.md }} />

        {/* Account & Sync - NOW ON TOP */}
        <View style={styles.section}>
          <CollapsibleHeader 
            title="ACCOUNT & SYNC" 
            sectionKey="account" 
            isExpanded={expandedSections.account}
            onToggle={toggleSection}
            subtitle={user ? '✓ CONNECTED' : null}
          />
          {expandedSections.account && (
            <View style={styles.card}>
              {user ? (
                <View style={styles.connectedCard}>
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
                    style={styles.connectedGradient}
                  >
                    <View style={styles.connectedHeader}>
                      <View style={styles.successBadge}>
                        <Text style={styles.successCheck}>✓</Text>
                      </View>
                      <View style={styles.connectedTextInfo}>
                        <Text style={styles.connectedStatus}>Successfully Connected</Text>
                        <Text style={styles.connectedUser}>{user.displayName || 'Synced Account'}</Text>
                        <Text style={styles.connectedEmail}>{user.email}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.connectedActions}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.syncNowBtn, syncing && { opacity: 0.7 }]}
                        onPress={async () => {
                          if (syncing) return;
                          try {
                            await handleManualSync();
                            Alert.alert('Sync Complete', 'Your settings and library are now secured in the cloud.');
                          } catch (e) {
                            setSyncing(false);
                            Alert.alert('Sync Failed', 'Could not reach the cloud. Check your connection.');
                          }
                        }}
                        disabled={syncing}
                      >
                        {syncing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Sync</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.switchAccountBtn]}
                        onPress={async () => {
                          try {
                            setSyncing(true);
                            await signInWithGoogle();
                            setSyncing(false);
                          } catch (e) {
                            setSyncing(false);
                          }
                        }}
                      >
                        <Ionicons name="swap-horizontal" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Switch</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.logoutBtn]}
                        onPress={async () => {
                          await signOut();
                          Alert.alert('Signed Out', 'Cloud sync is now disabled.');
                        }}
                      >
                        <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                        <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Sign Out</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Cloud Sync</Text>
                  <Text style={styles.fieldHint}>
                    Keep your Library and Settings synced across all your devices.
                  </Text>
                  <TouchableOpacity 
                    style={styles.googleBtn}
                    onPress={async () => {
                      try {
                        setSyncing(true);
                        await signInWithGoogle();
                        setSyncing(false);
                      } catch (e) {
                        setSyncing(false);
                        if (e.code !== 'ASYNC_OP_IN_PROGRESS') {
                          Alert.alert('Sync Failed', 'Could not connect to Google.');
                        }
                      }
                    }}
                  >
                    <Text style={styles.googleBtnText}>Sign in with Google</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.privacyNote}>
                <Text style={styles.privacyNoteText}>
                  🛡️ <Text style={{ fontWeight: 'bold' }}>Privacy First:</Text> Cloud sync is optional.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Personal Section */}
        <View style={styles.section}>
          <CollapsibleHeader 
            title="PERSONAL" 
            sectionKey="personal" 
            isExpanded={expandedSections.personal}
            onToggle={toggleSection}
          />
          {expandedSections.personal && (
            <View style={styles.card}>
              <TouchableOpacity 
                style={styles.libraryRow}
                onPress={() => navigation.navigate('Library')}
                activeOpacity={0.7}
              >
                <View style={styles.libraryIconBox}>
                  <Text style={styles.libraryEmoji}>☰</Text>
                </View>
                <View style={styles.libraryInfo}>
                  <Text style={styles.libraryTitle}>My Library</Text>
                  <Text style={styles.librarySubtitle}>Your watchlist and saved gems</Text>
                </View>
                <Text style={styles.chevron}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* TMDB API Key */}
        <View style={styles.section}>
          <CollapsibleHeader 
            title="TMDB API" 
            sectionKey="tmdb" 
            isExpanded={expandedSections.tmdb}
            onToggle={toggleSection}
          />
          {expandedSections.tmdb && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>TMDB API Key</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.themoviedb.org/settings/api')}>
                  <Text style={styles.pingLink}>Get API Key ↗</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHint}>
                Used for posters, trending lists, and search results.
              </Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.innerInput}
                  value={apiKey}
                  onChangeText={setApiKeyState}
                  placeholder="Paste your TMDB API key here..."
                  placeholderTextColor={Colors.textMuted}
                  autoCorrect={false}
                  autoCapitalize="none"
                  secureTextEntry={!showApiKey}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowApiKey(!showApiKey)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIcon}>{showApiKey ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Discovery Settings (Consolidated) */}
        <View 
          style={styles.section}
          onLayout={e => discoveryY.current = e.nativeEvent.layout.y}
        >
          <CollapsibleHeader 
            title="DISCOVERY SETTINGS" 
            sectionKey="discovery" 
            isExpanded={expandedSections.discovery}
            onToggle={toggleSection}
            subtitle={`${currentRegionName} • ${currentLangName}`}
          />
          <Animated.View style={discoveryFlashStyle} pointerEvents="none" />
          {expandedSections.discovery && (
            <View style={styles.card}>
              <View style={styles.discoveryActionRow}>
                {/* Region Selector Card */}
                <TouchableOpacity 
                  style={styles.discoveryActionCard}
                  onPress={() => setShowRegionModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: 'rgba(74, 222, 128, 0.1)' }]}>
                    <Ionicons name="earth" size={18} color="#4ADE80" />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text style={styles.actionLabel}>Region</Text>
                    <Text style={styles.actionValue} numberOfLines={1}>{currentRegionName}</Text>
                  </View>
                </TouchableOpacity>

                {/* Language Selector Card */}
                <TouchableOpacity 
                  style={styles.discoveryActionCard}
                  onPress={() => setShowLangModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: 'rgba(157, 78, 221, 0.1)' }]}>
                    <Ionicons name="language" size={18} color={Colors.accentPurple} />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text style={styles.actionLabel}>Language</Text>
                    <Text style={styles.actionValue} numberOfLines={1}>{currentLangName}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.discoveryFooter}>
                <Ionicons name="information-circle-outline" size={12} color="rgba(255,255,255,0.2)" style={{ marginRight: 6 }} />
                <Text style={styles.discoveryFooterText}>
                  Home feed is synchronized with these regional preferences.
                </Text>
              </View>
            </View>

          )}
        </View>


        {/* StreamDeck Direct Engine */}
        <View style={styles.section}>
          <CollapsibleHeader 
            title="STREAMDECK DIRECT ENGINE" 
            sectionKey="directEngine"
            isExpanded={expandedSections.directEngine}
            onToggle={toggleSection}
            subtitle={directEngineActive ? 'Unified HD Engine Active' : 'Engines Disabled'}
          />
          {expandedSections.directEngine && (
              <View style={styles.engineCard}>
                <View style={styles.engineHeader}>
                  <View style={styles.engineInfo}>
                    <Text style={styles.engineTitle}>StreamDeck Unified Engine</Text>
                    <Text style={styles.engineDesc}>Intelligently routes across multiple servers to find your content with zero ads and direct playback.</Text>
                  </View>
                  <Switch
                    value={directEngineActive}
                    onValueChange={async (val) => {
                      setDirectEngineActive(val);
                      await setDirectEngineEnabled(val);
                    }}
                    trackColor={{ false: '#333', true: 'rgba(139, 92, 246, 0.5)' }}
                    thumbColor={directEngineActive ? Colors.accentPurple : '#666'}
                  />
                </View>

                <View style={styles.engineBadge}>
                  <Ionicons name="flash" size={12} color="#f59e0b" />
                  <Text style={styles.engineBadgeText}>ULTRA-FAST HD PIPELINE ACTIVE</Text>
                </View>

                <View style={styles.enginePriorityList}>
                  <Text style={styles.prioritySublabel}>Active Server Engine:</Text>
                  <View style={styles.priorityItem}>
                    <View style={styles.priorityInfo}>
                      <View style={[styles.priorityIndex, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                        <Ionicons name="server" size={12} color={Colors.accentPurple} />
                      </View>
                      <Text style={styles.priorityName}>CineSrc Engine (Ultra HD Server)</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.engineNote}>
                  StreamDeck directly interfaces with CineSrc to provide an uninterrupted, high-quality viewing experience.
                </Text>
              </View>
          )}
        </View>
        
        {/* Playback Preferences */}
        <View style={styles.section}>
          <CollapsibleHeader 
            title="PLAYBACK PREFERENCES" 
            sectionKey="playback"
            isExpanded={expandedSections.playback}
            onToggle={toggleSection}
            subtitle={defaultProviderName !== 'Not Set' ? `Default: ${defaultProviderName}` : 'No Default Set'}
          />
          {expandedSections.playback && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Default Streaming Provider</Text>
              <Text style={styles.fieldHint}>
                If set, the "Available On" modal will be bypassed, and content will start instantly using your favorite service.
              </Text>
              
              <View style={styles.defaultProviderRow}>
                <View style={styles.defaultProviderInfo}>
                  <View style={[styles.statusDot, defaultProviderName !== 'Not Set' ? styles.statusDotSuccess : { backgroundColor: '#666' }]} />
                  <Text style={styles.currentDefaultText}>
                    {defaultProviderName !== 'Not Set' ? `Current: ${defaultProviderName}` : 'Standard (Always Ask)'}
                  </Text>
                </View>
                
                {defaultProviderName !== 'Not Set' && (
                  <TouchableOpacity 
                    style={styles.resetDefaultBtn}
                    onPress={async () => {
                      await saveDefaultProvider(null);
                      await updateDefaultProviderName();
                      Alert.alert('Preference Reset', 'The app will now ask you which provider to use for every playback.');
                    }}
                  >
                    <Text style={styles.resetDefaultBtnText}>Reset to Default</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.tipBox}>
                <Ionicons name="bulb-outline" size={16} color="#fbbf24" style={{ marginRight: 8 }} />
                <Text style={styles.tipText}>
                  You can set a default anytime from the "Available On" modal by checking the "Always use this" box.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Extensions & Add-ons */}
        <View style={styles.section}>
          <CollapsibleHeader 
            title="EXTENSIONS & ADD-ONS" 
            sectionKey="extensions"
            isExpanded={expandedSections.extensions}
            onToggle={toggleSection}
            subtitle="API Integrations"
          />
          {expandedSections.extensions && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Integrations</Text>
              <Text style={styles.fieldHint}>
                Enable experimental third-party integrations for enhanced streaming features.
              </Text>
              
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>FebBox Protocol</Text>
                  <Text style={styles.toggleDesc}>Advanced streaming sources and cloud drive integration.</Text>
                </View>
                <Switch
                  value={settings.febboxEnabled}
                  onValueChange={(val) => setSettings(prev => ({...prev, febboxEnabled: val}))}
                  trackColor={{ false: '#333', true: 'rgba(16, 185, 129, 0.4)' }}
                  thumbColor={settings.febboxEnabled ? '#10b981' : '#666'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Wyzie Subtitles</Text>
                  <Text style={styles.toggleDesc}>Auto-fetch missing subtitles globally.</Text>
                </View>
                <Switch
                  value={settings.wyzieEnabled}
                  onValueChange={(val) => setSettings(prev => ({...prev, wyzieEnabled: val}))}
                  trackColor={{ false: '#333', true: 'rgba(16, 185, 129, 0.4)' }}
                  thumbColor={settings.wyzieEnabled ? '#10b981' : '#666'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Skip Intro (IntroDB)</Text>
                  <Text style={styles.toggleDesc}>Show skip buttons for intros, recaps, and credits.</Text>
                </View>
                <Switch
                  value={settings.skipIntroEnabled}
                  onValueChange={(val) => setSettings(prev => ({...prev, skipIntroEnabled: val}))}
                  trackColor={{ false: '#333', true: 'rgba(16, 185, 129, 0.4)' }}
                  thumbColor={settings.skipIntroEnabled ? '#10b981' : '#666'}
                />
              </View>

              <View style={[styles.toggleRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>OMDb Ratings</Text>
                  <Text style={styles.toggleDesc}>Display multi-source ratings (IMDb, Rotten Tomatoes, Metacritic).</Text>
                </View>
                <Switch
                  value={settings.omdbEnabled}
                  onValueChange={(val) => setSettings(prev => ({...prev, omdbEnabled: val}))}
                  trackColor={{ false: '#333', true: 'rgba(16, 185, 129, 0.4)' }}
                  thumbColor={settings.omdbEnabled ? '#10b981' : '#666'}
                />
              </View>

            </View>
          )}
        </View>

        {/* Streaming Sources */}
        <View
          style={styles.section}
          onLayout={e => movieboxY.current = e.nativeEvent.layout.y}
        >
          <CollapsibleHeader 
            title="STREAMING SOURCES" 
            sectionKey="streaming" 
            isExpanded={expandedSections.streaming}
            onToggle={toggleSection}
          />
          <Animated.View style={streamingFlashStyle} pointerEvents="none" />
          {expandedSections.streaming && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>MovieBox Sources</Text>
              <Text style={styles.fieldHint}>
                Add multiple domains to ensure a stable streaming experience.
              </Text>
              
              {settings.movieboxSources.map((source, idx) => (
                <View key={idx} style={[styles.sourceItem, !source.enabled && { opacity: 0.6 }]}>
                    <View style={styles.sourceMain}>
                      <View style={styles.sourceInfo}>
                        <View style={[styles.statusDot, 
                          sourceStatuses[source.url] === 'success' && styles.statusDotSuccess,
                          sourceStatuses[source.url] === 'error' && styles.statusDotError,
                          sourceStatuses[source.url] === 'testing' && styles.statusDotTesting
                        ]} />
                        <View>
                          <Text style={styles.sourceName} numberOfLines={1}>{source.name}</Text>
                          <Text style={styles.sourceUrlSmall} numberOfLines={1}>{source.url}</Text>
                        </View>
                      </View>
                      <View style={styles.sourceActions}>
                        <Switch 
                          value={source.enabled}
                          onValueChange={() => toggleSource('moviebox', idx)}
                          trackColor={{ false: '#333', true: 'rgba(16, 185, 129, 0.4)' }}
                          thumbColor={source.enabled ? '#10b981' : '#666'}
                        />
                      </View>
                    </View>
                </View>
              ))}

              <TouchableOpacity 
                style={styles.manageBtn}
                onPress={() => navigation.navigate('SourceManager', { type: 'moviebox' })}
              >
                <LinearGradient
                  colors={['rgba(157, 78, 221, 0.2)', 'rgba(157, 78, 221, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.manageGradient}
                >
                  <Text style={styles.manageBtnText}>Manage Sources</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Live Sports Providers */}
        <View
          style={styles.section}
          onLayout={e => sportsY.current = e.nativeEvent.layout.y}
        >
          <CollapsibleHeader 
            title="LIVE SPORTS" 
            sectionKey="sports" 
            isExpanded={expandedSections.sports}
            onToggle={toggleSection}
          />
          <Animated.View style={sportsFlashStyle} pointerEvents="none" />
          {expandedSections.sports && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Sports Providers</Text>
              
              {settings.liveSportsProviders.map((provider, idx) => (
                <View key={idx} style={[styles.sourceItem, !provider.enabled && { opacity: 0.6 }]}>
                    <View style={styles.sourceMain}>
                      <View style={styles.sourceInfo}>
                        <View style={[styles.statusDot, 
                          sourceStatuses[provider.url] === 'success' && styles.statusDotSuccess,
                          sourceStatuses[provider.url] === 'error' && styles.statusDotError,
                          sourceStatuses[provider.url] === 'testing' && styles.statusDotTesting
                        ]} />
                        <View>
                          <Text style={styles.sourceName} numberOfLines={1}>{provider.name}</Text>
                          <Text style={styles.sourceUrlSmall} numberOfLines={1}>{provider.url}</Text>
                        </View>
                      </View>
                      <View style={styles.sourceActions}>
                        <Switch 
                          value={provider.enabled}
                          onValueChange={() => toggleSource('sports', idx)}
                          trackColor={{ false: '#333', true: 'rgba(16, 185, 129, 0.4)' }}
                          thumbColor={provider.enabled ? '#10b981' : '#666'}
                        />
                      </View>
                    </View>
                </View>
              ))}

              <TouchableOpacity 
                style={styles.manageBtn}
                onPress={() => navigation.navigate('SourceManager', { type: 'sports' })}
              >
                <LinearGradient
                  colors={['rgba(157, 78, 221, 0.2)', 'rgba(157, 78, 221, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.manageGradient}
                >
                  <Text style={styles.manageBtnText}>Manage Providers</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>StreamDeck Mobile v{DeviceInfo.getVersion()}</Text>
          <Text style={[styles.infoText, { fontSize: 10, marginTop: 4, opacity: 0.5 }]}>
            World Cup backdrop: oil painting via Easy-Peasy.AI
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>



      {/* Language Picker Modal */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalDismissZone} 
            activeOpacity={1} 
            onPress={() => setShowLangModal(false)} 
          />
          <View style={[styles.modalContent, { paddingBottom: 40 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Discovery Language</Text>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.3)" style={{ marginLeft: 16 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search 200+ languages..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={langSearch}
                onChangeText={setLangSearch}
                autoCorrect={false}
              />
              {langSearch.length > 0 && (
                <TouchableOpacity onPress={() => setLangSearch('')} style={{ padding: 10 }}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingLangs ? (
                <ActivityIndicator color={Colors.accentPurple} style={{ marginTop: 40 }} />
              ) : (
                <>
                  {/* Global Discovery Option */}
                  {!langSearch && (
                    <TouchableOpacity 
                      style={[styles.langItem, (!settings.preferredLanguages || settings.preferredLanguages.length === 0) && styles.langItemActive]}
                      onPress={() => handleLanguageSelect(null)}
                    >
                      <View style={[styles.langItemCodeBox, { backgroundColor: 'rgba(157, 78, 221, 0.1)', width: 32, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 12 }]}>
                        <Ionicons name="globe-outline" size={12} color={Colors.accentPurple} />
                      </View>
                      <Text style={[styles.langItemText, (!settings.preferredLanguages || settings.preferredLanguages.length === 0) && styles.langItemTextActive]}>
                        All Languages (Global)
                      </Text>
                      {(!settings.preferredLanguages || settings.preferredLanguages.length === 0) && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.accentPurple} />
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Recently Used Section */}
                  {!langSearch && (settings.recentLanguages || []).length > 0 && (
                    <View style={{ marginBottom: 24, marginTop: 16 }}>
                      <Text style={styles.langSectionTitle}>Recently Used</Text>
                      {(settings.recentLanguages || []).map(code => {
                        const lang = tmdbLanguages.find(l => l.iso_639_1 === code);
                        if (!lang) return null;
                        const isActive = settings.preferredLanguages?.[0] === code;
                        return (
                          <TouchableOpacity 
                            key={`recent-${code}`}
                            style={[styles.langItem, isActive && styles.langItemActive]}
                            onPress={() => handleLanguageSelect(code)}
                          >
                            <Text style={styles.langItemCode}>{code.toUpperCase()}</Text>
                            <Text style={[styles.langItemText, isActive && styles.langItemTextActive]}>
                              {lang.english_name}
                            </Text>
                            {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.accentPurple} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Search Results / All Section */}
                  <Text style={styles.langSectionTitle}>
                    {langSearch ? 'Search Results' : 'All Languages'}
                  </Text>
                  {filteredLangs.slice(0, 100).map(lang => {
                    const isActive = settings.preferredLanguages?.[0] === lang.iso_639_1;
                    return (
                      <TouchableOpacity 
                        key={lang.iso_639_1}
                        style={[styles.langItem, isActive && styles.langItemActive]}
                        onPress={() => handleLanguageSelect(lang.iso_639_1)}
                      >
                        <Text style={styles.langItemCode}>{lang.iso_639_1.toUpperCase()}</Text>
                        <Text style={[styles.langItemText, isActive && styles.langItemTextActive]}>
                          {lang.english_name}
                        </Text>
                        {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.accentPurple} />}
                      </TouchableOpacity>
                    );
                  })}
                  
                  {filteredLangs.length === 0 && (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.1)" />
                      <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12, fontWeight: '600' }}>No languages found</Text>
                    </View>
                  )}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Region Picker Modal */}
      <Modal
        visible={showRegionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalDismissZone} 
            activeOpacity={1} 
            onPress={() => setShowRegionModal(false)} 
          />
          <View style={[styles.modalContent, { paddingBottom: 40 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalHandle, { backgroundColor: '#4ADE80' }]} />
              <Text style={styles.modalTitle}>Select Region</Text>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.3)" style={{ marginLeft: 16 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={regionSearch}
                onChangeText={setRegionSearch}
                autoCorrect={false}
              />
              {regionSearch.length > 0 && (
                <TouchableOpacity onPress={() => setRegionSearch('')} style={{ padding: 10 }}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingRegions ? (
                <ActivityIndicator color="#4ADE80" style={{ marginTop: 40 }} />
              ) : (
                <>
                  {/* Recently Used Regions */}
                  {!regionSearch && (settings.recentRegions || []).length > 0 && (
                    <View style={{ marginBottom: 24, marginTop: 16 }}>
                      <Text style={styles.langSectionTitle}>Recently Used</Text>
                      {(settings.recentRegions || []).map(code => {
                        const reg = tmdbRegions.find(r => r.iso_3166_1 === code);
                        if (!reg) return null;
                        const isActive = settings.contentRegion === code;
                        return (
                          <TouchableOpacity 
                            key={`recent-reg-${code}`}
                            style={[styles.langItem, isActive && styles.langItemActive]}
                            onPress={() => handleRegionSelect(code)}
                          >
                            <Text style={styles.langItemCode}>{code}</Text>
                            <Text style={[styles.langItemText, isActive && styles.langItemTextActive]}>
                              {reg.english_name}
                            </Text>
                            {isActive && <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <Text style={styles.langSectionTitle}>
                    {regionSearch ? 'Search Results' : 'All Regions'}
                  </Text>
                  {filteredRegions.map(reg => {
                    const isActive = settings.contentRegion === reg.iso_3166_1;
                    return (
                      <TouchableOpacity 
                        key={reg.iso_3166_1}
                        style={[styles.langItem, isActive && styles.langItemActive]}
                        onPress={() => handleRegionSelect(reg.iso_3166_1)}
                      >
                        <Text style={styles.langItemCode}>{reg.iso_3166_1}</Text>
                        <Text style={[styles.langItemText, isActive && styles.langItemTextActive]}>
                          {reg.english_name}
                        </Text>
                        {isActive && <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />}
                      </TouchableOpacity>
                    );
                  })}
                  
                  {filteredRegions.length === 0 && (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                      <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.1)" />
                      <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12, fontWeight: '600' }}>No regions found</Text>
                    </View>
                  )}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
  },
  appTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  libraryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(157, 78, 221, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.2)',
  },
  libraryEmoji: {
    fontSize: 20,
    color: Colors.accentPurple,
  },
  libraryInfo: {
    flex: 1,
  },
  libraryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  librarySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '300',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  autoSaveText: {
    color: Colors.accentPink,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -2,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: 4,
  },
  expandIcon: {
    fontSize: 22,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  connectedCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  connectedGradient: {
    padding: Spacing.lg,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    elevation: 4,
  },
  successCheck: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  connectedTextInfo: {
    flex: 1,
  },
  connectedStatus: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  connectedUser: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  connectedEmail: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  connectedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  syncNowBtn: {
    backgroundColor: Colors.accentPurple,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  switchAccountBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  sourceItem: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sourceMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 10,
  },
  statusDotSuccess: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDotError: {
    backgroundColor: '#ef4444',
  },
  statusDotTesting: {
    backgroundColor: '#f59e0b',
  },
  sourceUrl: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  sourceName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  sourceUrlSmall: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  sourceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniRemove: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniRemoveText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniEdit: {
    padding: 8,
    marginRight: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  miniEditText: {
    fontSize: 14,
  },
  editForm: {
    gap: 8,
  },
  editInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  editBtnSave: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addInline: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inlineAddBtn: {
    backgroundColor: Colors.accentPurple,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineAddText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addProviderBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 12,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dropdownIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dropdownValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  dropdownSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalDismissZone: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#121214',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.accentPurple,
    borderRadius: 2,
    marginBottom: 20,
    opacity: 0.6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  langSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accentPurple,
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  langItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  langItemText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    flex: 1,
  },
  langItemTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  langItemCode: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '800',
    marginRight: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  manageBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.4)',
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  manageGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  manageBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  innerInput: {
    flex: 1,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
  },
  eyeBtn: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  regionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginRight: Spacing.sm,
  },
  regionChipActive: {
    backgroundColor: 'rgba(217, 70, 239, 0.15)',
    borderColor: Colors.accentPink,
  },
  regionFlag: {
    fontSize: 20,
    opacity: 0.5,
  },
  regionName: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  regionNameActive: {
    color: '#fff',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  langChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  langChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: Colors.accentPurple,
  },
  langText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  langTextActive: {
    color: '#fff',
    fontWeight: '900',
  },
  pingContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pingText: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  pingLink: {
    fontSize: FontSizes.md,
    color: Colors.accentPurple,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  providerUrl: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 77, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#ff4d4d',
    fontSize: 12,
    fontWeight: '700',
  },
  addProviderSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dangerBtn: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.3)',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  privacyNote: {
    padding: Spacing.md,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  privacyNoteText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 18,
  },
  saveSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  saveBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  saveGradient: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  infoSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
    opacity: 0.6,
  },
  discoveryActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  discoveryActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionTextContent: {
    flex: 1,
  },
  actionLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  actionValue: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  discoveryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  discoveryFooterText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  engineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 8,
  },
  enginePriorityList: {
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  prioritySublabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  priorityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  priorityIndexText: {
    color: Colors.accentPurple,
    fontSize: 10,
    fontWeight: '900',
  },
  priorityName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityMoveBtn: {
    padding: 4,
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  engineInfo: {
    flex: 1,
    marginRight: 12,
  },
  engineTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  engineDesc: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  engineBadgeText: { fontSize: 10, fontWeight: '900', color: '#f59e0b', marginLeft: 6, letterSpacing: 0.5 },
  engineStatusList: { marginTop: Spacing.lg, gap: 10 },
  engineStatusItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  engineStatusText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginLeft: 10 },
  engineNote: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: Spacing.lg, textAlign: 'center', lineHeight: 16 },
  engineLinkBtn: { marginTop: Spacing.lg, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' },
  engineLinkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  engineLinkText: {
    color: Colors.accentPurple,
    fontSize: 12,
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.1)',
  },
  tipText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
  defaultProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  defaultProviderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentDefaultText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resetDefaultBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  resetDefaultBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SettingsScreen;
