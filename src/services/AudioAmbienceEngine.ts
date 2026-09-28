/**
 * AudioAmbienceEngine.ts
 * 
 * Procedural Luxury Audio Ambiance Engine (Web Audio API)
 * Generates bespoke 5-star hotel soundscapes with harmonic drone pads,
 * dynamic frequency shifting, and room-specific procedural ambient layers:
 * - Dynamic soundscape frequency shifting during sequence transitions (BiquadFilter sweeps)
 * - Room-specific ambient layers (gentle grand piano, distant ocean waves, crystal water ripples, marble hall resonance, courtyard breeze)
 * - Seamless velocity-aware acoustic morphing between hotel spaces
 */

export type RoomAmbientType = 
  | 'welcoming_strings'
  | 'marble_hall_reverb'
  | 'ocean_breeze'
  | 'crystal_water'
  | 'restaurant_ambiance'
  | 'warm_chords'
  | 'jazz_lounge';

interface RoomToneAcousticSpec {
  baseCutoff: number;
  resonanceQ: number;
  harmonics: number[];
  primaryLayer: 'gentle_piano' | 'distant_waves' | 'crystal_water' | 'marble_hall' | 'courtyard_breeze';
  layerGain: number;
}

const ROOM_SPECS: Record<string, RoomToneAcousticSpec> = {
  welcoming_strings: {
    baseCutoff: 1400,
    resonanceQ: 1.1,
    harmonics: [110, 164.81, 220, 329.63], // A major 9th warm strings
    primaryLayer: 'courtyard_breeze',
    layerGain: 0.18,
  },
  marble_hall_reverb: {
    baseCutoff: 1100,
    resonanceQ: 1.8,
    harmonics: [130.81, 196.0, 261.63, 392.0], // Cmaj grand hall resonance
    primaryLayer: 'marble_hall',
    layerGain: 0.22,
  },
  ocean_breeze: {
    baseCutoff: 1800,
    resonanceQ: 0.9,
    harmonics: [98.0, 146.83, 220.0, 293.66], // Gmaj coastal serenity
    primaryLayer: 'distant_waves',
    layerGain: 0.28,
  },
  crystal_water: {
    baseCutoff: 2600,
    resonanceQ: 2.2,
    harmonics: [146.83, 220.0, 293.66, 440.0], // Dmaj sparkling aquatic shimmer
    primaryLayer: 'crystal_water',
    layerGain: 0.25,
  },
  restaurant_ambiance: {
    baseCutoff: 1300,
    resonanceQ: 1.4,
    harmonics: [116.54, 146.83, 174.61, 233.08], // Bbmaj7 warm velvet lounge
    primaryLayer: 'gentle_piano',
    layerGain: 0.24,
  },
  warm_chords: {
    baseCutoff: 1200,
    resonanceQ: 1.0,
    harmonics: [110, 164.81, 220, 329.63],
    primaryLayer: 'gentle_piano',
    layerGain: 0.2,
  },
  jazz_lounge: {
    baseCutoff: 1350,
    resonanceQ: 1.3,
    harmonics: [116.54, 146.83, 174.61, 233.08],
    primaryLayer: 'gentle_piano',
    layerGain: 0.22,
  },
};

