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
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.setCustomParameters({ 
  prompt: 'select_account login',
  display: 'popup'
});

// Configuración para el link de acceso por email
const actionCodeSettings = {
  url: window.location.href, // Redirigir de vuelta a esta misma página
  handleCodeInApp: true,
};


// Variable para cachear el token en memoria con respaldo en sessionStorage
let cachedAccessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('google_access_token') : null;

export const loginWithGoogle = async () => {
    // Use redirect instead of popup — more reliable in production
    await signInWithRedirect(auth, googleProvider);
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
