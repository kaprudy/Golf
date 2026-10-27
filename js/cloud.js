// Inloggen en opslag op de eigen server (golf.kapital.nl, zie server/).
// Wordt alleen geladen als API_URL in js/config.js is ingevuld.
import { API_URL } from './config.js';

const TOKEN_KEY = 'golfscore-cloud';
const listeners = [];

function loadSession() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) ?? null; } catch { return null; }
}
function saveSession(session) {
  try {
    if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* geen opslag: alleen deze sessie ingelogd */ }
  listeners.forEach((cb) => cb(session?.user ?? null));
}

let session = loadSession();

class CloudError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function api(method, path, body) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new CloudError(0, 'Geen verbinding met de server (geen internet?).');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.status === 401 && session && !path.startsWith('/api/login')) {
    session = null; // token verlopen of ingetrokken
    saveSession(null);
  }
  if (!res.ok) throw new CloudError(res.status, data?.error ?? `Serverfout (${res.status})`);
  return data;
}

export async function currentUser() {
  if (!session) return null;
  try {
    const { user } = await api('GET', '/api/me');
    return user;
  } catch (err) {
    // Offline: met de bewaarde gegevens doorgaan; synchroniseren lukt later wel.
    return err.status === 0 ? session?.user ?? null : null;
  }
}

export function onAuthChange(callback) {
  listeners.push(callback);
}

async function authenticate(path, email, password) {
  const result = await api('POST', path, { email, password });
  session = { token: result.token, user: result.user };
  saveSession(session);
  return result.user;
}

export const login = (email, password) => authenticate('/api/login', email, password);
export const register = (email, password) => authenticate('/api/register', email, password);

export async function signOut() {
  try { await api('POST', '/api/logout'); } catch { /* ook offline uitloggen */ }
  session = null;
  saveSession(null);
}

export async function fetchState() {
  return api('GET', '/api/state'); // null als er nog niets op de server staat
}

export async function pushState(_userId, data) {
  return (await api('PUT', '/api/state', { data })).updated_at;
}

// Verwijdert account én gegevens op de server.
export async function deleteState() {
  await api('DELETE', '/api/state');
  session = null;
  saveSession(null);
}

export function describeCloudError(err) {
  return err?.message ?? String(err);
}
