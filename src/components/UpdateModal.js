import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const GITHUB_OWNER = 'prashantjurel';
const GITHUB_REPO = 'streamdeck-mobile-android';

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
      const latestVersion = data.tag_name.replace('v', '');
      const currentVersion = DeviceInfo.getVersion();

      // Simple version comparison (e.g., '1.0.1' > '1.0.0')
      // Note: This is a basic string comparison, usually sufficient for semantic versioning
      // but might need a robust library like semver for complex cases.
      if (latestVersion !== currentVersion && data.assets && data.assets.length > 0) {
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

      // Once downloaded, trigger the Android Install intent
      if (res && res.path()) {
        ReactNativeBlobUtil.android.actionViewIntent(
          res.path(),
          'application/vnd.android.package-archive'
        );
        setIsVisible(false); // Close the modal so they can install
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
    <Modal visible={isVisible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <LinearGradient colors={['rgba(20,20,30,0.95)', 'rgba(10,10,15,0.98)']} style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Icon name="cloud-download" size={48} color="#FF3366" />
          </View>
          
          <Text style={styles.title}>Update Available!</Text>
          <Text style={styles.subtitle}>Version {updateInfo?.version} is ready to install.</Text>

          <View style={styles.notesContainer}>
            <Text style={styles.notesHeader}>What's New:</Text>
            <Text style={styles.notesText} numberOfLines={5}>
              {updateInfo?.notes || "General bug fixes and performance improvements."}
            </Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {downloading ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>Downloading... {progress}%</Text>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsVisible(false)}>
                <Text style={styles.cancelButtonText}>Later</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.updateButton} onPress={startDownload}>
                <LinearGradient colors={['#FF3366', '#FF5588']} style={styles.gradientButton}>
                  <Text style={styles.updateButtonText}>Update Now</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,51,102,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  notesHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF3366',
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
  },
  gradientButton: {
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF4444',
    marginBottom: 15,
    textAlign: 'center',
  }
});
