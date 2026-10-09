/**
 * audio.js - Generador de efectos de sonido usando Web Audio API
 * Funciona offline sin requerir archivos mp3 externos.
 */

const SoundManager = (() => {
  let audioCtx = null;
  let isMuted = false;

  const getAudioContext = () => {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  };

  return {
    toggleMute: () => {
      isMuted = !isMuted;
      return isMuted;
    },
    isMuted: () => isMuted,

    // Sonido de Acceso Autorizado (campana doble ascendente deportiva)
    playSuccess: () => {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18); // D6

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
      } catch (e) {
        console.warn('Audio no soportado o bloqueado:', e);
      }
    },

    // Sonido de Advertencia (Membresía por vencer en pocos días)
    playWarning: () => {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(523.25, now + 0.12); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.24); // E5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      } catch (e) {
        console.warn('Audio no disponible:', e);
      }
    },

    // Sonido de Acceso Denegado (Buzzer de membresía vencida / error)
    playError: () => {
      if (isMuted) return;
      try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(120, now + 0.15);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
      } catch (e) {
        console.warn('Audio no disponible:', e);
      }
    }
  };
})();
