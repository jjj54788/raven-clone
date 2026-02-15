import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Missing environment variables. Google Sign-In will not work.');
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
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email || '',
      picture: decoded.picture || '',
    };
  } catch (error) {
    console.error('[Firebase] Token verification failed:', error);
    return null;
  }
}
