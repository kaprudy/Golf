// Inloggen en opslag op de eigen server (golf.kapital.nl, zie server/).
// Wordt alleen geladen als API_URL in js/config.js is ingevuld.
import { API_URL } from './config.js';

const TOKEN_KEY = 'golfscore-cloud';
// Geheim van deze telefoon voor een anoniem account, of {off:true} als de gebruiker uitlogde.
const DEVICE_KEY = 'golfscore-device';
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
  // status 0 = de server is niet bereikt; reason: 'offline' | 'blocked' (bereikbaar, maar weigert de app) | 'unreachable'
  constructor(status, message, reason = null) { super(message); this.status = status; this.reason = reason; }
}

// Na een mislukte aanroep: is de server wel bereikbaar? Een 'no-cors'-verzoek lukt ook als de
// server de app niet toestaat (CORS); dan weten we dat het daaraan ligt.
async function diagnose() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  try {
    await fetch(`${API_URL}/api/health`, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    return 'blocked';
  } catch {
    return 'unreachable';
  }
}

// Op de baan is het bereik vaak slecht: nooit eindeloos wachten.
const TIMEOUT_MS = 15000;

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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError') throw new CloudError(0, 'De server reageert te traag.', 'slow');
    const reason = await diagnose();
    console.warn('Golfscore: server niet bereikt', API_URL + path, reason, err);
    throw new CloudError(0, 'Geen verbinding met de server.', reason);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* geen JSON: bijv. een foutpagina van de webserver */ }
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
  setDeviceInfo({});
  return result.user;
}

export const login = (email, password) => authenticate('/api/login', email, password);
export const register = (email, password) => authenticate('/api/register', email, password);

function deviceInfo() {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) ?? {}; } catch { return {}; }
}
function setDeviceInfo(info) {
  try { localStorage.setItem(DEVICE_KEY, JSON.stringify(info)); } catch { /* geen opslag */ }
}

// Mag de app vanzelf een anoniem account voor deze telefoon gebruiken? Niet meer na uitloggen.
export const autoDeviceAllowed = () => !deviceInfo().off;

// Anoniem account voor deze telefoon: geen e-mail of wachtwoord nodig.
export async function deviceLogin() {
  let { secret } = deviceInfo();
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));
  }
  setDeviceInfo({ secret });
  const result = await api('POST', '/api/device', { secret });
  session = { token: result.token, user: result.user };
  saveSession(session);
  return result.user;
}

// Anoniem account omzetten naar e-mail en wachtwoord; gegevens blijven staan.
export async function upgradeAccount(email, password) {
  const { user } = await api('POST', '/api/account', { email, password });
  session = { ...session, user };
  saveSession(session);
  setDeviceInfo({}); // de oude apparaatcode geeft geen toegang meer
  return user;
}

export async function signOut() {
  try { await api('POST', '/api/logout'); } catch { /* ook offline uitloggen */ }
  session = null;
  saveSession(null);
  setDeviceInfo({ off: true }); // niet vanzelf weer inloggen; ook een gedeelde telefoon is dan echt uitgelogd
}

export async function fetchState() {
  return api('GET', '/api/state'); // null als er nog niets op de server staat
}

// baseUpdatedAt: de cloudversie waarop deze gegevens gebaseerd zijn. Is die intussen gewijzigd
// (ander toestel), dan weigert de server met 409 en moet er eerst samengevoegd worden.
export async function pushState(_userId, data, baseUpdatedAt) {
  return (await api('PUT', '/api/state', { data, baseUpdatedAt })).updated_at;
}

export const sessionToken = () => session?.token ?? null;

// Wachtwoord wijzigen; andere toestellen worden daarbij uitgelogd, dit toestel blijft ingelogd.
export async function changePassword(password, newPassword) {
  await api('POST', '/api/password', { password, newPassword });
}

// Alle andere toestellen uitloggen (bijv. een kwijtgeraakte telefoon). Geeft het aantal terug.
export async function logoutOthers() {
  return (await api('POST', '/api/logout-others')).loggedOut;
}

// Verwijdert account én gegevens op de server.
export async function deleteState() {
  await api('DELETE', '/api/state');
  session = null;
  saveSession(null);
  setDeviceInfo({ off: true });
}

// ---------- Leren van ingesproken tekst (alleen met toestemming) ----------

export const sendSamples = (samples) => api('POST', '/api/samples', { samples });
export const sampleStats = () => api('GET', '/api/samples/stats');
export const deleteSamples = () => api('DELETE', '/api/samples');
export const fetchVocab = () => api('GET', '/api/vocab');

// Gebruik (app geopend, ronde gestart/opgeslagen) voor het beheeroverzicht. Geen locatie.
export const sendEvents = (events) => api('POST', '/api/events', { events });

// Controleert of de server bereikbaar is. Geeft {ok, error}.
export async function testConnection() {
  try {
    await api('GET', '/api/health');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// Foutmelding voor de gebruiker: {title, detail} in gewone taal, met wat je kunt doen.
export function describeCloudError(err) {
  const host = API_URL.replace(/^https?:\/\//, '');
  const status = err?.status;
  if (status === 0) {
    if (err.reason === 'slow') {
      return { title: 'Traag bereik', detail: 'De verbinding is nu te traag. Je gegevens blijven op de telefoon staan en worden vanzelf gesynchroniseerd zodra het bereik beter is.' };
    }
    if (err.reason === 'offline') {
      return { title: 'Geen internet', detail: 'Je telefoon heeft nu geen verbinding met internet. Je gegevens blijven op de telefoon staan; probeer het opnieuw als je bereik hebt.' };
    }
    if (err.reason === 'blocked') {
      return {
        title: 'Server weigert de app',
        detail: `${host} is bereikbaar, maar staat verzoeken van de app niet toe (CORS). Zet in server/docker-compose.yml bij ALLOWED_ORIGINS het adres ${typeof location !== 'undefined' ? location.origin : 'van de app'} en herstart met: docker compose up -d`,
      };
    }
    return {
      title: 'Server niet bereikbaar',
      detail: `${host} reageert niet. Controleer of de server draait: open ${host} in je browser, daar moet "Opslagdienst werkt" staan.`,
    };
  }
  if (status === 401) return { title: 'Inloggen mislukt', detail: err.message };
  if (status === 403) return { title: 'Niet gelukt', detail: err.message };
  if (status === 409) return { title: 'Account bestaat al', detail: 'Er is al een account met dit e-mailadres. Tik op Inloggen.' };
  if (status === 400) return { title: 'Controleer je invoer', detail: err.message };
  if (status === 429) return { title: 'Even wachten', detail: err.message };
  if (status === 404) return { title: 'Server niet goed ingesteld', detail: `${host} antwoordt, maar de opslagdienst niet (404). Wordt /api/ doorgestuurd naar de API-container?` };
  return { title: 'Serverfout', detail: `${err?.message ?? err}${status ? ` (code ${status})` : ''}` };
}
