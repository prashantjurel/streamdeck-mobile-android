import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAuth, signInWithCredential, GoogleAuthProvider, onAuthStateChanged as firebaseOnAuthStateChanged, signOut as firebaseSignOut } from '@react-native-firebase/auth';

/**
 * Configure Google Sign-In
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '678796992175-t4qmupieavn2g3phln30c6tv1cab6onc.apps.googleusercontent.com',
    offlineAccess: true,
    scopes: ['profile', 'email'], // Standard scopes for sync
    forceCodeForRefreshToken: true,
  });
};

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    
    // SAFE SCHEMA CHECK (Handles multiple library versions)
    const userInfo = response.data ? response.data : response;
    const userEmail = userInfo.user ? userInfo.user.email : 'Unknown';
    const idToken = userInfo.idToken;

    console.log('[Auth] Google Sign-In Attempt:', userEmail);
    
    if (!idToken) {
      console.error('[Auth] Critical: No ID Token received from Google.');
      throw new Error('Google Sign-In failed: No ID Token received. Ensure Google provider is active in Firebase Console.');
    }

    const auth = getAuth();
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);

    return userCredential.user;
  } catch (error) {
    const { statusCodes } = require('@react-native-google-signin/google-signin');
    let errorMessage = 'Could not connect to Google.';
    let technicalCode = error.code || 'unknown';

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User cancelled, no alert needed
      return null;
    } else if (error.code === statusCodes.IN_PROGRESS) {
      errorMessage = 'Sign-in is already in progress.';
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      errorMessage = 'Google Play Services not available.';
    } else if (error.code === '10' || error.code === 'DEVELOPER_ERROR') {
      errorMessage = 'Developer Error (10): Ensure SHA-1 fingerprint is registered in Firebase console.';
    }

    const { Alert } = require('react-native');
    Alert.alert('Sync Failed', `${errorMessage}\n\nTechnical Code: ${technicalCode}`);
    
    console.error('[Auth] Full Error Object:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    const auth = getAuth();
    await GoogleSignin.signOut();
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('[Auth] Sign-Out Error:', error);
    throw error;
  }
};

export const getCurrentUser = () => getAuth().currentUser;

export const onAuthStateChanged = (callback) => {
  const auth = getAuth();
  return firebaseOnAuthStateChanged(auth, callback);
};
