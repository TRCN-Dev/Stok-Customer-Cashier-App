import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Required Workspace scopes for Google Sheets and Google Drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

const TOKEN_STORAGE_KEY = 'trcn_google_access_token';
const SESSION_TIMESTAMP_KEY = 'trcn_session_last_active';

let isSigningIn = false;
let cachedAccessToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

/**
 * Initialize auth state listener. Call this on app load.
 * Restores persisted session so refreshing the page NEVER goes blank or logs out the user!
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null) || '';
      cachedAccessToken = token;
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      }
      if (onAuthSuccess) {
        onAuthSuccess(user, token);
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Interactive Google Sign-In with popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) {
    return null;
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Auth. Silakan coba login kembali.');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const isCancelled =
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('INTERNAL ASSERTION FAILED');

    if (isCancelled) {
      console.info('Google Sign-In dibatalkan atau jendela popup ditutup oleh pengguna.');
      return null;
    }

    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get current in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return cachedAccessToken;
};

/**
 * Set manual access token (e.g. when restored)
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
};

/**
 * Logout
 */
export const logout = async () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
  }
  await signOut(auth);
};
