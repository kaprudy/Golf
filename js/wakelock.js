// Scherm aan houden (Screen Wake Lock), voor de buggystand. Het systeem laat de vergrendeling
// los als de app naar de achtergrond gaat; bij terugkomen vragen we hem opnieuw aan.
export function createWakeLock(onChange = () => {}) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  let sentinel = null;
  let wanted = false;
  let tried = false;

  async function acquire() {
    if (!wanted || !supported || sentinel || document.visibilityState !== 'visible') return;
    try {
      const s = await navigator.wakeLock.request('screen');
      if (!wanted) { s.release().catch(() => {}); return; } // intussen weer uitgezet
      sentinel = s;
      s.addEventListener('release', () => { if (sentinel === s) sentinel = null; onChange(); });
    } catch { sentinel = null; } // bijv. batterijbesparing aan
    tried = true;
    onChange();
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', acquire);

  return {
    supported,
    get active() { return Boolean(sentinel); },
    // Aangevraagd maar niet gelukt: het scherm kan dan vanzelf uitgaan.
    get failed() { return wanted && (!supported || (tried && !sentinel)); },
    enable() { wanted = true; return acquire(); },
    disable() {
      wanted = false;
      tried = false;
      const s = sentinel;
      sentinel = null;
      s?.release().catch(() => {});
      onChange();
    },
  };
}
