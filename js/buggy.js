// Verbinding met het buggy-scherm via Web Bluetooth (Chrome op Android, Windows, Mac).
// Safari op de iPhone ondersteunt geen Web Bluetooth.
import { SERVICE_UUID, STATE_UUID, INPUT_UUID, encodeState, decodeCommand } from './buggy-protocol.js';

export const buggySupported = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator;

export function createBuggy({ onCommand, onStatus }) {
  let device = null;
  let stateChar = null;
  let lastSent = '';
  let writing = Promise.resolve();
  let wanted = false; // gebruiker wil verbonden zijn: na wegvallen opnieuw proberen

  const status = (text, connected = false) => onStatus({ text, connected, name: device?.name ?? null });

  async function attach() {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    stateChar = await service.getCharacteristic(STATE_UUID);
    const input = await service.getCharacteristic(INPUT_UUID);
    input.addEventListener('characteristicvaluechanged', (e) => {
      const cmd = decodeCommand(new TextDecoder().decode(e.target.value));
      if (cmd) onCommand(cmd);
    });
    await input.startNotifications();
    lastSent = '';
    status('Verbonden', true);
    onCommand({ type: 'hello' });
  }

  async function reconnect() {
    for (let attempt = 1; wanted && device && !device.gatt.connected && attempt <= 5; attempt++) {
      status(`Verbinding verbroken, opnieuw proberen (${attempt}/5)…`);
      try { await attach(); return; } catch { await new Promise((r) => setTimeout(r, 2000 * attempt)); }
    }
    if (wanted && !device?.gatt.connected) status('Niet verbonden. Zet het scherm aan en tik op Verbinden.');
  }

  return {
    get connected() { return Boolean(device?.gatt.connected && stateChar); },

    // Moet vanuit een tik van de gebruiker worden aangeroepen (eis van de browser).
    async connect() {
      device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });
      device.addEventListener('gattserverdisconnected', () => { stateChar = null; reconnect(); });
      wanted = true;
      status('Verbinden…');
      await attach();
    },

    disconnect() {
      wanted = false;
      device?.gatt.disconnect();
      stateChar = null;
      status('Niet verbonden');
    },

    // Opnieuw verbinden met het eerder gekozen scherm (bijv. als de app weer zichtbaar wordt).
    resume() {
      if (wanted && device && !device.gatt.connected) reconnect();
    },

    // Stand naar het scherm sturen; alleen als er iets veranderd is.
    send(summary) {
      if (!stateChar) return;
      const json = encodeState(summary);
      if (json === lastSent) return;
      lastSent = json;
      const data = new TextEncoder().encode(json);
      writing = writing
        .then(() => stateChar?.writeValueWithResponse(data))
        .catch(() => { lastSent = ''; });
    },
  };
}
