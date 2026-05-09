// StreamDeck Mobile — Source Manager Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CustomAlert from '../components/CustomAlert';
import {
  loadSettings,
  saveSettings,
} from '../utils/storage';

const SourceManagerScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { type } = route.params || { type: 'moviebox' }; // 'moviebox' or 'sports'
  
  const [settings, setSettings] = useState(null);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
    confirmText: 'OK',
    onCancel: null,
    cancelText: null,
    type: 'warning'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await loadSettings();
    setSettings(s);
  };

  const showAlert = (title, message, onConfirm = null, confirmText = 'OK', onCancel = null, cancelText = null, type = 'warning') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setAlertConfig(prev => ({ ...prev, visible: false }));
      },
      confirmText,
      onCancel: onCancel ? () => {
        if (onCancel) onCancel();
        setAlertConfig(prev => ({ ...prev, visible: false }));
      } : null,
      cancelText,
      type
    });
  };

  const testUrlAvailability = async (url) => {
    let testUrl = url.trim();
    if (!/^https?:\/\//i.test(testUrl)) testUrl = `https://${testUrl}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch(testUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleAdd = async () => {
    if (!newName || !newUrl) return;
    
    setIsTesting(true);
    const isWorking = await testUrlAvailability(newUrl);
    setIsTesting(false);

    if (!isWorking) {
      showAlert(
        'Unreachable URL', 
        'This link is not responding. Check for typos or find new sources.',
        () => finalizeAdd(false),
        'Add Anyway',
        () => Linking.openURL('https://fmhy.net/video#streaming-sites'),
        'Find Sources',
        'error'
      );
      return;
    }
    finalizeAdd(true);
  };

  const finalizeAdd = async (isWorking) => {
    const updated = { 
      ...settings,
      movieboxSources: [...(settings.movieboxSources || [])],
      liveSportsProviders: [...(settings.liveSportsProviders || [])]
    };
    const list = type === 'moviebox' ? updated.movieboxSources : updated.liveSportsProviders;
    
    const enabledCount = list.filter(s => s.enabled).length;
    const shouldEnable = isWorking && enabledCount < 3;

    list.push({ name: newName, url: newUrl, enabled: shouldEnable });
    
    setSettings(updated);
    await saveSettings(updated);
    setNewName('');
    setNewUrl('');
    
    if (!shouldEnable && isWorking && enabledCount >= 3) {
      showAlert('Limit Reached', 'Source added but disabled (max 3 enabled sources reached).', null, 'OK', null, null, 'info');
    }
  };

  const handleDelete = async (index) => {
    showAlert(
      'Delete Source',
      'Are you sure you want to remove this source?',
      async () => {
        const updated = { 
          ...settings,
          movieboxSources: [...(settings.movieboxSources || [])],
          liveSportsProviders: [...(settings.liveSportsProviders || [])]
        };
        if (type === 'moviebox') {
          updated.movieboxSources = updated.movieboxSources.filter((_, i) => i !== index);
        } else {
          updated.liveSportsProviders = updated.liveSportsProviders.filter((_, i) => i !== index);
        }
        setSettings(updated);
        await saveSettings(updated);
      },
      'Delete',
      () => {},
      'Cancel',
      'error'
    );
  };

  const handleUpdate = async () => {
    if (editingIndex === null || !newName || !newUrl) return;

    setIsTesting(true);
    const isWorking = await testUrlAvailability(newUrl);
    setIsTesting(false);

    if (!isWorking) {
      showAlert(
        'Unreachable URL', 
        'This updated link is not responding. Check for typos or find new sources.',
        () => finalizeUpdate(false),
        'Save Anyway',
        () => Linking.openURL('https://fmhy.net/video#streaming-sites'),
        'Find Sources',
        'error'
      );
      return;
    }
    finalizeUpdate(true);
  };

  const finalizeUpdate = async (isWorking) => {
    const updated = { 
      ...settings,
      movieboxSources: [...(settings.movieboxSources || [])],
      liveSportsProviders: [...(settings.liveSportsProviders || [])]
    };
    const list = type === 'moviebox' ? updated.movieboxSources : updated.liveSportsProviders;
    
    list[editingIndex] = { 
      ...list[editingIndex], 
      name: newName, 
      url: newUrl,
      enabled: isWorking ? list[editingIndex].enabled : false
    };

    setSettings(updated);
    await saveSettings(updated);
    setEditingIndex(null);
    setNewName('');
    setNewUrl('');
  };

  const startEdit = (index, item) => {
    setEditingIndex(index);
    setNewName(item.name);
    setNewUrl(item.url);
  };

  if (!settings) return null;

  const currentList = type === 'moviebox' ? settings.movieboxSources : settings.liveSportsProviders;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Manage {type === 'moviebox' ? 'MovieBox' : 'Sports'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Add Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {editingIndex !== null ? 'Edit Source' : 'Add New Source'}
          </Text>
          <TextInput
            style={styles.largeInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Name (e.g. Cineby)"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <TextInput
            style={styles.largeInput}
            value={newUrl}
            onChangeText={setNewUrl}
            placeholder="URL (e.g. cineby.sc)"
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="none"
          />
          
          <View style={styles.actionRow}>
            {editingIndex !== null && (
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => {
                  setEditingIndex(null);
                  setNewName('');
                  setNewUrl('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.primaryBtn, isTesting && { opacity: 0.7 }]} 
              onPress={editingIndex !== null ? handleUpdate : handleAdd}
              disabled={isTesting}
            >
              <LinearGradient
                colors={[Colors.accentPurple, Colors.accentPink]}
                style={styles.btnGradient}
              >
                {isTesting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {editingIndex !== null ? 'Update Source' : 'Add Source'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* List Section */}
        <Text style={styles.listLabel}>Current Sources</Text>
        {currentList.map((item, idx) => (
          <View key={idx} style={styles.sourceCard}>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>{item.name}</Text>
              <Text style={styles.sourceUrl} numberOfLines={1}>{item.url}</Text>
            </View>
            <View style={styles.sourceActions}>
              <TouchableOpacity onPress={() => startEdit(idx, item)} style={styles.editBtn}>
                <Text style={styles.btnIcon}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(idx)} style={styles.deleteBtn}>
                <Text style={styles.btnIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {currentList.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sources added yet.</Text>
          </View>
        )}

      </ScrollView>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        onCancel={alertConfig.onCancel}
        cancelText={alertConfig.cancelText}
        type={alertConfig.type}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    color: Colors.accentPink,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 20,
    letterSpacing: 1,
  },
  largeInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  listLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 16,
    marginLeft: 4,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sourceInfo: {
    flex: 1,
    marginRight: 10,
  },
  sourceName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sourceUrl: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 4,
  },
  sourceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIcon: {
    fontSize: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 16,
  }
});

export default SourceManagerScreen;
