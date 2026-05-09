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
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSizes, BorderRadius, Spacing } from '../theme/colors';
import { getApiKey, saveApiKey } from '../utils/storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ApiKeySetupModal = ({ onKeySaved, onSkip }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    // Deep scrub: Remove whitespace AND any non-alphanumeric characters (like hidden WhatsApp symbols)
    const key = apiKey.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!key) return;

    setIsValidating(true);
    setErrorMsg('');

    try {
      // Primary Check: Configuration
      let res = await fetch(`https://api.tmdb.org/3/configuration?api_key=${key}`);
      
      // Fallback Check: Popular Movies (if configuration fails)
      if (res.status === 401) {
        res = await fetch(`https://api.tmdb.org/3/movie/popular?api_key=${key}`);
      }

      const data = await res.json();

      if (res.status !== 200) {
        let msg = data.status_message || 'Invalid API Key. Please check and try again.';
        if (key.length === 31) {
          msg += ' (Note: standard keys are 32 chars)';
        }
        setErrorMsg(msg);
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

          <View style={styles.modalHeader}>
            <View style={styles.logoAndTitle}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>StreamDeck</Text>
            </View>
            <TouchableOpacity onPress={onSkip} style={styles.closeAction}>
              <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.4)" />
            </TouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <Ionicons name="sync-outline" size={18} color={Colors.accentPurple} />
              </View>
              <Text style={styles.featureText}>Synchronize metadata and posters</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <Ionicons name="search-outline" size={18} color={Colors.accentPurple} />
              </View>
              <Text style={styles.featureText}>Real-time trending & search results</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <Ionicons name="flash-outline" size={18} color={Colors.accentPurple} />
              </View>
              <Text style={styles.featureText}>Instant one-time integration</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <Ionicons name="time-outline" size={18} color={Colors.accentPurple} />
              </View>
              <Text style={styles.featureText}>Setup completed in under 2 mins</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <Ionicons name="hardware-chip-outline" size={18} color={Colors.accentPurple} />
              </View>
              <Text style={styles.featureText}>Powered by TMDB Infrastructure</Text>
            </View>
          </View>

          <View style={styles.proTipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={16} color="#c084fc" />
              <Text style={styles.proTipTitle}>Implementation Pro-Tip</Text>
            </View>
            <Text style={styles.proTipContent}>
              Select <Text style={{ fontWeight: 'bold', color: '#fff' }}>"Developer"</Text> and use <Text style={{ fontWeight: 'bold', color: '#fff' }}>"Personal Use"</Text> to bypass manual approval queues.
            </Text>
          </View>

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

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={openTMDB} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Get API Key</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryAction, (!apiKey.trim() || isValidating) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!apiKey.trim() || isValidating}>
              <LinearGradient
                colors={[Colors.accentPurple, Colors.accentPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryActionGradient}
              >
                {isValidating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

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
    borderRadius: 24,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(12, 12, 22, 0.99)',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingRight: 4,
  },
  logoAndTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  featuresContainer: {
    marginBottom: Spacing.xl,
    paddingHorizontal: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  proTipCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    padding: 16,
    borderRadius: 16,
    marginBottom: Spacing.xl,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  proTipTitle: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  proTipContent: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  input: {
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 14 : 18,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    marginBottom: Spacing.md,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  errorText: {
    color: Colors.accentPink,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 4,
  },
  debugText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  forceSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  forceSaveText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  secondaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1.4, // Make the continue button slightly more prominent
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 8,
  },
  primaryActionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default ApiKeySetupModal;
