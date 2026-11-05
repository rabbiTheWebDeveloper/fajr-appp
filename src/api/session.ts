import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Where the login session lives on the phone.
 *
 * The server signs people in with an httpOnly `auth_token` cookie. The app keeps that token itself
 * (encrypted, in the Android Keystore through SecureStore) and sends it as a Cookie header.
 *
 * "jar" mode is the fallback for a phone where the cookie could not be read from the login reply:
 * there the system cookie store holds it and the app only remembers that a session exists.
 */

export type SessionMode = "token" | "jar";

export interface SessionUser {
  _id: string;
  role: "student" | "teacher";
  fullName: string;
  email?: string;
  avatar?: string | null;
  studentId?: string;
  teacherId?: string;
  phone?: string;
  [key: string]: unknown;
}

const TOKEN_KEY = "fajr.auth_token";
const MODE_KEY = "fajr.session_mode";
const USER_KEY = "fajr.session_user";
const LAST_ID_KEY = "fajr.last_identifier";

let memoryToken: string | null = null;
let memoryMode: SessionMode | null = null;

const secureAvailable = Platform.OS !== "web";

async function secureGet(key: string): Promise<string | null> {
  if (!secureAvailable) return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (!secureAvailable) return AsyncStorage.setItem(key, value);
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (!secureAvailable) return AsyncStorage.removeItem(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Nothing stored
  }
}

export const Session = {
  /** Read once at start-up; afterwards the token is served from memory */
  async load(): Promise<{ mode: SessionMode | null; user: SessionUser | null }> {
    const [token, mode, rawUser] = await Promise.all([secureGet(TOKEN_KEY), AsyncStorage.getItem(MODE_KEY), AsyncStorage.getItem(USER_KEY)]);
    memoryToken = token;
    memoryMode = mode === "jar" ? "jar" : token ? "token" : null;
    let user: SessionUser | null = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser) as SessionUser;
      } catch {
        user = null;
      }
    }
    return { mode: memoryMode, user: memoryMode ? user : null };
  },

  token(): string | null {
    return memoryToken;
  },

  mode(): SessionMode | null {
    return memoryMode;
  },

  async startWithToken(token: string, user: SessionUser): Promise<void> {
    memoryToken = token;
    memoryMode = "token";
    await Promise.all([secureSet(TOKEN_KEY, token), AsyncStorage.setItem(MODE_KEY, "token"), AsyncStorage.setItem(USER_KEY, JSON.stringify(user))]);
  },

  async startWithJar(user: SessionUser): Promise<void> {
    memoryToken = null;
    memoryMode = "jar";
    await Promise.all([secureDelete(TOKEN_KEY), AsyncStorage.setItem(MODE_KEY, "jar"), AsyncStorage.setItem(USER_KEY, JSON.stringify(user))]);
  },

  async saveUser(user: SessionUser): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    memoryToken = null;
    memoryMode = null;
    await Promise.all([secureDelete(TOKEN_KEY), AsyncStorage.removeItem(MODE_KEY), AsyncStorage.removeItem(USER_KEY)]);
  },

  /** The email / ID last used to sign in, to pre-fill the login form */
  async lastIdentifier(): Promise<string> {
    return (await AsyncStorage.getItem(LAST_ID_KEY)) ?? "";
  },

  async rememberIdentifier(identifier: string): Promise<void> {
    await AsyncStorage.setItem(LAST_ID_KEY, identifier);
  },
};
