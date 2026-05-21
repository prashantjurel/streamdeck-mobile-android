// StreamDeck Mobile — App Entry Point
import React, {useState, useEffect} from 'react';
import {StatusBar, LogBox, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/BottomTabNavigator';
import {ApiProvider} from './src/context/ApiContext';
import {MediaDetailsProvider} from './src/context/MediaDetailsContext';
import {Colors} from './src/theme/colors';
import {configureGoogleSignIn} from './src/services/auth';

// Suppress known harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested inside plain ScrollViews',
]);

const App = () => {
  useEffect(() => {
    // Initialize Google Sign-In immediately so the onboarding modal can use it
    configureGoogleSignIn();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ApiProvider>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: Colors.accentPurple,
                background: Colors.bgPrimary,
                card: Colors.bgSecondary,
                text: Colors.textPrimary,
                border: Colors.borderSubtle,
                notification: Colors.accentPink,
              },
              fonts: {
                regular: {
                  fontFamily: 'System',
                  fontWeight: '400',
                },
                medium: {
                  fontFamily: 'System',
                  fontWeight: '500',
                },
                bold: {
                  fontFamily: 'System',
                  fontWeight: '700',
                },
                heavy: {
                  fontFamily: 'System',
                  fontWeight: '900',
                },
              },
            }}>
            <MediaDetailsProvider>
              <StatusBar
                barStyle="light-content"
                backgroundColor="transparent"
                translucent
              />
              <RootNavigator />
            </MediaDetailsProvider>
          </NavigationContainer>
        </ApiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
