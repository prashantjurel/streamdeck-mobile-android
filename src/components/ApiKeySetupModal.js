import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSizes, BorderRadius, Spacing } from '../theme/colors';
import { getApiKey, saveApiKey } from '../utils/storage';

const ApiKeySetupModal = ({ onKeySaved, onSkip }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    const key = apiKey.replace(/\s+/g, '');
    if (!key) return;

    setIsValidating(true);
    setErrorMsg('');

    try {
      const res = await fetch(`https://api.tmdb.org/3/configuration?api_key=${key}`);
      if (res.status === 401) {
        setErrorMsg('Invalid API Key. Please check and try again.');
        setIsValidating(false);
        return;
      }
    } catch (e) {
      setErrorMsg('Network error. Unable to verify key.');
      setIsValidating(false);
      return;
    }

    // Save the key
    await saveApiKey(key);
    if (onKeySaved) {
      onKeySaved(key);
    }
  };

  const openTMDB = () => {
    Linking.openURL('https://www.themoviedb.org/settings/api');
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={[Colors.bgPrimary, Colors.bgSecondary]}
          style={styles.modalContent}>

          <TouchableOpacity onPress={onSkip} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Welcome to StreamDeck 🎬</Text>
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitleParagraph}>
              StreamDeck uses TMDB (The Movie Database) to power all movie posters, trending lists, and search results.
            </Text>
            <Text style={styles.subtitleParagraph}>
              To get started, you need a free TMDB API key. It takes less than 2 minutes and you only have to do this once.
            </Text>
            <Text style={styles.subtitleParagraph}>
              Without a key, you can still use Live TV and Settings.
            </Text>
          </View>

          <Text style={styles.quickTip}>
            <Text style={{ fontWeight: 'bold' }}>Quick Tip:</Text> When filling the TMDB API form, select "Developer" and simply type "Personal Use" or "N/A" for all the required fields (like App Name, URL, and Description) to skip the hassle!
          </Text>

          <View style={[styles.inputContainer, errorMsg ? { borderColor: Colors.accentPink } : {}]}>
            <TextInput
              style={styles.input}
              placeholder="Enter TMDB API Key"
              placeholderTextColor={Colors.textMuted}
              value={apiKey}
              onChangeText={(text) => {
                setApiKey(text);
                if (errorMsg) setErrorMsg('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}

          <TouchableOpacity onPress={openTMDB} style={styles.linkButton}>
            <Text style={styles.linkText}>Get your free API Key from TMDB</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButtonContainer, (!apiKey.trim() || isValidating) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!apiKey.trim() || isValidating}>
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {isValidating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save & Continue</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    elevation: 24,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: Colors.textMuted,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitleContainer: {
    marginBottom: Spacing.lg,
  },
  subtitleParagraph: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  quickTip: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.lg,
    lineHeight: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: Spacing.md,
  },
  input: {
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'android' ? 12 : 16,
    fontSize: FontSizes.md,
  },
  errorText: {
    color: Colors.accentPink,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  linkButton: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.accentPink,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  saveButtonContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.borderSubtle,
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
});

export default ApiKeySetupModal;
