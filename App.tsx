// StreamDeck Mobile — App Entry Point
import React, {useState, useEffect} from 'react';
import {StatusBar, LogBox, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/BottomTabNavigator';
import ApiKeySetupModal from './src/components/ApiKeySetupModal';
import {Colors} from './src/theme/colors';
import {getApiKey} from './src/utils/storage';

// Suppress known harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested inside plain ScrollViews',
]);

const App = () => {
  const [isKeyReady, setIsKeyReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkInitialKey();
  }, []);

  const checkInitialKey = async () => {
    const key = await getApiKey();
    if (key) {
      setIsKeyReady(true);
    }
    setIsChecking(false);
  };

  if (isChecking) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
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
          <StatusBar
            barStyle="light-content"
            backgroundColor="transparent"
            translucent
          />
          {isKeyReady && <RootNavigator />}
          {!isKeyReady && <ApiKeySetupModal onKeySaved={() => setIsKeyReady(true)} onSkip={() => setIsKeyReady(true)} />}
        </NavigationContainer>
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
