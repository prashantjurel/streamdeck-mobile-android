import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const GITHUB_OWNER = 'prashantjurel';
const GITHUB_REPO = 'streamdeck-mobile-android';



const isNewerVersion = (latest, current) => {
  if (!latest || !current) return false;
  const latestParts = latest.replace(/[^0-9.]/g, '').split('.').map(Number);
  const currentParts = current.replace(/[^0-9.]/g, '').split('.').map(Number);

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
};

export default function UpdateModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      if (!response.ok) return;

      const data = await response.json();
      const latestVersion = data.tag_name;
      const currentVersion = DeviceInfo.getVersion();

      console.log(`[UpdateCheck] Latest: ${latestVersion}, Current: ${currentVersion}`);

      if (isNewerVersion(latestVersion, currentVersion)) {
        if (data.assets && data.assets.length > 0) {
          const apkAsset = data.assets.find(asset => asset.name.endsWith('.apk'));
          if (apkAsset) {
            setUpdateInfo({
              version: data.tag_name,
              notes: data.body,
              downloadUrl: apkAsset.browser_download_url,
            });
            setIsVisible(true);
          }
        }
      }
    } catch (err) {
      console.log('Failed to check for updates', err);
    }
  };

  const startDownload = async () => {
    if (!updateInfo?.downloadUrl) return;

    setDownloading(true);
    setError(null);
    setProgress(0);

    const dirs = ReactNativeBlobUtil.fs.dirs;
    const path = `${dirs.DownloadDir}/streamdeck-update-${updateInfo.version}.apk`;

    try {
      const res = await ReactNativeBlobUtil.config({
        path: path,
        fileCache: true,
        appendExt: 'apk',
        indicator: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          path: path,
          description: 'Downloading StreamDeck Update',
          mime: 'application/vnd.android.package-archive',
          mediaScannable: true,
        }
      })
      .fetch('GET', updateInfo.downloadUrl)
      .progress((received, total) => {
        setProgress(Math.round((received / total) * 100));
      });

      if (res && res.path()) {
        ReactNativeBlobUtil.android.actionViewIntent(
          res.path(),
          'application/vnd.android.package-archive'
        );
        setIsVisible(false);
      }
    } catch (err) {
      console.log('Download error: ', err);
      setError('Failed to download the update. Please try again later.');
    } finally {
      setDownloading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(30, 30, 45, 0.98)', 'rgba(15, 15, 25, 1)']}
          style={styles.modalContainer}
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain"
              />
            </View>
          </View>
          
          <Text style={styles.title}>Update Available!</Text>
          <Text style={styles.subtitle}>A new version {updateInfo?.version} is ready.</Text>

          <View style={styles.notesContainer}>
            <View style={styles.notesHeaderRow}>
              <Icon name="rocket-launch-outline" size={16} color={Colors.accentPink} />
              <Text style={styles.notesHeader}>WHAT'S NEW</Text>
            </View>
            <Text style={styles.notesText} numberOfLines={6}>
              {updateInfo?.notes || "Bug fixes and performance improvements to make your experience better."}
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Icon name="alert-circle-outline" size={16} color={Colors.liveBadge} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {downloading ? (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBackground}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>Downloading update... {progress}%</Text>
            </View>
          ) : (
            <View style={styles.buttonSection}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.cancelBtn}
                onPress={() => setIsVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Later</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.updateBtn}
                onPress={startDownload}
              >
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.updateGradient}
                >
                  <Text style={styles.updateBtnText}>Update Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: width * 0.9,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 20,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    fontWeight: '500',
  },
  notesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 18,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accentPink,
    letterSpacing: 1,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    opacity: 0.8,
  },
  progressSection: {
    width: '100%',
    marginBottom: 10,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  buttonSection: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  updateBtn: {
    flex: 1.5,
    height: 56,
  },
  updateGradient: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.accentPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  updateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  errorText: {
    color: Colors.liveBadge,
    fontSize: 14,
    fontWeight: '500',
  }
});
