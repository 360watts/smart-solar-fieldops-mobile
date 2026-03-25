import * as SecureStore from 'expo-secure-store';

const TOKENS_KEY = 'authTokens';
const USER_KEY = 'authUser';

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_number?: string;
  address?: string;
  is_staff: boolean;
  is_superuser: boolean;
};

export async function getStoredTokens(): Promise<AuthTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function storeAuth(tokens: AuthTokens, user: AuthUser) {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearStoredAuth() {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

