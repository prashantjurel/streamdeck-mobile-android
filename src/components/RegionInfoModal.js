// StreamDeck Mobile — Region & Language Info Modal
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

const { width } = Dimensions.get('window');

const RegionInfoModal = ({ visible, onClose, onNavigateToSettings, regionName }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(25, 25, 35, 0.98)', 'rgba(10, 10, 15, 0.99)']}
            style={styles.content}
          >
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="globe-outline" size={28} color={Colors.accentPurple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Content Settings</Text>
                <Text style={styles.subtitle}>Region & Language</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.message}>
                Showing trending content for <Text style={styles.highlight}>{regionName}</Text>.
              </Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="language" size={18} color={Colors.accentPink} />
                <Text style={styles.infoText}>Content is filtered based on your preferred languages.</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="options" size={18} color={Colors.accentPurple} />
                <Text style={styles.infoText}>You can change your region and language preferences in settings to discover more content.</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.actionBtn, { flex: 1, marginRight: 10 }]} onPress={onClose}>
                <View style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Dismiss</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { flex: 1.5 }]} onPress={() => {
                onClose();
                onNavigateToSettings && onNavigateToSettings();
              }}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  <Text style={styles.btnText}>Change Settings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
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
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  content: {
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: Colors.accentPink,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  body: {
    marginBottom: Spacing.xl,
  },
  message: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  highlight: {
    color: Colors.accentPurple,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default RegionInfoModal;
