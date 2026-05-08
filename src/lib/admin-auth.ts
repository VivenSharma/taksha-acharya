import { api } from './api-client';

export async function signIn(email: string, password: string) {
  return await api.auth.login(email, password);
}

export async function signOut() {
  await api.auth.logout();
}

export async function getSessionEmail(): Promise<string | null> {
  try {
    const r = await api.auth.me();
    return r.email;
  } catch {
    return null;
  }
}
