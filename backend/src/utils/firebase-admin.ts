import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;
let didWarnMissingFirebaseEnv = false;

export function isFirebaseAuthConfigured(): boolean {
  if (admin.apps.length > 0) return true;
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  return Boolean(projectId && clientEmail && privateKey);
}

function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  if (admin.apps.length > 0) {
    firebaseApp = admin.apps[0] ?? null;
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')?.trim();

  if (!projectId || !clientEmail || !privateKey) {
    if (!didWarnMissingFirebaseEnv) {
      didWarnMissingFirebaseEnv = true;
      console.warn('[Firebase] Missing environment variables. Google Sign-In will not work.');
    }
    return null;
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  return firebaseApp;
}

export async function verifyFirebaseToken(
  idToken: string,
): Promise<{ uid: string; email: string; name: string; picture: string } | null> {
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    const decoded = await app.auth().verifyIdToken(idToken);
    const email = decoded.email?.trim() || '';
    const name = decoded.name?.trim() || email || '';
    return {
      uid: decoded.uid,
      email,
      name,
      picture: decoded.picture || '',
    };
  } catch (error) {
    console.error('[Firebase] Token verification failed:', error);
    return null;
  }
}
