import * as admin from "firebase-admin";

// Check if Firebase Admin has already been initialized
if (!admin.apps.length) {
  try {
    // Get the encoded service account JSON from environment variable
    const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!encodedServiceAccount) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set"
      );
    }

    // Decode the Base64 encoded service account
    const decodedServiceAccount = Buffer.from(
      encodedServiceAccount,
      "base64"
    ).toString();

    // Parse the JSON
    const serviceAccount = JSON.parse(decodedServiceAccount);

    // Initialize the app with the service account
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: process.env.FIREBASE_ADMIN_STORAGE_BUCKET || "",
    });

    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
  }
}

// Export the admin instance
export const firebaseAdmin = admin;
export const firestore = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();
