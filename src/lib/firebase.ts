/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { HistoryItem } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request the drive.file scope explicitly to read/write files created by this app
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If there is a user but no cached token, they might have reloaded.
        // In firebase popup-auth, we might need a fresh login to retrieve the scopes token, 
        // or we can prompt them to connect. We flag that they need connect or try to get it.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Start Google sign-in
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// --- Google Drive Storage Integration ---
const DRIVE_FILE_NAME = 'casio_991_calculator_history.json';

/**
 * Searches for the history file in Google Drive. If found, returns its file ID.
 */
async function locateHistoryFile(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Google Drive API error: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id; // Return the first matching file ID
    }
    return null;
  } catch (err) {
    console.error('Failed to locate file in Drive:', err);
    return null;
  }
}

/**
 * Reads mathematical history from Google Drive.
 */
export async function loadHistoryFromDrive(token: string): Promise<HistoryItem[] | null> {
  try {
    const fileId = await locateHistoryFile(token);
    if (!fileId) {
      return null; // File doesn't exist yet
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Google Drive Download error: ${res.statusText}`);
    }

    const history = await res.json();
    return Array.isArray(history) ? history : [];
  } catch (err) {
    console.error('Failed to download history from Drive:', err);
    return null;
  }
}

/**
 * Saves mathematical history to Google Drive.
 * Writes a full-overwrite of the JSON payload.
 */
export async function saveHistoryToDrive(token: string, history: HistoryItem[]): Promise<boolean> {
  try {
    const fileId = await locateHistoryFile(token);
    const contentBlob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });

    if (fileId) {
      // Update existing file
      const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: contentBlob,
      });

      if (!res.ok) {
        throw new Error(`Google Drive update error: ${res.statusText}`);
      }
      return true;
    } else {
      // Create a brand new file
      // A standard Drive file creation requires a multipart request to send metadata and content,
      // or we can create metadata first, then patch media, or send as a multipart form.
      // Multipart upload is cleaner:
      const boundary = 'foo_bar_boundary';
      const metadata = {
        name: DRIVE_FILE_NAME,
        mimeType: 'application/json',
      };

      const multipartBody = 
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(history, null, 2)}\r\n` +
        `--${boundary}--`;

      const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!res.ok) {
        // Fallback or log error
        const errText = await res.text();
        throw new Error(`Google Drive create error: ${res.statusText} - ${errText}`);
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to sync history to Google Drive:', err);
    return false;
  }
}
