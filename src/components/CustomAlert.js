import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing, FontSizes, BorderRadius } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, onConfirm, confirmText = 'OK', onCancel, cancelText, type = 'warning' }) => {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '⚠️';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <LinearGradient
            colors={[Colors.bgSecondary, '#050508']}
            style={styles.gradient}
          >
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.1)']}
                style={styles.iconCircle}
              >
                <Text style={styles.iconText}>{getIcon()}</Text>
              </LinearGradient>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            
            <View style={styles.buttonContainer}>
              {onCancel && (
                <TouchableOpacity onPress={onCancel} style={[styles.button, styles.secondaryButton]} activeOpacity={0.8}>
                  <Text style={styles.secondaryButtonText}>{cancelText || 'Cancel'}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onConfirm} style={[styles.button, onCancel ? styles.primaryButtonSmall : styles.primaryButtonFull]} activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentPink]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{confirmText}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  alertBox: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 20,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  gradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
  },
  button: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  primaryButtonFull: {
    width: '100%',
  },
  primaryButtonSmall: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default CustomAlert;
