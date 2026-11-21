// Sound, synthesized live with WebAudio — no audio files to ship.
// Footsteps patter softly (louder when running), a pebble clinks, a
// relic chimes, an alarm stings when a guard starts the hunt, and a
// low moth-wing hum sits under everything. All of it is optional:
// the game plays fine with the context suspended or missing.

let ctx = null;
let humNodes = null;

function audioContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio() {
  const ac = audioContext();
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  startHum();
}

function startHum() {
  const ac = audioContext();
  if (!ac || humNodes) return;
  try {
    const gain = ac.createGain();
    gain.gain.value = 0.018;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const osc2 = ac.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 110.5;
    const gain2 = ac.createGain();
    gain2.gain.value = 0.35;
    osc.connect(gain);
    osc2.connect(gain2);
    gain2.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc2.start();
    humNodes = { osc, osc2, gain };
  } catch {
    humNodes = null;
  }
}

function blip(freq, dur, type, volume, slideTo) {
  const ac = audioContext();
  if (!ac || ac.state !== 'running') return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  } catch {
    // sound is garnish; never break the game for it
  }
}

export function playFootstep(loud) {
  blip(loud ? 140 : 190, 0.07, 'sine', loud ? 0.09 : 0.035, 90);
}

export function playPebbleClink() {
  blip(1900, 0.09, 'square', 0.05, 1400);
  setTimeout(() => blip(2400, 0.06, 'square', 0.03, 1800), 70);
}

export function playRelicChime() {
  blip(660, 0.18, 'sine', 0.08);
  setTimeout(() => blip(880, 0.22, 'sine', 0.08), 110);
  setTimeout(() => blip(1320, 0.3, 'sine', 0.06), 230);
}

export function playAlarmSting() {
  blip(220, 0.22, 'sawtooth', 0.07, 440);
  setTimeout(() => blip(330, 0.25, 'sawtooth', 0.06, 220), 160);
}

export function playCaughtThud() {
  blip(90, 0.4, 'sawtooth', 0.12, 45);
}

export function playDoorCreak() {
  blip(180, 0.5, 'triangle', 0.06, 320);
}

export function playWinMelody() {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'sine', 0.07), i * 150));
}
