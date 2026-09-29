import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure Firebase Auth session is persisted across page reloads & visits
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set browserLocalPersistence:', err);
});

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Configure standard prompt
provider.setCustomParameters({
  prompt: 'select_account',
});

const TOKEN_STORAGE_KEY = 'op_cal_gcal_oauth_token';
const TOKEN_EXPIRY_KEY = 'op_cal_gcal_oauth_expiry';
const USER_PROFILE_KEY = 'op_cal_cached_user_profile';
const AUTO_SYNC_ENABLED_KEY = 'op_cal_auto_sync_active';

export interface CachedUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Read persisted access token on module load
try {
  const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  // If no explicit expiry or valid within buffer, restore token
  if (savedToken && (!expiry || Date.now() < parseInt(expiry, 10))) {
    cachedAccessToken = savedToken;
  }
} catch (e) {
  console.warn('Error reading token from storage:', e);
}

export const getCachedUserProfile = (): CachedUserProfile | null => {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const persistAccessToken = (token: string, expiresInSeconds: number = 7200) => {
  cachedAccessToken = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
    localStorage.setItem(AUTO_SYNC_ENABLED_KEY, 'true');
  } catch {}
};

export const persistUserProfile = (user: User) => {
  try {
    const profile: CachedUserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch {}
};

export const isAutoSyncEnabled = (): boolean => {
  try {
    return localStorage.getItem(AUTO_SYNC_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const clearPersistedAccessToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(AUTO_SYNC_ENABLED_KEY);
  } catch {}
};

// Initialize auth state listener and auto-restore previously logged-in session
export const initAuth = (
  onAuthSuccess?: (user: User | CachedUserProfile, token: string) => void,
  onAuthFailure?: () => void
) => {
  // If we already have stored token and profile, immediately notify to avoid any flash of unauthenticated UI
  if (cachedAccessToken) {
    const profile = getCachedUserProfile();
    if (profile && onAuthSuccess) {
      onAuthSuccess(profile, cachedAccessToken);
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      persistUserProfile(user);
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Logged in with Firebase, but OAuth access token might need silent re-request
        const profile = getCachedUserProfile();
        if (profile && onAuthSuccess && cachedAccessToken) {
          onAuthSuccess(profile, cachedAccessToken);
        } else if (!isSigningIn && onAuthFailure) {
          onAuthFailure();
        }
      }
    } else {
      // User is not signed in to Firebase
      if (cachedAccessToken) {
        const profile = getCachedUserProfile();
        if (profile && onAuthSuccess) {
          onAuthSuccess(profile, cachedAccessToken);
          return;
        }
      }
      if (!cachedAccessToken && onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

// Google Sign-in with Workspace OAuth popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Calendar access token from sign-in response');
    }

    persistAccessToken(credential.accessToken);
    persistUserProfile(result.user);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: unknown) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (saved && (!expiry || Date.now() < parseInt(expiry, 10))) {
      cachedAccessToken = saved;
      return cachedAccessToken;
    }
  } catch {}
  return null;
};

export const setManualAccessToken = (token: string) => {
  persistAccessToken(token);
};

export const logoutGoogle = async () => {
  clearPersistedAccessToken();
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('SignOut warning:', e);
  }
};
