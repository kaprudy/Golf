// Inloggen en opslag in Supabase. Wordt alleen geladen als js/config.js is ingevuld.
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function currentUser() {
  const { data } = await client.auth.getSession();
  return data.session?.user ?? null;
}

export function onAuthChange(callback) {
  client.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}

// Stuurt een mail met een inlogcode (en een link). Nieuwe gebruikers worden aangemaakt.
export async function sendCode(email) {
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function verifyCode(email, token) {
  const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await client.auth.signOut();
}

export async function fetchState(userId) {
  const { data, error } = await client.from('golf_state').select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data; // null als er nog niets in de cloud staat
}

export async function pushState(userId, data) {
  const { data: row, error } = await client
    .from('golf_state')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() })
    .select('updated_at')
    .single();
  if (error) throw error;
  return row.updated_at;
}

export async function deleteState(userId) {
  const { error } = await client.from('golf_state').delete().eq('user_id', userId);
  if (error) throw error;
}

export function describeCloudError(err) {
  const msg = err?.message ?? String(err);
  if (/fetch|network/i.test(msg)) return 'Geen verbinding met de cloud (geen internet?).';
  if (/token|otp|expired|invalid/i.test(msg)) return 'De code klopt niet of is verlopen. Vraag een nieuwe aan.';
  if (/rate|too many/i.test(msg)) return 'Te veel pogingen. Wacht even en probeer het opnieuw.';
  return `Cloudfout: ${msg}`;
}
