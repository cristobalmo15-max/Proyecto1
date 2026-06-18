import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use local persistence so session survives redirects and tab closes
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app, 'ai-studio-3855d0b1-99e2-4f40-9ff5-b39b8506c4a7');
export const storage = getStorage(app, firebaseConfig.storageBucket);

// Provider for basic login — NO sensitive scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Provider for Gmail/Calendar — only when user explicitly connects inbox
export const googleProviderWithScopes = new GoogleAuthProvider();
googleProviderWithScopes.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProviderWithScopes.addScope('https://www.googleapis.com/auth/calendar.events');
googleProviderWithScopes.setCustomParameters({ prompt: 'select_account' });

// Variable para cachear el token en memoria con respaldo en localStorage
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null;

// Basic login with popup — no restricted scopes so Google won't reject it
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (err: any) {
    // Fallback to redirect if popup is blocked
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      sessionStorage.setItem('loginViaRedirect', 'true');
      await signInWithRedirect(auth, googleProvider);
    }
    throw err;
  }
};

// Extended login for Gmail/Calendar — uses redirect
export const loginWithGoogleScopes = async () => {
  sessionStorage.setItem('pendingGmailConnect', 'true');
  await signInWithRedirect(auth, googleProviderWithScopes);
};

export const getLoginRedirectResult = async () => {
  const result = await getRedirectResult(auth);
  if (result) {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      localStorage.setItem('google_access_token', credential.accessToken);
    }
  }
  return result;
};

export const getAccessToken = () => cachedAccessToken;

export const logout = () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_access_token');
    sessionStorage.removeItem('google_access_token');
  }
  return signOut(auth);
};

export const sendAccessLink = async (email: string, isPermissionRequest = false) => {
  const actionCodeSettings = {
    url: isPermissionRequest ? `${window.location.origin}/?permission=true` : window.location.href,
    handleCodeInApp: true,
  };
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  } catch (error) {
    console.error("Error sending sign-in link:", error);
    throw error;
  }
};

export { isSignInWithEmailLink, signInWithEmailLink };
