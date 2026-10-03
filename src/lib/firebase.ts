import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, limit, type DocumentData } from 'firebase/firestore';

// Firebase configuration - lovelink-app-b6156
// Hardcoded credentials - no env variable fallbacks to avoid empty string issues
const firebaseConfig = {
  apiKey: "AIzaSyBCX4pcvk8uYmecyUviPh6lT96WCahIlIY",
  authDomain: "lovelink-app-b6156.firebaseapp.com",
  projectId: "lovelink-app-b6156",
  storageBucket: "lovelink-app-b6156.firebasestorage.app",
  messagingSenderId: "100544585357",
  appId: "1:100544585357:web:5603402743be4b74320cc4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============ AUTH HELPERS ============

export async function registerUser(email: string, password: string, displayName: string): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  return userCredential.user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ============ COUPLE CODE HELPERS ============

function generateCoupleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'LOVE-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateAndSaveCoupleCode(userId: string): Promise<string> {
  const code = generateCoupleCode();
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    coupleCode: code,
    partnerId: null,
    createdAt: serverTimestamp(),
  }, { merge: true });

  // Also store the code in a separate collection for lookup
  const codeDocRef = doc(db, 'coupleCodes', code);
  await setDoc(codeDocRef, {
    createdBy: userId,
    partnerId: null,
    createdAt: serverTimestamp(),
  });

  return code;
}

export async function connectWithCode(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
  const upperCode = code.toUpperCase().trim();
  const codeDocRef = doc(db, 'coupleCodes', upperCode);
  const codeDoc = await getDoc(codeDocRef);

  if (!codeDoc.exists()) {
    return { success: false, error: 'Invalid couple code. Please check and try again.' };
  }

  const codeData = codeDoc.data();

  if (codeData.createdBy === userId) {
    return { success: false, error: 'You cannot connect with your own code.' };
  }

  if (codeData.partnerId) {
    return { success: false, error: 'This couple code has already been used by another partner.' };
  }

  // Check if user already has a partner
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists() && userDoc.data()?.partnerId) {
    return { success: false, error: 'You are already connected with a partner.' };
  }

  // Connect them
  await updateDoc(codeDocRef, { partnerId: userId, connectedAt: serverTimestamp() });
  await setDoc(userDocRef, {
    coupleCode: upperCode,
    partnerId: codeData.createdBy,
    createdAt: serverTimestamp(),
  }, { merge: true });

  // Update the creator's doc with partner info
  const creatorDocRef = doc(db, 'users', codeData.createdBy);
  await updateDoc(creatorDocRef, { partnerId: userId });

  return { success: true };
}

export async function getUserData(userId: string): Promise<DocumentData | null> {
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  return userDoc.exists() ? userDoc.data() : null;
}

export async function getPartnerData(userId: string): Promise<DocumentData | null> {
  const userData = await getUserData(userId);
  if (!userData?.partnerId) return null;

  const partnerDocRef = doc(db, 'users', userData.partnerId);
  const partnerDoc = await getDoc(partnerDocRef);
  return partnerDoc.exists() ? partnerDoc.data() : null;
}

// ============ CHAT HELPERS ============

export function getChatCollectionPath(userId: string, partnerId: string): string {
  // Use a deterministic path so both users access the same chat
  const ids = [userId, partnerId].sort();
  return `chats/${ids[0]}_${ids[1]}/messages`;
}

export async function sendMessage(userId: string, partnerId: string, text: string) {
  const chatPath = getChatCollectionPath(userId, partnerId);
  const [userId1, userId2] = [userId, partnerId].sort();
  const chatDocRef = doc(db, 'chats', `${userId1}_${userId2}`);

  // Ensure chat document exists
  const chatDoc = await getDoc(chatDocRef);
  if (!chatDoc.exists()) {
    await setDoc(chatDocRef, {
      user1: userId1,
      user2: userId2,
      createdAt: serverTimestamp(),
    });
  }

  await addDoc(collection(db, chatPath), {
    text,
    senderId: userId,
    createdAt: serverTimestamp(),
  });
}

export async function sendMessageWithImage(userId: string, partnerId: string, text: string, image?: string) {
  const chatPath = getChatCollectionPath(userId, partnerId);
  const [userId1, userId2] = [userId, partnerId].sort();
  const chatDocRef = doc(db, 'chats', `${userId1}_${userId2}`);

  const chatDoc = await getDoc(chatDocRef);
  if (!chatDoc.exists()) {
    await setDoc(chatDocRef, {
      user1: userId1,
      user2: userId2,
      createdAt: serverTimestamp(),
    });
  }

  // Store as JSON to support image data
  const messageData = JSON.stringify({ text, image });

  await addDoc(collection(db, chatPath), {
    text: messageData,
    senderId: userId,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToMessages(
  userId: string,
  partnerId: string,
  callback: (messages: Array<{ id: string; text: string; senderId: string; createdAt: any }>) => void
) {
  const chatPath = getChatCollectionPath(userId, partnerId);
  const q = query(
    collection(db, chatPath),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Array<{ id: string; text: string; senderId: string; createdAt: any }>;
    callback(messages);
  });
}

// ============ MEMORIES (live counter source) ============

export function subscribeToMemories(
  userId: string,
  partnerId: string,
  callback: (memories: Array<{ id: string; title: string; date: string }>) => void
) {
  const chatId = [userId, partnerId].sort().join('_');
  return onSnapshot(
    query(collection(db, 'chats', chatId, 'memories'), orderBy('date', 'desc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
  );
}

// ============ CALL SIGNALING HELPERS ============

function getCallDocId(userId1: string, userId2: string): string {
  // Use sorted IDs for deterministic path
  const ids = [userId1, userId2].sort();
  return `${ids[0]}_${ids[1]}`;
}

export async function initiateCall(callerId: string, partnerId: string, callType: 'video' | 'voice') {
  const callDocId = getCallDocId(callerId, partnerId);
  const callDocRef = doc(db, 'calls', callDocId);
  await setDoc(callDocRef, {
    callerId,
    receiverId: partnerId,
    type: callType,
    status: 'ringing',
    createdAt: serverTimestamp(),
  });
}

export async function acceptCall(userId: string, partnerId: string) {
  const callDocId = getCallDocId(userId, partnerId);
  const callDocRef = doc(db, 'calls', callDocId);
  await updateDoc(callDocRef, { status: 'accepted' });
}

export async function endCall(userId: string, partnerId: string) {
  const callDocId = getCallDocId(userId, partnerId);
  const callDocRef = doc(db, 'calls', callDocId);
  await updateDoc(callDocRef, { status: 'ended' });
}

export function subscribeToCallStatus(
  userId: string,
  partnerId: string,
  callback: (data: DocumentData | null) => void
) {
  const callDocId = getCallDocId(userId, partnerId);
  const callDocRef = doc(db, 'calls', callDocId);
  return onSnapshot(callDocRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
}

export function subscribeToIncomingCalls(
  userId: string,
  callback: (data: DocumentData | null) => void
) {
  const q = query(
    collection(db, 'calls'),
    where('receiverId', '==', userId),
    where('status', '==', 'ringing'),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      callback(snapshot.docs[0].data());
    } else {
      callback(null);
    }
  });
}

export { auth as firebaseAuth };
export type { User };
