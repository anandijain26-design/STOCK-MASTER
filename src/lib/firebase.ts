'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  deleteUser,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleAuthProvider);
}

export async function linkGmailAccount() {
  if (!auth.currentUser) {
    return signInWithPopup(auth, googleAuthProvider);
  }
  return linkWithPopup(auth.currentUser, googleAuthProvider);
}

export function isGmailConnected(user: User | null): boolean {
  if (!user) return false;
  const hasGoogleProvider = user.providerData.some((p) => p.providerId === 'google.com');
  const isGmailAddr = Boolean(user.email && user.email.toLowerCase().endsWith('@gmail.com'));
  return hasGoogleProvider || isGmailAddr;
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(cred.user);
  } catch {
    // Non-blocking verification send
  }
  return cred;
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  return signOut(auth);
}

export async function deleteCurrentFirebaseUser() {
  if (auth.currentUser) {
    return deleteUser(auth.currentUser);
  }
}
