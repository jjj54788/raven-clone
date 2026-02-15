import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

let firebaseApp: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error('Firebase configuration is missing. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
  }

  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
  } else {
    firebaseApp = initializeApp({ apiKey, authDomain, projectId });
  }

  return firebaseApp;
}

export async function signInWithGoogle(): Promise<{
  idToken: string;
  displayName: string;
  email: string;
  photoURL: string;
}> {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();

  return {
    idToken,
    displayName: result.user.displayName || '',
    email: result.user.email || '',
    photoURL: result.user.photoURL || '',
  };
}
