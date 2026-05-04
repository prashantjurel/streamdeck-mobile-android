// StreamDeck Mobile — Bottom Tab Navigator
import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import LibraryScreen from '../screens/LibraryScreen';
import LiveTVScreen from '../screens/LiveTVScreen';
import AdventureScreen from '../screens/AdventureScreen';
import AdventurePreferencesScreen from '../screens/AdventurePreferencesScreen';
import AdventureQuestionsScreen from '../screens/AdventureQuestionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WebViewScreen from '../screens/WebViewScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

// Tab Icons using text/emoji
const TAB_ICONS = {
  Home: {default: '⌂', active: '⌂'},
  Explore: {default: '⊕', active: '⊕'},
  Adventure: {default: '✧', active: '✧'},
  Library: {default: '☰', active: '☰'},
  LiveTV: {default: '◉', active: '◉'},
  Settings: {default: '⚙', active: '⚙'},
};

const TabIcon = ({name, focused}) => {
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
      <Text
        style={[
          styles.tabIcon,
          focused && styles.tabIconActive,
        ]}>
        {focused ? TAB_ICONS[name]?.active : TAB_ICONS[name]?.default}
      </Text>
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
        tabBarActiveTintColor: Colors.accentPurple,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused}) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{tabBarLabel: 'Explore'}}
      />
      <Tab.Screen
        name="Adventure"
        component={AdventureStack}
        options={{tabBarLabel: 'Adventure'}}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{tabBarLabel: 'Library'}}
      />
      <Tab.Screen
        name="LiveTV"
        component={LiveTVScreen}
        options={{tabBarLabel: 'Live TV'}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{tabBarLabel: 'Settings'}}
      />
    </Tab.Navigator>
  );
};

// Root Stack Navigator
const RootNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    height: Platform.OS === 'android' ? 80 : 85,
    paddingBottom: Platform.OS === 'android' ? 24 : 28,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 20,
  },
  tabLabel: {
    fontSize: FontSizes.xs - 1,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeGlow: {
    width: '100%',
    height: '100%',
  },
  tabIcon: {
    fontSize: 22,
    color: Colors.textMuted,
  },
  tabIconActive: {
    color: Colors.accentPurple,
  },
});

export default RootNavigator;
