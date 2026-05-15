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
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  loadSettings,
  saveSettings,
} from '../utils/storage';

const SourceManagerScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { type } = route.params || { type: 'moviebox' };
  
  const [settings, setSettings] = useState(null);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);
  const [showForceAdd, setShowForceAdd] = useState(false);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await loadSettings();
    setSettings(s);
  };



  const testUrlAvailability = async (url) => {
    let testUrl = url.trim();
    if (!/^https?:\/\//i.test(testUrl)) testUrl = `https://${testUrl}`;
    try {
      const fetchPromise = fetch(testUrl);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      return res && res.status >= 200 && res.status < 600;
    } catch (e) {
      return false;
    }
  };

  const handleAdd = async (force = false) => {
    if (!newName || !newUrl) return;
    
    if (!force) {
      setIsTesting(true);
      const isWorking = await testUrlAvailability(newUrl);
      setIsTesting(false);

      if (!isWorking) {
        setShowForceAdd(true);
        return;
      }
    }
    
    finalizeAdd(force ? false : true);
    setShowForceAdd(false);
  };

  const finalizeAdd = async (isWorking) => {
    const newSettings = JSON.parse(JSON.stringify(settings));
    const list = type === 'moviebox' ? newSettings.movieboxSources : newSettings.liveSportsProviders;
    
    const enabledCount = list.filter(s => s.enabled).length;
    const shouldEnable = isWorking && enabledCount < 3;

    list.push({ name: newName, url: newUrl, enabled: shouldEnable });
    
    setSettings(newSettings);
    await saveSettings(newSettings);
    setNewName('');
    setNewUrl('');
  };

  const handleDelete = async (index) => {
    if (confirmDeleteIndex !== index) {
      setConfirmDeleteIndex(index);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDeleteIndex(null), 3000);
      return;
    }

    const newSettings = JSON.parse(JSON.stringify(settings));
    if (type === 'moviebox') {
      newSettings.movieboxSources = newSettings.movieboxSources.filter((_, i) => i !== index);
    } else {
      newSettings.liveSportsProviders = newSettings.liveSportsProviders.filter((_, i) => i !== index);
    }
    setSettings(newSettings);
    await saveSettings(newSettings);
    setConfirmDeleteIndex(null);
  };

  const toggleSource = async (index) => {
    const newSettings = JSON.parse(JSON.stringify(settings));
    const list = type === 'moviebox' ? newSettings.movieboxSources : newSettings.liveSportsProviders;
    
    const currentlyEnabled = list.filter(s => s.enabled).length;
    if (!list[index].enabled && currentlyEnabled >= 3) {
      Alert.alert('Limit Reached', 'You can only have 3 active sources at once.');
      return;
    }

    list[index].enabled = !list[index].enabled;
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleUpdate = async () => {
    if (editingIndex === null || !newName || !newUrl) return;
    setIsTesting(true);
    const isWorking = await testUrlAvailability(newUrl);
    setIsTesting(false);
    finalizeUpdate(isWorking);
  };

  const finalizeUpdate = async (isWorking) => {
    const newSettings = JSON.parse(JSON.stringify(settings));
    const list = type === 'moviebox' ? newSettings.movieboxSources : newSettings.liveSportsProviders;
    
    list[editingIndex] = { 
      ...list[editingIndex], 
      name: newName, 
      url: newUrl,
      enabled: isWorking ? list[editingIndex].enabled : false
    };

    setSettings(newSettings);
    await saveSettings(newSettings);
    setEditingIndex(null);
    setNewName('');
    setNewUrl('');
  };

  if (!settings) return null;
  const currentList = type === 'moviebox' ? settings.movieboxSources : settings.liveSportsProviders;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage {type === 'moviebox' ? 'MovieBox' : 'Sports'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.addCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1.2 }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Name"
              placeholderTextColor="#666"
            />
            <TextInput
              style={[styles.input, { flex: 2 }]}
              value={newUrl}
              onChangeText={setNewUrl}
              placeholder="URL"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.addBtn, isTesting && { opacity: 0.6 }]} 
            onPress={editingIndex !== null ? handleUpdate : (showForceAdd ? () => handleAdd(true) : () => handleAdd(false))}
            disabled={isTesting}
          >
            <LinearGradient 
              colors={showForceAdd ? ['#ff4444', '#cc0000'] : [Colors.accentPurple, Colors.accentPink]} 
              start={{x:0,y:0}} end={{x:1,y:0}} 
              style={styles.addGradient}
            >
              {isTesting ? <ActivityIndicator size="small" color="#fff" /> : (
                <Text style={styles.addBtnText}>
                  {editingIndex !== null ? 'SAVE CHANGES' : (showForceAdd ? 'URL UNREACHABLE - ADD ANYWAY?' : 'ADD NEW SOURCE')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          {showForceAdd && (
            <TouchableOpacity onPress={() => setShowForceAdd(false)} style={styles.cancelAdd}>
              <Text style={styles.cancelAddText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>ACTIVE SOURCES ({currentList.filter(s => s.enabled).length}/3)</Text>
        
        {currentList.map((item, idx) => (
          <View key={`${item.url}-${idx}`} style={[styles.sourceItem, !item.enabled && { opacity: 0.6 }]}>
            <View style={styles.sourceMain}>
              <View style={styles.sourceText}>
                <Text style={styles.sourceName}>{item.name}</Text>
                <Text style={styles.sourceUrl} numberOfLines={1}>{item.url}</Text>
              </View>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleSource(idx)}
                trackColor={{ false: '#222', true: Colors.accentPurple + '40' }}
                thumbColor={item.enabled ? Colors.accentPurple : '#444'}
              />
            </View>
            <View style={styles.sourceFooter}>
              <TouchableOpacity onPress={() => { setEditingIndex(idx); setNewName(item.name); setNewUrl(item.url); }} style={styles.toolBtn}>
                <Icon name="pencil" size={16} color="#aaa" />
                <Text style={styles.toolText}>Edit</Text>
              </TouchableOpacity>
              <View style={styles.dot} />
              <TouchableOpacity 
                onPress={() => handleDelete(idx)} 
                style={[styles.toolBtn, confirmDeleteIndex === idx && styles.confirmBtn]}
              >
                <Icon 
                  name={confirmDeleteIndex === idx ? "alert-circle" : "trash-can-outline"} 
                  size={16} 
                  color={confirmDeleteIndex === idx ? "#fff" : "#ff4444"} 
                />
                <Text style={[styles.toolText, { color: confirmDeleteIndex === idx ? "#fff" : "#ff4444" }]}>
                  {confirmDeleteIndex === idx ? "CONFIRM?" : "Remove"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {currentList.length === 0 && <Text style={styles.empty}>No sources added.</Text>}
      </ScrollView>


    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  scrollContent: { padding: 16 },
  addCard: { backgroundColor: '#12121A', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#1F1F2B' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: { backgroundColor: '#050508', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2A2A36' },
  addBtn: { borderRadius: 10, overflow: 'hidden' },
  addGradient: { paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  label: { color: '#666', fontSize: 11, fontWeight: '800', marginBottom: 12, letterSpacing: 1.5, marginLeft: 4 },
  sourceItem: { backgroundColor: '#12121A', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F2B' },
  sourceMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sourceText: { flex: 1, marginRight: 12 },
  sourceName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sourceUrl: { color: '#666', fontSize: 13, marginTop: 2 },
  sourceFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1F1F2B', paddingTop: 10, gap: 16 },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  confirmBtn: { backgroundColor: '#ff4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cancelAdd: { marginTop: 10, alignItems: 'center' },
  cancelAddText: { color: '#666', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1F1F2B' },
  empty: { color: '#444', textAlign: 'center', marginTop: 40, fontSize: 15 },
});

export default SourceManagerScreen;
