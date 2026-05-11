// StreamDeck Mobile — Bottom Tab Navigator
import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import LibraryScreen from '../screens/LibraryScreen';
import LiveTVScreen from '../screens/LiveTVScreen';
import AdventureScreen from '../screens/AdventureScreen';
import AdventurePreferencesScreen from '../screens/AdventurePreferencesScreen';
import AdventureQuestionsScreen from '../screens/AdventureQuestionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SourceManagerScreen from '../screens/SourceManagerScreen';
import WebViewScreen from '../screens/WebViewScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack to keep tabs visible during search
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
    </Stack.Navigator>
  );
};

// Adventure Stack to keep tabs visible during preferences
const AdventureStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AdventureMain" component={AdventureScreen} />
      <Stack.Screen name="AdventurePreferences" component={AdventurePreferencesScreen} />
      <Stack.Screen name="AdventureQuestions" component={AdventureQuestionsScreen} />
    </Stack.Navigator>
  );
};

// Tab Icons using Ionicons
const TAB_ICONS = {
  Home: {default: 'home-outline', active: 'home'},
  Explore: {default: 'compass-outline', active: 'compass'},
  Adventure: {default: 'planet-outline', active: 'planet'},
  Library: {default: 'bookmark-outline', active: 'bookmark'},
  LiveTV: {default: 'tv-outline', active: 'tv'},
  Settings: {default: 'settings-outline', active: 'settings'},
};

const TabIcon = ({name, focused}) => {
  const iconName = focused ? TAB_ICONS[name]?.active : TAB_ICONS[name]?.default;
  return (
    <View style={styles.tabIconContainer}>
      {focused && (
        <View style={styles.activeIndicator}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentPink]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.activeGlow}
          />
        </View>
      )}
      <Ionicons
        name={iconName}
        size={24}
        color={focused ? '#fff' : Colors.textMuted}
        style={styles.iconShadow}
      />
    </View>
  );
};

// Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused}) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Adventure"
        component={AdventureStack}
        options={{tabBarLabel: 'Adventure'}}
      />
      <Tab.Screen
        name="LiveTV"
        component={LiveTVScreen}
        options={{tabBarLabel: 'Live TV'}}
      />
    </Tab.Navigator>
  );
};

// Root Stack Navigator
const RootNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SourceManager" component={SourceManagerScreen} />
      <Stack.Screen
        name="WebView"
        component={WebViewScreen}
        options={{
          animation: 'slide_from_right',
          presentation: 'fullScreenModal',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10, 10, 15, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    height: Platform.OS === 'android' ? 86 : 85,
    paddingBottom: Platform.OS === 'android' ? 32 : 28,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
    width: 60,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8, // Matches paddingTop of tabBar to touch the very edge
    width: 36,
    height: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    overflow: 'hidden',
  },
  activeGlow: {
    width: '100%',
    height: '100%',
    shadowColor: Colors.accentPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default RootNavigator;
