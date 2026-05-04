// StreamDeck Mobile — Settings Screen
import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import {
  loadSettings,
  saveSettings,
  getDefaultSettings,
  getApiKey,
  saveApiKey as storageSaveApiKey,
} from '../utils/storage';
import SectionHeader from '../components/SectionHeader';
import {useApi} from '../context/ApiContext';

const REGIONS = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
];

const SettingsScreen = ({navigation}) => {
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
      Alert.alert('Error', 'Please enter both provider name and URL.');
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
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop: topPadding}}
      >
        <View style={{height: Spacing.md}} />

        {/* Header */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.logoBox}>
            <Text style={styles.logoIcon}>▶</Text>
          </LinearGradient>
          <Text style={styles.appTitle}>StreamDeck</Text>
          <Text style={styles.appSubtitle}>
            Configure your streaming experience
          </Text>
        </View>

        {/* TMDB API Key */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SMART SEARCH (TMDB API)</Text>
          <View style={styles.card}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
              <Text style={[styles.fieldLabel, {marginBottom: 0}]}>TMDB API Key</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.themoviedb.org/settings/api')}>
                <Text style={styles.pingLink}>Get API Key ↗</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldHint}>
              Required for rich search. Tap the link above to generate your key.
              {'\n\n'}<Text style={{fontWeight: 'bold', color: Colors.textSecondary}}>Quick Tip:</Text> When filling the TMDB API form, select "Developer" and simply type "Personal Use" or "N/A" for all the required fields (like App Name, URL, and Description) to skip the hassle!
            </Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKeyState}
              placeholder="Paste your TMDB API key here..."
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
            />
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: Spacing.sm}}>
              {REGIONS.map(region => {
                const isActive = contentRegion === region.code;
                return (
                  <TouchableOpacity
                    key={region.code}
                    onPress={() => setContentRegion(region.code)}
                    style={[styles.regionChip, isActive && styles.regionChipActive]}
                    activeOpacity={0.7}>
                    <Text style={[styles.regionFlag, isActive && {opacity: 1}]}>{region.flag}</Text>
                    <Text style={[styles.regionName, isActive && styles.regionNameActive]}>{region.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Streaming Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>STREAMING SOURCES</Text>
          <View style={styles.card}>
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
                  <Text style={[styles.pingText, {marginBottom: 4}]}>No source configured.</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://fmhy.net/video#streaming-sites')}>
                    <Text style={styles.pingLink}>Discover working sources here</Text>
                  </TouchableOpacity>
                </View>
              )}
              {pingStatus === 'testing' && (
                <Text style={styles.pingText}>Testing connection...</Text>
              )}
              {pingStatus === 'success' && (
                <Text style={[styles.pingText, {color: '#10b981'}]}>🟢 Source connected successfully</Text>
              )}
              {pingStatus === 'error' && (
                <View>
                  <Text style={[styles.pingText, {color: '#ff4d4d', marginBottom: 4}]}>🔴 Source unreachable</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://fmhy.net/video#streaming-sites')}>
                    <Text style={styles.pingLink}>Please choose a working site from here</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Live Sports Providers */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LIVE SPORTS PROVIDERS</Text>
          <View style={styles.card}>
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
                style={[styles.input, {marginBottom: Spacing.sm}]}
                value={newProviderName}
                onChangeText={setNewProviderName}
                placeholder="Provider name"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={[styles.input, {marginBottom: Spacing.md}]}
                value={newProviderUrl}
                onChangeText={setNewProviderUrl}
                placeholder="Provider URL (e.g. sportslivetoday.com)"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
              
              <View style={[styles.pingContainer, {marginBottom: Spacing.md, marginTop: 0}]}>
                {sportsPingStatus === 'idle' && (
                  <View>
                    <Text style={[styles.pingText, {marginBottom: 4}]}>No provider URL entered.</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://fmhy.net/video#live-tv')}>
                      <Text style={styles.pingLink}>Discover working providers here</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {sportsPingStatus === 'testing' && (
                  <Text style={styles.pingText}>Testing connection...</Text>
                )}
                {sportsPingStatus === 'success' && (
                  <Text style={[styles.pingText, {color: '#10b981'}]}>🟢 Source connected successfully</Text>
                )}
                {sportsPingStatus === 'error' && (
                  <View>
                    <Text style={[styles.pingText, {color: '#ff4d4d', marginBottom: 4}]}>🔴 Source unreachable</Text>
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
              onPress={async () => {
                await AsyncStorage.removeItem('streamdeck_adventure_prefs');
                await AsyncStorage.removeItem('streamdeck_adventure_recent_sources');
                Alert.alert('Reset', 'Adventure preferences and history have been reset.');
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
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.saveGradient}>
              <Text style={styles.saveBtnText}>
                {saved ? '✓ Saved!' : 'Save Settings'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>StreamDeck Mobile v1.0.0</Text>
          <Text style={styles.infoSubtext}>
            A mobile companion to the StreamDeck Desktop Hub
          </Text>
        </View>

        <View style={{height: 120}} />
      </ScrollView>
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
  logoIcon: {
    color: '#fff',
    fontSize: 24,
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
    fontSize: FontSizes.xs,
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
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 16,
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
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  pingLink: {
    fontSize: FontSizes.sm,
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
    shadowOffset: {width: 0, height: 4},
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
