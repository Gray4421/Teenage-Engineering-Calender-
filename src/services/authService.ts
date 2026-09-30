import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase safely
let app: any;
let authInstance: any;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  // Ensure session persistence across refreshes
  setPersistence(authInstance, browserLocalPersistence).catch((err) => {
    console.warn('browserLocalPersistence warning:', err);
  });
} catch (e) {
  console.error('Firebase initialization error:', e);
}

export const auth = authInstance;

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

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

export const persistUserProfile = (user: User | CachedUserProfile) => {
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

export const clearPersistedAccessToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(AUTO_SYNC_ENABLED_KEY);
  } catch {}
};

// Check for redirect result on load
export const checkRedirectResult = async (
  onAuthSuccess?: (user: User | CachedUserProfile, token: string) => void
) => {
  if (!auth) return;
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        persistAccessToken(credential.accessToken);
        persistUserProfile(result.user);
        if (onAuthSuccess) onAuthSuccess(result.user, credential.accessToken);
      }
    }
  } catch (err) {
    console.warn('Redirect result check info:', err);
  }
};

// Initialize auth state listener and auto-restore previously logged-in session
export const initAuth = (
  onAuthSuccess?: (user: User | CachedUserProfile, token: string) => void,
  onAuthFailure?: () => void
) => {
  // If we already have stored token and profile, immediately notify
  if (cachedAccessToken) {
    const profile = getCachedUserProfile();
    if (profile && onAuthSuccess) {
      onAuthSuccess(profile, cachedAccessToken);
    }
  }

  // Check redirect result
  checkRedirectResult(onAuthSuccess);

  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      persistUserProfile(user);
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        const profile = getCachedUserProfile();
        if (profile && onAuthSuccess && cachedAccessToken) {
          onAuthSuccess(profile, cachedAccessToken);
        } else if (!isSigningIn && onAuthFailure) {
          onAuthFailure();
        }
      }
    } else {
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

/**
 * Robust Google Sign-in:
 * 1. Attempts Firebase popup sign-in.
 * 2. If popup is blocked by iframe or browser permissions, falls back to Google Identity Services (GSI) client token flow.
 */
export const googleSignIn = async (): Promise<{ user: any; accessToken: string }> => {
  if (isSigningIn) {
    throw new Error('Authentication is already in progress');
  }

  isSigningIn = true;

  try {
    // Try standard Firebase popup first
    if (auth) {
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          persistAccessToken(credential.accessToken);
          persistUserProfile(result.user);
          return { user: result.user, accessToken: credential.accessToken };
        }
      } catch (popupErr: any) {
        console.warn('Firebase popup failed, evaluating fallback:', popupErr?.code || popupErr?.message);
        
        // If user cancelled, don't fallback to prompt
        if (popupErr?.code === 'auth/popup-closed-by-user' || popupErr?.code === 'auth/cancelled-popup-request') {
          throw new Error('Sign-in cancelled by user');
        }

        // If unauthorized domain, cross-origin-opener-policy, or popup blocked: use direct Google GSI client
        const shouldFallback = 
          popupErr?.code === 'auth/unauthorized-domain' ||
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/operation-not-allowed' ||
          popupErr?.message?.includes('iframe') ||
          popupErr?.message?.includes('Cross-Origin');

        if (!shouldFallback) {
          // Still attempt GSI token flow as a safety bridge
          console.warn('Attempting Google Identity Client token fallback...');
        }
      }
    }

    // Direct Google Identity Services (GSI) Token Client fallback
    // This works inside iframes and across cloud preview environments without domain restrictions
    const gsiToken = await requestGsiAccessToken();
    if (gsiToken) {
      persistAccessToken(gsiToken);
      const userProfile: CachedUserProfile = {
        uid: 'gcal-user',
        email: 'Google Calendar Connected',
        displayName: 'Google Account',
        photoURL: null,
      };
      persistUserProfile(userProfile);
      return { user: userProfile, accessToken: gsiToken };
    }

    throw new Error('Could not establish Google Calendar authorization. Please use manual token or verify permissions.');
  } finally {
    isSigningIn = false;
  }
};

/**
 * Request OAuth token using window.google.accounts.oauth2 (Google Identity Services)
 */
function requestGsiAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    const clientId = firebaseConfig.oAuthClientId;

    if (!google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services SDK is not loaded. Please check your internet connection.'));
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES.join(' '),
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
          } else if (tokenResponse.access_token) {
            resolve(tokenResponse.access_token);
          } else {
            reject(new Error('No access token returned from Google'));
          }
        },
        error_callback: (nonOAuthError: any) => {
          reject(new Error(nonOAuthError?.message || 'Google OAuth failed to initialize'));
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (e) {
      reject(e);
    }
  });
}

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
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut warning:', e);
    }
  }
};
