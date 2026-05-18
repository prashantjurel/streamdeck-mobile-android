// StreamDeck Mobile — Provider Picker Component
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Colors, Spacing } from '../theme/colors';
import { OTT_PROVIDER_MAP } from '../utils/OTTNavigation';

const MediaProviderModal = ({ 
  visible, 
  onClose, 
  providers, 
  onSelectProvider,
  isFetching = false,
  title = "Available On",
  subtitle = "Streaming now in your region"
}) => {
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleSelect = (provider) => {
    onSelectProvider(provider, rememberChoice);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalDismissZone} 
          onPress={onClose} 
          activeOpacity={1} 
        />
        <Animated.View 
          entering={FadeInDown.duration(300)}
          exiting={FadeOutDown.duration(200)}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{title}</Text>
            {isFetching ? (
              <Text style={styles.modalSubtitle}>Locating providers...</Text>
            ) : (
              <Text style={styles.modalSubtitle}>{subtitle}</Text>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            {isFetching ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={Colors.accentPurple} />
                <Text style={styles.modalLoadingText}>Searching streams...</Text>
              </View>
            ) : (
              <>
                {/* Default Choice Toggle (Moved to Top) */}
                {!isFetching && providers.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.rememberChoiceRow, { marginBottom: 20, marginTop: 5 }]} 
                    onPress={() => setRememberChoice(!rememberChoice)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.checkbox, 
                      rememberChoice && { backgroundColor: Colors.accentPink, borderColor: Colors.accentPink }
                    ]}>
                      {rememberChoice && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <View style={styles.rememberChoiceInfo}>
                      <Text style={styles.rememberChoiceText}>Always use my selection for this content</Text>
                      <Text style={styles.rememberChoiceSubtext}>You can reset this anytime in Settings</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Category: HD Engine */}
                {providers.some(p => p.id === 'direct') && (
                  <View style={styles.providerCategory}>
                    <Text style={styles.providerCategoryTitle}>HIGH DEFINITION</Text>
                    {providers.filter(p => p.id === 'direct').map(provider => (
                      <TouchableOpacity
                        key={provider.id}
                        style={[styles.providerRow, styles.providerRowGlow]}
                        onPress={() => handleSelect(provider)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.providerRowIconBox, { backgroundColor: '#1a1a2e' }]}>
                          <Image
                            source={require('../assets/images/logo.png')}
                            style={styles.providerRowLogo}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.providerRowInfo}>
                          <View style={styles.providerRowTitleRow}>
                            <Text style={styles.providerRowName}>{provider.name}</Text>
                            <View style={styles.qualityBadge}>
                              <Text style={styles.qualityBadgeText}>4K • HD</Text>
                            </View>
                          </View>
                          <Text style={[styles.providerRowStatus, { color: Colors.accentPurple }]}>Recommended • Ultra High Quality</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Category: Official Apps */}
                {providers.some(p => OTT_PROVIDER_MAP[Object.keys(OTT_PROVIDER_MAP).find(k => OTT_PROVIDER_MAP[k].id === p.id)] || p.appScheme) && (
                  <View style={styles.providerCategory}>
                    <Text style={styles.providerCategoryTitle}>OFFICIAL APPS</Text>
                    {providers.filter(p => (OTT_PROVIDER_MAP[Object.keys(OTT_PROVIDER_MAP).find(k => OTT_PROVIDER_MAP[k].id === p.id)] || p.appScheme) && p.id !== 'direct' && p.id !== 'youtube').map(provider => (
                      <TouchableOpacity
                        key={provider.id}
                        style={styles.providerRow}
                        onPress={() => handleSelect(provider)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.providerRowIconBox, { backgroundColor: '#1a1a2e' }]}>
                          {provider.logoUrl ? (
                            <Image
                              source={{ uri: provider.logoUrl }}
                              style={styles.providerRowLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <Icon name={provider.icon} size={24} color="#fff" />
                          )}
                        </View>
                        <View style={styles.providerRowInfo}>
                          <Text style={styles.providerRowName}>{provider.name}</Text>
                          <Text style={styles.providerRowStatus}>Official Streaming Service</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Category: Alternative Sources */}
                {providers.some(p => p.id.startsWith('moviebox')) && (
                  <View style={styles.providerCategory}>
                    <Text style={styles.providerCategoryTitle}>ALTERNATIVE SOURCES</Text>
                    {providers.filter(p => p.id.startsWith('moviebox')).map(provider => (
                      <TouchableOpacity
                        key={provider.id}
                        style={styles.providerRow}
                        onPress={() => handleSelect(provider)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.providerRowIconBox, { backgroundColor: provider.color || '#1a1a2e' }]}>
                          <Icon name={provider.icon} size={24} color="#fff" />
                        </View>
                        <View style={styles.providerRowInfo}>
                          <Text style={styles.providerRowName}>{provider.name}</Text>
                          <Text style={styles.providerRowStatus}>Web Stream • Multi-server</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Category: Social & Search */}
                {providers.some(p => p.id === 'youtube') && (
                  <View style={styles.providerCategory}>
                    <Text style={styles.providerCategoryTitle}>SEARCH & SOCIAL</Text>
                    {providers.filter(p => p.id === 'youtube').map(provider => (
                      <TouchableOpacity
                        key={provider.id}
                        style={styles.providerRow}
                        onPress={() => handleSelect(provider)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.providerRowIconBox, { backgroundColor: provider.color || '#FF0000' }]}>
                          <Icon name={provider.icon} size={24} color="#fff" />
                        </View>
                        <View style={styles.providerRowInfo}>
                          <Text style={styles.providerRowName}>{provider.name}</Text>
                          <Text style={styles.providerRowStatus}>Trailers • Clips • Rental</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeModalBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeModalText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissZone: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#111118',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.accentPurple,
    borderRadius: 2,
    marginBottom: 20,
    opacity: 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  providerRowIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  providerRowLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  providerRowInfo: {
    flex: 1,
  },
  providerRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  providerRowStatus: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
  },
  providerCategory: {
    marginBottom: 20,
  },
  providerCategoryTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  providerRowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(157, 78, 221, 0.15)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.3)',
  },
  qualityBadgeText: {
    color: Colors.accentPurple,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  providerRowGlow: {
    backgroundColor: 'rgba(157, 78, 221, 0.06)',
    borderColor: 'rgba(157, 78, 221, 0.15)',
  },
  modalLoading: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
  },
  modalLoadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  closeModalBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  rememberChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(236, 72, 153, 0.05)',
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.15)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberChoiceInfo: {
    flex: 1,
  },
  rememberChoiceText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  rememberChoiceSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default MediaProviderModal;
