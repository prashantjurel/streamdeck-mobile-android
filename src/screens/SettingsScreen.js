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
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import CustomAlert from '../components/CustomAlert';
import {
  loadSettings,
  saveSettings,
  getDefaultSettings,
  getApiKey,
  saveApiKey as storageSaveApiKey,
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
  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
    confirmText: 'OK',
    onCancel: null,
    cancelText: null,
    type: 'warning'
  });
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const showAlert = (title, message, onConfirm = null, confirmText = 'OK', onCancel = null, cancelText = null, type = 'warning') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setAlertConfig(prev => ({ ...prev, visible: false }));
      },
      confirmText,
      onCancel: onCancel ? () => {
        onCancel();
        setAlertConfig(prev => ({ ...prev, visible: false }));
      } : null,
      cancelText,
      type
    });
  };
  const [showApiKey, setShowApiKey] = useState(false);

  // Auto-scroll and flash refs
  const scrollRef = React.useRef(null);
  const movieboxY = React.useRef(0);
  const sportsY = React.useRef(0);
  const flashOpacity = useSharedValue(0);

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: Colors.accentPurple,
    opacity: flashOpacity.value * 0.15,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    zIndex: -1,
  }));

  const { saveKey, checkKey } = useApi();

  const [expandedSections, setExpandedSections] = useState({
    account: true,
    personal: true,
    tmdb: false,
    region: false,
    streaming: false,
    sports: false,
    data: false
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
          }

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      await fetch(testUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      setSourceStatuses(prev => ({ ...prev, [url]: 'success' }));
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
        showAlert('Limit Reached', `You can only enable up to 3 ${type === 'moviebox' ? 'streaming sources' : 'sports providers'} at a time. Please disable one first.`, null, 'OK', null, null, 'warning');
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
                            showAlert('Sync Complete', 'Your settings and library are now secured in the cloud.', null, 'OK', null, null, 'success');
                          } catch (e) {
                            setSyncing(false);
                            showAlert('Sync Failed', 'Could not reach the cloud. Check your connection.', null, 'OK', null, null, 'error');
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
                          showAlert('Signed Out', 'Cloud sync is now disabled.', null, 'OK', null, null, 'info');
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
                          showAlert('Sync Failed', 'Could not connect to Google.', null, 'OK', null, null, 'error');
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

        {/* Content Region */}
        <View style={styles.section}>
          <CollapsibleHeader 
            title="CONTENT REGION" 
            sectionKey="region" 
            isExpanded={expandedSections.region}
            onToggle={toggleSection}
          />
          {expandedSections.region && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Trending Region</Text>
              <Text style={styles.fieldHint}>
                The country used for platform recommendations.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {REGIONS.map(region => {
                  const isActive = settings.contentRegion === region.code;
                  return (
                    <TouchableOpacity
                      key={region.code}
                      onPress={() => setSettings(prev => ({ ...prev, contentRegion: region.code }))}
                      style={[styles.regionChip, isActive && styles.regionChipActive]}
                      activeOpacity={0.7}>
                      <Text style={[styles.regionFlag, isActive && { opacity: 1 }]}>{region.flag}</Text>
                      <Text style={[styles.regionName, isActive && styles.regionNameActive]}>{region.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
          <Text style={styles.infoSubtext}>
            A mobile companion to the StreamDeck Desktop Hub
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        onCancel={alertConfig.onCancel}
        cancelText={alertConfig.cancelText}
        type={alertConfig.type}
      />
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
    backgroundColor: 'rgba(157, 78, 221, 0.2)',
    borderColor: Colors.accentPurple,
  },
  regionFlag: {
    fontSize: 16,
    marginRight: 6,
    opacity: 0.7,
  },
  regionName: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  regionNameActive: {
    color: Colors.accentPurple,
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
});

export default SettingsScreen;
