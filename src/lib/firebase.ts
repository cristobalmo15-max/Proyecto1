import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserSessionPersistence,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Force session to clear when browser tab/window is closed for higher security
setPersistence(auth, browserSessionPersistence);

export const db = getFirestore(app, 'ai-studio-3855d0b1-99e2-4f40-9ff5-b39b8506c4a7');
export const storage = getStorage(app, firebaseConfig.storageBucket);

// Provider for basic login — NO sensitive scopes (works in production without app verification)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ 
  prompt: 'select_account'
});

// Provider for Gmail/Calendar — only used when user explicitly connects their inbox
export const googleProviderWithScopes = new GoogleAuthProvider();
googleProviderWithScopes.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProviderWithScopes.addScope('https://www.googleapis.com/auth/calendar.events');
googleProviderWithScopes.setCustomParameters({ 
  prompt: 'select_account'
});

// Configuración para el link de acceso por email
const actionCodeSettings = {
  url: window.location.href,
  handleCodeInApp: true,
};

// Variable para cachear el token en memoria con respaldo en sessionStorage
let cachedAccessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('google_access_token') : null;

// Basic login — redirects to Google, no restricted scopes
export const loginWithGoogle = async () => {
    await signInWithRedirect(auth, googleProvider);
};

// Extended login with Gmail/Calendar scopes — only when user connects inbox
export const loginWithGoogleScopes = async () => {
    await signInWithRedirect(auth, googleProviderWithScopes);
};

export const getLoginRedirectResult = async () => {
    const result = await getRedirectResult(auth);
    if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            cachedAccessToken = credential.accessToken;
            sessionStorage.setItem('google_access_token', credential.accessToken);
        }
    }
    return result;
};

export const getAccessToken = () => cachedAccessToken;
export const logout = () => {
    cachedAccessToken = null;
    if (typeof window !== 'undefined') {
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
