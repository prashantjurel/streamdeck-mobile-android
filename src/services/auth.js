import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAuth, signInWithCredential, GoogleAuthProvider, onAuthStateChanged as firebaseOnAuthStateChanged, signOut as firebaseSignOut } from '@react-native-firebase/auth';

/**
 * Configure Google Sign-In
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '678796992175-t4qmupieavn2g3phln30c6tv1cab6onc.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const { idToken } = await GoogleSignin.signIn();

    const auth = getAuth();
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);

    return userCredential.user;
  } catch (error) {
    // ELITE DIAGNOSTICS
    if (error.code) {
      console.error('[Auth] Google Sign-In Technical Error Code:', error.code);
      if (error.code === '10') console.error('[Auth] Error 10 (DEVELOPER_ERROR): This usually means your SHA-1 fingerprint is missing from Firebase.');
    }
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
