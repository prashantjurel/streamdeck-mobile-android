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

  const handleSave = async () => {
    if (!apiKey.trim()) return;

    // Save the key
    await saveApiKey(apiKey.trim());
    if (onKeySaved) {
      onKeySaved();
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

          <Text style={styles.title}>Welcome to StreamDeck</Text>
          <Text style={styles.subtitle}>
            To fetch movies and TV shows, you need to provide your own TMDB API Key.
            Without a key, you can only use Adventure, Live TV, and Settings.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter TMDB API Key"
              placeholderTextColor={Colors.textMuted}
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity onPress={openTMDB} style={styles.linkButton}>
            <Text style={styles.linkText}>Get your free API Key from TMDB</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, !apiKey.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!apiKey.trim()}>
            <Text style={styles.saveButtonText}>Save & Continue</Text>
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
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.xl,
    textAlign: 'center',
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
  linkButton: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.accentPink,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  saveButton: {
    backgroundColor: Colors.accentPurple,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
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