export class AudioAmbienceEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;
  private dynamicFilterNode: BiquadFilterNode | null = null;

  // Active synthesizer tracking
  private currentDroneNodes: { stop: () => void }[] = [];
  private currentDroneTone: string | null = null;
  private activeRoomLayers: Map<string, { gainNode: GainNode; stop: () => void }> = new Map();
  private currentVolume: number = 0.6;
  private activeTone: string = 'welcoming_strings';

  // Procedural piano timer
  private pianoIntervalId: ReturnType<typeof setInterval> | null = null;

  // Track pending setTimeout timer references to prevent unmount memory leaks
  private pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  /** Web Audio Buffer cache for procedural noise and impulse responses */
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);

      // Dynamic BiquadFilter inserted before master output for acoustic frequency sweeps
      this.dynamicFilterNode = this.ctx.createBiquadFilter();
      this.dynamicFilterNode.type = 'lowpass';
      this.dynamicFilterNode.frequency.setValueAtTime(1600, this.ctx.currentTime);
      this.dynamicFilterNode.Q.setValueAtTime(1.0, this.ctx.currentTime);

      this.dynamicFilterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Start procedural room layers
      this.setupRoomLayers();
    } catch {
      console.warn('Web Audio API not supported on this browser');
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx) {
      if (!muted) this.init();
    }
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended' && !muted) {
        this.ctx.resume();
      }
      const targetGain = muted ? 0 : this.currentVolume;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.4);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playAmbiance(tone: string, volume: number = 0.6) {
    this.currentVolume = volume;
    this.activeTone = tone;
    if (!this.ctx || !this.masterGain || !this.dynamicFilterNode) {
      this.init();
      if (!this.ctx || !this.masterGain || !this.dynamicFilterNode) return;
    }

    if (this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }

    // If already playing the requested tone with active drones, smoothly adjust target gain without cutoff
    if (this.currentDroneTone === tone && this.currentDroneNodes.length > 0) {
      this.setRoomAmbientLayer(tone, volume, 1.8);
      return;
    }
    this.currentDroneTone = tone;

    // Gracefully cross-fade out previous drone oscillators over 1.8 seconds (no abrupt cuts)
    this.stopCurrentDrones();

    const t = this.ctx.currentTime;
    const toneGain = this.ctx.createGain();
    // Smooth cross-fade in of new harmonic drone spectrum
    toneGain.gain.setValueAtTime(0.0001, t);
    toneGain.gain.setTargetAtTime(1.0, t, 0.7);
    toneGain.connect(this.dynamicFilterNode);

    const spec = ROOM_SPECS[tone] || ROOM_SPECS.welcoming_strings;

    // Smooth filter parameter transition
    this.dynamicFilterNode.frequency.cancelScheduledValues(t);
    this.dynamicFilterNode.frequency.setValueAtTime(this.dynamicFilterNode.frequency.value, t);
    this.dynamicFilterNode.frequency.setTargetAtTime(spec.baseCutoff, t, 1.0);

    this.dynamicFilterNode.Q.cancelScheduledValues(t);
    this.dynamicFilterNode.Q.setValueAtTime(this.dynamicFilterNode.Q.value, t);
    this.dynamicFilterNode.Q.setTargetAtTime(spec.resonanceQ, t, 1.0);

    const cleanupFns: (() => void)[] = [];

    // Synthesize harmonic spectrum for the space
    spec.harmonics.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // Subtle slow detune for luxurious shimmer
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.1 + idx * 0.04, t);
      lfoGain.gain.setValueAtTime(1.6, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + idx * 260, t);

      oscGain.gain.setValueAtTime(0.07 / (idx + 1), t);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(toneGain);

      osc.start(t);

      cleanupFns.push(() => {
        try {
          osc.stop();
          lfo.stop();
          osc.disconnect();
          lfo.disconnect();
        } catch {}
      });
    });

    this.currentDroneNodes.push({
      stop: () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const currentGainVal = toneGain.gain.value;
        toneGain.gain.cancelScheduledValues(now);
        toneGain.gain.setValueAtTime(currentGainVal, now);
        // Exponential fade out over ~1.8 seconds
        toneGain.gain.setTargetAtTime(0.0001, now, 0.65);
        const tid = setTimeout(() => {
          this.pendingTimeouts.delete(tid);
          cleanupFns.forEach((fn) => fn());
          try {
            toneGain.disconnect();
          } catch {}
        }, 2200);
        this.pendingTimeouts.add(tid);
      },
    });

    // Smoothly activate the room's specific ambient layer with cross-fade
    this.setRoomAmbientLayer(tone, volume, 2.0);
  }

  /**
   * =========================================================================
   * DYNAMIC SOUNDSCAPE FEATURE:
   * Slowly shifts audio frequencies and cross-fades ambient layers (waves, piano, etc.)
   * using the Equal-Power Law (Constant Acoustic Power) so layers blend smoothly
   * without any dip, click, or abrupt cutoff.
   * =========================================================================
   */
  public modulateTransitionSoundscape(
    progress: number,
    fromTone: string,
    toTone: string,
    scrollVelocity: number = 0
  ) {
    if (!this.ctx || !this.dynamicFilterNode || this.isMuted) return;

    const clampedP = Math.max(0, Math.min(1, progress));
    const now = this.ctx.currentTime;

    const fromSpec = ROOM_SPECS[fromTone] || ROOM_SPECS.welcoming_strings;
    const toSpec = ROOM_SPECS[toTone] || ROOM_SPECS.marble_hall_reverb;

    // 1. Frequency Shifting (Acoustic Corridor Sweep):
    // As the user travels between spaces, mid-transition creates an acoustic corridor dip
    // followed by bright air opening as they arrive at the new luxury space.
    const fromCutoff = fromSpec.baseCutoff;
    const toCutoff = toSpec.baseCutoff;

    // Subtle dip in middle transition (sound of passing through acoustic threshold)
    const midDip = Math.sin(clampedP * Math.PI) * 320;
    const velocityAirSparkle = Math.min(600, Math.abs(scrollVelocity) * 320);

    const targetCutoff = Math.max(
      420,
      Math.min(4800, fromCutoff + (toCutoff - fromCutoff) * clampedP - midDip + velocityAirSparkle)
    );

    // Resonance curve (peaking mid-threshold for cinematic spatial depth)
    const midResonancePeak = Math.sin(clampedP * Math.PI) * 1.6;
    const targetQ = fromSpec.resonanceQ + (toSpec.resonanceQ - fromSpec.resonanceQ) * clampedP + midResonancePeak;

    const currentFreq = this.dynamicFilterNode.frequency.value;
    const currentQ = this.dynamicFilterNode.Q.value;

    this.dynamicFilterNode.frequency.cancelScheduledValues(now);
    this.dynamicFilterNode.frequency.setValueAtTime(currentFreq, now);
    this.dynamicFilterNode.frequency.setTargetAtTime(targetCutoff, now, 0.1);

    this.dynamicFilterNode.Q.cancelScheduledValues(now);
    this.dynamicFilterNode.Q.setValueAtTime(currentQ, now);
    this.dynamicFilterNode.Q.setTargetAtTime(targetQ, now, 0.1);

    // 2. Equal-Power Cross-fade Room-Specific Ambient Layers (e.g. distant waves <-> gentle piano)
    this.crossfadeRoomLayers(fromSpec.primaryLayer, toSpec.primaryLayer, clampedP, fromSpec, toSpec);
  }

  /**
   * Sets and stabilizes the active room-specific ambient layer with smooth cross-fade.
   * fadeDuration: Duration in seconds for the cross-fade curve to settle (default: 1.8s)
   */
  public setRoomAmbientLayer(tone: string, volume: number = 0.6, fadeDuration: number = 1.8) {
    if (!this.ctx) return;
    this.currentVolume = volume;
    this.activeTone = tone;
    const spec = ROOM_SPECS[tone] || ROOM_SPECS.welcoming_strings;
    const activeLayerName = spec.primaryLayer;
    const now = this.ctx.currentTime;
    const timeConstant = Math.max(0.2, fadeDuration * 0.35);

    this.activeRoomLayers.forEach((layer, layerName) => {
      if (!this.ctx) return;
      const targetGain = layerName === activeLayerName ? spec.layerGain * (volume / 0.6) : 0.0001;
      const currentGain = layer.gainNode.gain.value;
      layer.gainNode.gain.cancelScheduledValues(now);
      layer.gainNode.gain.setValueAtTime(currentGain, now);
      layer.gainNode.gain.setTargetAtTime(targetGain, now, timeConstant);
    });
  }

  /**
   * Smoothly cross-fades ambient layers and frequency parameters over a specified duration.
   * Ensures soundscapes (e.g. ocean waves and piano) blend organically when jumping between scenes.
   */
  public crossfadeBetweenTones(fromTone: string, toTone: string, durationSeconds: number = 1.8) {
    if (!this.ctx || this.isMuted) return;
    const fromSpec = ROOM_SPECS[fromTone] || ROOM_SPECS.welcoming_strings;
    const toSpec = ROOM_SPECS[toTone] || ROOM_SPECS.marble_hall_reverb;
    const now = this.ctx.currentTime;
    const dur = Math.max(0.4, durationSeconds);
    const timeConstant = dur * 0.38;

    // Smoothly shift filter cutoff and Q factor to destination space
    if (this.dynamicFilterNode) {
      const currentCutoff = this.dynamicFilterNode.frequency.value;
      const currentQ = this.dynamicFilterNode.Q.value;
      this.dynamicFilterNode.frequency.cancelScheduledValues(now);
      this.dynamicFilterNode.frequency.setValueAtTime(currentCutoff, now);
      this.dynamicFilterNode.frequency.setTargetAtTime(toSpec.baseCutoff, now, timeConstant);

      this.dynamicFilterNode.Q.cancelScheduledValues(now);
      this.dynamicFilterNode.Q.setValueAtTime(currentQ, now);
      this.dynamicFilterNode.Q.setTargetAtTime(toSpec.resonanceQ, now, timeConstant);
    }

    // Cross-fade primary room layers smoothly without audio cut
    const targetGain = toSpec.layerGain * (this.currentVolume / 0.6);
    this.activeRoomLayers.forEach((layer, name) => {
      const currentVal = layer.gainNode.gain.value;
      layer.gainNode.gain.cancelScheduledValues(now);
      layer.gainNode.gain.setValueAtTime(currentVal, now);

      if (name === toSpec.primaryLayer) {
        layer.gainNode.gain.setTargetAtTime(targetGain, now, timeConstant);
      } else {
        layer.gainNode.gain.setTargetAtTime(0.0001, now, timeConstant * 1.1);
      }
    });

    this.activeTone = toTone;
  }

  /**
   * Smoothly cross-fades between two room ambient layers according to transition progress,
   * using the Equal-Power Law (Constant Acoustic Power) so sound waves, piano, water, and hall reverb
   * blend smoothly instead of cutting abruptly.
   */
  private crossfadeRoomLayers(
    fromLayer: string,
    toLayer: string,
    progress: number,
    fromSpec?: RoomToneAcousticSpec,
    toSpec?: RoomToneAcousticSpec
  ) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const clampedP = Math.max(0, Math.min(1, progress));

    const fSpec = fromSpec || ROOM_SPECS[this.activeTone] || ROOM_SPECS.welcoming_strings;
    const tSpec = toSpec || ROOM_SPECS.marble_hall_reverb;

    // If both spaces share the same primary layer (e.g. piano in dining & lounge), maintain stable volume
    if (fromLayer === toLayer) {
      const steadyTarget = Math.max(0.0001, fSpec.layerGain * (this.currentVolume / 0.6));
      this.activeRoomLayers.forEach((layer, name) => {
        const currentVal = layer.gainNode.gain.value;
        layer.gainNode.gain.cancelScheduledValues(now);
        layer.gainNode.gain.setValueAtTime(currentVal, now);
        if (name === fromLayer) {
          layer.gainNode.gain.setTargetAtTime(steadyTarget, now, 0.12);
        } else {
          layer.gainNode.gain.setTargetAtTime(0.0001, now, 0.25);
        }
      });
      return;
    }

    // Equal-Power Law:
    // angle: 0 to PI/2
    // fromGain = cos(angle) * maxFromGain
    // toGain = sin(angle) * maxToGain
    // Result: (fromGain)^2 + (toGain)^2 = constant (No volume dip during transition)
    const angle = clampedP * 0.5 * Math.PI;
    const fromWeight = Math.cos(angle);
    const toWeight = Math.sin(angle);

    const fromTarget = Math.max(0.0001, fSpec.layerGain * fromWeight * (this.currentVolume / 0.6));
    const toTarget = Math.max(0.0001, tSpec.layerGain * toWeight * (this.currentVolume / 0.6));

    this.activeRoomLayers.forEach((layer, name) => {
      const currentVal = layer.gainNode.gain.value;
      layer.gainNode.gain.cancelScheduledValues(now);
      layer.gainNode.gain.setValueAtTime(currentVal, now);

      if (name === fromLayer) {
        layer.gainNode.gain.setTargetAtTime(fromTarget, now, 0.12);
      } else if (name === toLayer) {
        layer.gainNode.gain.setTargetAtTime(toTarget, now, 0.12);
      } else {
        layer.gainNode.gain.setTargetAtTime(0.0001, now, 0.25);
      }
    });
  }

  /**
   * Initialize all procedural ambient layers (Piano, Waves, Water Droplets, Hall Reverb, Breeze).
   */
  private setupRoomLayers() {
    if (!this.ctx || !this.dynamicFilterNode) return;

    // 1. Distant Waves Layer
    this.initDistantWavesLayer();

    // 2. Gentle Grand Piano Harmonics Layer
    this.initGentlePianoLayer();

    // 3. Crystal Water Ripple Layer
    this.initCrystalWaterLayer();

    // 4. Marble Hall Ambient Reverb Layer
    this.initMarbleHallLayer();

    // 5. Courtyard Breeze Layer
    this.initCourtyardBreezeLayer();
  }

  /**
   * Layer 1: Distant Ocean Waves Layer (Procedural filtered pink noise with slow surf swells)
   */
  private initDistantWavesLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(280, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(0.9, this.ctx.currentTime);

      // Low frequency swell (11-second ocean wave cycle)
      const swellLfo = this.ctx.createOscillator();
      const swellGain = this.ctx.createGain();
      swellLfo.frequency.setValueAtTime(0.09, this.ctx.currentTime);
      swellGain.gain.setValueAtTime(140, this.ctx.currentTime);
      swellLfo.connect(swellGain);
      swellGain.connect(bandpass.frequency);
      swellLfo.start();

      const layerGain = this.ctx.createGain();
      layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(layerGain);
      layerGain.connect(this.dynamicFilterNode);
      noise.start();

      this.activeRoomLayers.set('distant_waves', {
        gainNode: layerGain,
        stop: () => {
          try {
            noise.stop();
            swellLfo.stop();
            noise.disconnect();
            bandpass.disconnect();
            swellLfo.disconnect();
            swellGain.disconnect();
            layerGain.disconnect();
          } catch {}
        },
      });
    } catch {}
  }

  /**
   * Layer 2: Gentle Grand Piano Harmonics (Procedural acoustic hammer-strike synthesis)
   */
  private initGentlePianoLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;

    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    layerGain.connect(this.dynamicFilterNode);

    // Pentatonic chord frequencies for tranquil luxury mood:
    // C4 (261.63), D4 (293.66), E4 (329.63), G4 (392.00), A4 (440.00), C5 (523.25), E5 (659.25)
    const pianoNotes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25];
    let noteIdx = 0;

    const triggerPianoNote = () => {
      if (!this.ctx || this.isMuted) return;
      if (layerGain.gain.value < 0.0005) return; // Skip if muted/silent floor

      const now = this.ctx.currentTime;
      const freq = pianoNotes[noteIdx % pianoNotes.length];
      noteIdx = (noteIdx + 1 + Math.floor(Math.random() * 2)) % pianoNotes.length;

      // Realistic physical model: Fundamental sine + 2nd harmonic + attack percussion
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.004, now); // Slightly stretched 2nd harmonic

      // Piano envelope: Fast attack, authentic wooden body decay
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.14, now + 0.025);
      noteGain.gain.exponentialRampToValueAtTime(0.035, now + 0.6);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      const toneFilter = this.ctx.createBiquadFilter();
      toneFilter.type = 'lowpass';
      toneFilter.frequency.setValueAtTime(freq * 3.5, now);
      toneFilter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 2.5);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      noteGain.connect(toneFilter);
      toneFilter.connect(layerGain);

      // Clean up audio graph nodes immediately upon note end to prevent node build-up
      const onEndedCleanup = () => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          noteGain.disconnect();
          toneFilter.disconnect();
        } catch {}
      };
      osc1.onended = onEndedCleanup;

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 4.0);
      osc2.stop(now + 4.0);
    };

    // Trigger soft piano chimes at relaxed organic intervals (every 3.6 to 5.2 seconds)
    if (this.pianoIntervalId) clearInterval(this.pianoIntervalId);
    this.pianoIntervalId = setInterval(() => {
      triggerPianoNote();
    }, 4200);

    this.activeRoomLayers.set('gentle_piano', {
      gainNode: layerGain,
      stop: () => {
        if (this.pianoIntervalId) {
          clearInterval(this.pianoIntervalId);
          this.pianoIntervalId = null;
        }
        try {
          layerGain.disconnect();
        } catch {}
      },
    });
  }

  /**
   * Layer 3: Crystal Water Ripples (Aquatic drops and ethereal splashing resonance)
   */
  private initCrystalWaterLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    try {
      const layerGain = this.ctx.createGain();
      layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.05;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const highpass = this.ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(1200, this.ctx.currentTime);

      const resonantFilter = this.ctx.createBiquadFilter();
      resonantFilter.type = 'bandpass';
      resonantFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
      resonantFilter.Q.setValueAtTime(4.5, this.ctx.currentTime);

      noise.connect(highpass);
      highpass.connect(resonantFilter);
      resonantFilter.connect(layerGain);
      layerGain.connect(this.dynamicFilterNode);
      noise.start();

      this.activeRoomLayers.set('crystal_water', {
        gainNode: layerGain,
        stop: () => {
          try {
            noise.stop();
            noise.disconnect();
            highpass.disconnect();
            resonantFilter.disconnect();
            layerGain.disconnect();
          } catch {}
        },
      });
    } catch {}
  }

  /**
   * Layer 4: Marble Hall Resonance (Cathedral-style high atrium reverb)
   */
  private initMarbleHallLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    try {
      const layerGain = this.ctx.createGain();
      layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      // Low-frequency spacious acoustic shimmer
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65.4, this.ctx.currentTime); // C2 sub-resonance

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(layerGain);
      layerGain.connect(this.dynamicFilterNode);
      osc.start();

      this.activeRoomLayers.set('marble_hall', {
        gainNode: layerGain,
        stop: () => {
          try {
            osc.stop();
            osc.disconnect();
            filter.disconnect();
            layerGain.disconnect();
          } catch {}
        },
      });
    } catch {}
  }

  /**
   * Layer 5: Courtyard Breeze (Whispering cypress air and evening warmth)
   */
  private initCourtyardBreezeLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    try {
      const layerGain = this.ctx.createGain();
      layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let out = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (out + 0.015 * white) / 1.015;
        out = data[i];
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(450, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(0.7, this.ctx.currentTime);

      noise.connect(bandpass);
      bandpass.connect(layerGain);
      layerGain.connect(this.dynamicFilterNode);
      noise.start();

      this.activeRoomLayers.set('courtyard_breeze', {
        gainNode: layerGain,
        stop: () => {
          try {
            noise.stop();
            noise.disconnect();
            bandpass.disconnect();
            layerGain.disconnect();
          } catch {}
        },
      });
    } catch {}
  }

  public playTransitionChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.8); // C6 sweep

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };

    osc.start(t);
    osc.stop(t + 1.3);
  }

  public playTick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, t);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
  }

  /**
   * Pre-heats the Web Audio context and warms sound synthesis parameters / buffers
   * for adjacent nodes so switching sound profiles has zero initial latency.
   */
  public warmUpAudioProfile(tone: string) {
    if (!this.ctx) {
      this.init();
    }
    const validTones = ['welcoming_strings', 'marble_hall_reverb', 'ocean_breeze', 'crystal_water', 'restaurant_ambiance', 'warm_chords', 'jazz_lounge'];
    if (!validTones.includes(tone)) return;

    if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }

    if (this.ctx && !this.audioBuffers.has(tone)) {
      try {
        const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const channelData = buffer.getChannelData(0);
        let sampleAccumulator = 0;
        for (let i = 0; i < bufferSize; i++) {
          const noiseSample = Math.random() * 2 - 1;
          sampleAccumulator = (sampleAccumulator + 0.015 * noiseSample) / 1.015;
          channelData[i] = sampleAccumulator * 0.15;
        }
        this.audioBuffers.set(tone, buffer);
      } catch {}
    }
  }

  public purgeAudioBuffersForTones(tonesToEvict: string[]): { purgedCount: number; remainingCount: number } {
    let purgedCount = 0;
    tonesToEvict.forEach((tone) => {
      if (this.audioBuffers.has(tone)) {
        this.audioBuffers.delete(tone);
        purgedCount++;
      }
    });

    if (this.currentDroneNodes.length > 1) {
      const obsolete = this.currentDroneNodes.slice(0, this.currentDroneNodes.length - 1);
      obsolete.forEach((node) => node.stop());
      this.currentDroneNodes = this.currentDroneNodes.slice(this.currentDroneNodes.length - 1);
    }

    return {
      purgedCount,
      remainingCount: this.audioBuffers.size,
    };
  }

  public pruneNonAdjacentAudio(allowedTones: string[]) {
    if (!this.ctx) return;
    
    const tonesToPurge: string[] = [];
    for (const cachedTone of this.audioBuffers.keys()) {
      if (!allowedTones.includes(cachedTone)) {
        tonesToPurge.push(cachedTone);
      }
    }
    if (tonesToPurge.length > 0) {
      this.purgeAudioBuffersForTones(tonesToPurge);
    }

    if (this.currentDroneNodes.length > 2) {
      const obsolete = this.currentDroneNodes.slice(0, this.currentDroneNodes.length - 1);
      obsolete.forEach((node) => node.stop());
      this.currentDroneNodes = this.currentDroneNodes.slice(this.currentDroneNodes.length - 1);
    }
  }

  private stopCurrentDrones() {
    this.currentDroneNodes.forEach((node) => node.stop());
    this.currentDroneNodes = [];
  }

  public destroy() {
    // 1. Cancel and delete all pending timer callbacks
    this.pendingTimeouts.forEach((tid) => clearTimeout(tid));
    this.pendingTimeouts.clear();

    // 2. Clear procedural piano interval
    if (this.pianoIntervalId) {
      clearInterval(this.pianoIntervalId);
      this.pianoIntervalId = null;
    }

    // 3. Stop and disconnect all active drones
    this.stopCurrentDrones();

    // 4. Stop and disconnect all room ambient layers
    this.activeRoomLayers.forEach((layer) => {
      try {
        layer.stop();
        layer.gainNode.disconnect();
      } catch {}
    });
    this.activeRoomLayers.clear();

    // 5. Purge and clear all audio buffer references
    this.audioBuffers.clear();

    // 6. Disconnect filter and master gain nodes
    if (this.dynamicFilterNode) {
      try {
        this.dynamicFilterNode.disconnect();
      } catch {}
      this.dynamicFilterNode = null;
    }
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }

    // 7. Close and nullify AudioContext
    if (this.ctx) {
      try {
        if (this.ctx.state !== 'closed') {
          this.ctx.close();
        }
      } catch {}
      this.ctx = null;
    }
  }
}

export const audioAmbiance = new AudioAmbienceEngine();
