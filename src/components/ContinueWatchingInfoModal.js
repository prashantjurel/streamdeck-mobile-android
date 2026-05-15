// StreamDeck Mobile — Continue Watching Info Modal
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
import { Colors, FontSizes, BorderRadius, Spacing } from '../theme/colors';

const { width } = Dimensions.get('window');

const ContinueWatchingInfoModal = ({ visible, onClose }) => {
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
                <Ionicons name="information-circle" size={28} color={Colors.accentPurple} />
              </View>
              <Text style={styles.title}>Continue Watching</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.message}>
                Progress tracking is currently optimized for the <Text style={styles.highlight}>StreamDeck Direct Engine</Text>.
              </Text>
              
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.infoText}>Auto-saves your position every few seconds.</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                <Text style={styles.infoText}>Manual sites & external apps do not support auto-resume yet.</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
              <LinearGradient
                colors={[Colors.accentPurple, Colors.accentPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  },
  content: {
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginBottom: Spacing.xl,
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  highlight: {
    color: Colors.accentPurple,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  infoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    flex: 1,
  },
  actionBtn: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ContinueWatchingInfoModal;
