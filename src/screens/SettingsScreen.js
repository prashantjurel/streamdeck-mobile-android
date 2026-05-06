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

const REGIONS = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
];

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(getDefaultSettings());
  const [apiKey, setApiKeyState] = useState('');
  const [movieboxDomain, setMovieboxDomain] = useState('moviebox.mov');
  const [contentRegion, setContentRegion] = useState('IN');
  const [pingStatus, setPingStatus] = useState('idle');
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderUrl, setNewProviderUrl] = useState('');
  const [sportsPingStatus, setSportsPingStatus] = useState('idle');
  const [saved, setSaved] = useState(false);
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

  // Auto-scroll and flash
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

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await loadSettings();
    setSettings(s);
    setMovieboxDomain(s.movieboxDomain || 'moviebox.mov');
    setContentRegion(s.contentRegion || 'IN');
    const key = await getApiKey();
    setApiKeyState(key === '4b7f91faba006196d244250a3f87ffce' ? '' : key);
  };

  useFocusEffect(
    React.useCallback(() => {
      const { params } = navigation.getState().routes.find(r => r.name === 'Settings') || {};
      if (params?.highlightSection) {
        const section = params.highlightSection;
        setTimeout(() => {
          if (section === 'moviebox') {
            scrollRef.current?.scrollTo({ y: movieboxY.current - 100, animated: true });
          } else if (section === 'sports') {
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

  useEffect(() => {
    if (!movieboxDomain) {
      setPingStatus('idle');
      return;
    }

    setPingStatus('testing');
    const timer = setTimeout(async () => {
      try {
        let url = movieboxDomain.trim();
        if (!/^https?:\/\//i.test(url)) {
          url = `https://${url}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        setPingStatus('success');
      } catch (e) {
        setPingStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [movieboxDomain]);

  useEffect(() => {
    if (!newProviderUrl) {
      setSportsPingStatus('idle');
      return;
    }

    setSportsPingStatus('testing');
    const timer = setTimeout(async () => {
      try {
        let url = newProviderUrl.trim();
        if (!/^https?:\/\//i.test(url)) {
          url = `https://${url}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        setSportsPingStatus('success');
      } catch (e) {
        setSportsPingStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [newProviderUrl]);

  const handleSave = async () => {
    const newSettings = {
      ...settings,
      movieboxDomain,
      contentRegion,
    };
    await saveSettings(newSettings);
    if (apiKey) {
      try {
        const res = await fetch(`https://api.tmdb.org/3/configuration?api_key=${apiKey}`);
        if (res.status === 401) {
          showAlert('Invalid API Key', 'The TMDB API Key you entered is invalid. Please check and try again.', null, 'OK', null, null, 'error');
          return;
        }
      } catch (e) {
        // network issue, ignore validation and let them save
      }
      await saveKey(apiKey);
    } else {
      // If they cleared it, save empty string to storage and sync context
      await storageSaveApiKey('');
      await checkKey();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addProvider = () => {
    if (!newProviderName || !newProviderUrl) {
      showAlert('Error', 'Please enter both provider name and URL.', null, 'OK', null, null, 'error');
      return;
    }
    const updated = {
      ...settings,
      liveSportsProviders: [
        ...settings.liveSportsProviders,
        {
          name: newProviderName,
          url: newProviderUrl.startsWith('http')
            ? newProviderUrl
            : `https://${newProviderUrl}`,
        },
      ],
    };
    setSettings(updated);
    setNewProviderName('');
    setNewProviderUrl('');
  };

  const removeProvider = index => {
    const updated = {
      ...settings,
      liveSportsProviders: settings.liveSportsProviders.filter(
        (_, i) => i !== index,
      ),
    };
    setSettings(updated);
  };



  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom || 80 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPadding }}
      >
        <View style={{ height: Spacing.md }} />

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.logoBox}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>StreamDeck</Text>
          <Text style={styles.appSubtitle}>
            Configure your streaming experience
          </Text>
        </View>

        {/* TMDB API Key */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SMART SEARCH (TMDB API)</Text>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>TMDB API Key</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.themoviedb.org/settings/api')}>
                <Text style={styles.pingLink}>Get API Key ↗</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldHint}>
              StreamDeck uses TMDB to fetch movie posters, trending lists, and search results. You only need to set this up once, it's free and takes under 2 minutes.
              {'\n\n'}<Text style={{ fontWeight: 'bold', color: Colors.textSecondary }}>Quick Tip:</Text> When filling the TMDB API form, select "Developer" and simply type "Personal Use" or "N/A" for all the required fields (like App Name, URL, and Description) to skip the hassle!
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
        </View>

        {/* Content Region */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTENT REGION</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Trending Region</Text>
            <Text style={styles.fieldHint}>
              Select the country used for displaying trending content and platform recommendations.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
              {REGIONS.map(region => {
                const isActive = contentRegion === region.code;
                return (
                  <TouchableOpacity
                    key={region.code}
                    onPress={() => setContentRegion(region.code)}
                    style={[styles.regionChip, isActive && styles.regionChipActive]}
                    activeOpacity={0.7}>
                    <Text style={[styles.regionFlag, isActive && { opacity: 1 }]}>{region.flag}</Text>
                    <Text style={[styles.regionName, isActive && styles.regionNameActive]}>{region.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Streaming Sources */}
        <View
          style={styles.section}
          onLayout={e => movieboxY.current = e.nativeEvent.layout.y}
        >
          <Text style={styles.sectionLabel}>STREAMING SOURCES</Text>
          <View style={styles.card}>
            {navigation.getState().routes.find(r => r.name === 'Settings')?.params?.highlightSection === 'moviebox' && (
              <Animated.View style={flashStyle} />
            )}
            <Text style={styles.fieldLabel}>MovieBox Domain</Text>
            <Text style={styles.fieldHint}>
              Configure the MovieBox domain if the default is unreachable.
            </Text>
            <TextInput
              style={styles.input}
              value={movieboxDomain}
              onChangeText={setMovieboxDomain}
              placeholder="moviebox.mov"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
            />

            <View style={styles.pingContainer}>
              {pingStatus === 'idle' && (
                <View>
                  <Text style={[styles.pingText, { marginBottom: 4 }]}>No source configured.</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://fmhy.net/video#streaming-sites')}>
                    <Text style={styles.pingLink}>Discover working sources here</Text>
                  </TouchableOpacity>
                </View>
              )}
              {pingStatus === 'testing' && (
                <Text style={styles.pingText}>Testing connection...</Text>
              )}
              {pingStatus === 'success' && (
                <Text style={[styles.pingText, { color: '#10b981' }]}>🟢 Source connected successfully</Text>
              )}
              {pingStatus === 'error' && (
                <View>
                  <Text style={[styles.pingText, { color: '#ff4d4d', marginBottom: 4 }]}>🔴 Source unreachable</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://fmhy.net/video#streaming-sites')}>
                    <Text style={styles.pingLink}>Please choose a working site from here</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Live Sports Providers */}
        <View
          style={styles.section}
          onLayout={e => sportsY.current = e.nativeEvent.layout.y}
        >
          <Text style={styles.sectionLabel}>LIVE SPORTS PROVIDERS</Text>
          <View style={styles.card}>
            {navigation.getState().routes.find(r => r.name === 'Settings')?.params?.highlightSection === 'sports' && (
              <Animated.View style={flashStyle} />
            )}
            {settings.liveSportsProviders.map((provider, idx) => (
              <View key={idx} style={styles.providerRow}>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerUrl}>{provider.url}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeProvider(idx)}
                  style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addProviderSection}>
              <TextInput
                style={[styles.input, { marginBottom: Spacing.sm }]}
                value={newProviderName}
                onChangeText={setNewProviderName}
                placeholder="Provider name"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={[styles.input, { marginBottom: Spacing.md }]}
                value={newProviderUrl}
                onChangeText={setNewProviderUrl}
                placeholder="Provider URL (e.g. sportslivetoday.com)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />

              <View style={[styles.pingContainer, { marginBottom: Spacing.md, marginTop: 0 }]}>
                {sportsPingStatus === 'idle' && (
                  <View>
                    <Text style={[styles.pingText, { marginBottom: 4 }]}>No provider URL entered.</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://fmhy.net/video#live-tv')}>
                      <Text style={styles.pingLink}>Discover working providers here</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {sportsPingStatus === 'testing' && (
                  <Text style={styles.pingText}>Testing connection...</Text>
                )}
                {sportsPingStatus === 'success' && (
                  <Text style={[styles.pingText, { color: '#10b981' }]}>🟢 Source connected successfully</Text>
                )}
                {sportsPingStatus === 'error' && (
                  <View>
                    <Text style={[styles.pingText, { color: '#ff4d4d', marginBottom: 4 }]}>🔴 Source unreachable</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://fmhy.net/video#live-tv')}>
                      <Text style={styles.pingLink}>Please choose a working site from here</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={addProvider}
                activeOpacity={0.7}>
                <Text style={styles.addBtnText}>+ Add Provider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => {
                showAlert(
                  "Reset Library?",
                  "This will clear your watchlist and saved discovery gems. This cannot be undone.",
                  async () => {
                    try {
                      await AsyncStorage.removeItem('streamdeck_mobile_watchlist');
                      await AsyncStorage.removeItem('streamdeck_mobile_adventure_saved');
                      showAlert('Reset Complete', 'Your discovery vibes have been reset.', null, 'OK', null, null, 'success');
                    } catch (e) {
                      showAlert('Error', 'Failed to clear data.', null, 'OK', null, null, 'error');
                    }
                  },
                  "Reset",
                  () => {},
                  "Cancel",
                  "warning"
                );
              }}
              activeOpacity={0.7}>
              <Text style={styles.dangerBtnText}>
                Reset Adventure Preferences
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.8}>
            <LinearGradient
              colors={
                saved
                  ? ['#10b981', '#059669']
                  : [Colors.accentPurple, Colors.accentPink]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}>
              <Text style={styles.saveBtnText}>
                {saved ? '✓ Saved!' : 'Save Settings'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
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
