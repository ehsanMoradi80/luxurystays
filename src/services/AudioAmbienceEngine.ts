/**
 * AudioAmbienceEngine
 * Web Audio API procedural synthesis with Equal-Power Cross-Fading
 */

interface RoomToneAcousticSpec {
  baseCutoff: number;
  resonanceQ: number;
  primaryLayer: string;
  layerGain: number;
}

const ROOM_SPECS: Record<string, RoomToneAcousticSpec> = {
  welcoming_strings: {
    baseCutoff: 1800,
    resonanceQ: 1.2,
    primaryLayer: 'marble_hall',
    layerGain: 0.22,
  },
  distant_waves: {
    baseCutoff: 1200,
    resonanceQ: 0.9,
    primaryLayer: 'distant_waves',
    layerGain: 0.28,
  },
  gentle_piano: {
    baseCutoff: 2400,
    resonanceQ: 1.4,
    primaryLayer: 'gentle_piano',
    layerGain: 0.24,
  },
  crystal_water: {
    baseCutoff: 2100,
    resonanceQ: 1.6,
    primaryLayer: 'crystal_water',
    layerGain: 0.26,
  },
  courtyard_breeze: {
    baseCutoff: 1500,
    resonanceQ: 0.8,
    primaryLayer: 'courtyard_breeze',
    layerGain: 0.3,
  },
  marble_hall_reverb: {
    baseCutoff: 2600,
    resonanceQ: 2.0,
    primaryLayer: 'marble_hall',
    layerGain: 0.25,
  },
};

export class AudioAmbienceEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dynamicFilterNode: BiquadFilterNode | null = null;
  private isMuted: boolean = false;
  private currentDroneNodes: { stop: () => void }[] = [];
  private currentDroneTone: string | null = null;
  private activeRoomLayers: Map<string, { gainNode: GainNode; stop: () => void }> = new Map();
  private currentVolume: number = 0.6;
  private activeTone: string = 'welcoming_strings';
  private pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
  private pianoIntervalId: ReturnType<typeof setInterval> | null = null;

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);

    this.dynamicFilterNode = this.ctx.createBiquadFilter();
    this.dynamicFilterNode.type = 'lowpass';
    this.dynamicFilterNode.frequency.setValueAtTime(1800, this.ctx.currentTime);
    this.dynamicFilterNode.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.dynamicFilterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.initAllRoomLayers();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.currentVolume, this.ctx.currentTime, 0.1);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.1);
    }
  }

  public playAmbiance(tone: string = 'welcoming_strings', volume: number = 0.6) {
    this.initContext();
    if (!this.ctx || !this.masterGain || !this.dynamicFilterNode) return;

    if (this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }

    if (this.currentDroneTone === tone && this.currentDroneNodes.length > 0) {
      this.setRoomAmbientLayer(tone, volume, 1.8);
      return;
    }
    this.currentDroneTone = tone;
    this.stopCurrentDrones();

    const t = this.ctx.currentTime;
    const toneGain = this.ctx.createGain();
    toneGain.gain.setValueAtTime(0.0001, t);
    toneGain.gain.setTargetAtTime(1.0, t, 0.7);
    toneGain.connect(this.dynamicFilterNode);

    const spec = ROOM_SPECS[tone] || ROOM_SPECS.welcoming_strings;
    this.dynamicFilterNode.frequency.cancelScheduledValues(t);
    this.dynamicFilterNode.frequency.setValueAtTime(this.dynamicFilterNode.frequency.value, t);
    this.dynamicFilterNode.frequency.setTargetAtTime(spec.baseCutoff, t, 1.0);

    this.dynamicFilterNode.Q.cancelScheduledValues(t);
    this.dynamicFilterNode.Q.setValueAtTime(this.dynamicFilterNode.Q.value, t);
    this.dynamicFilterNode.Q.setTargetAtTime(spec.resonanceQ, t, 1.0);

    const cleanupFns: (() => void)[] = [];
    const baseFreqs = tone === 'distant_waves' ? [55, 110, 164.8] : [65.41, 130.81, 196.0];

    baseFreqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      oscGain.gain.setValueAtTime(0.08 / (idx + 1), t);

      osc.connect(oscGain);
      oscGain.connect(toneGain);
      osc.start(t);

      cleanupFns.push(() => {
        try {
          osc.stop();
          osc.disconnect();
          oscGain.disconnect();
        } catch {}
      });
    });

    this.currentDroneNodes.push({
      stop: () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        toneGain.gain.cancelScheduledValues(now);
        toneGain.gain.setValueAtTime(toneGain.gain.value, now);
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

    this.setRoomAmbientLayer(tone, volume, 2.0);
  }

  public modulateTransitionSoundscape(
    fromTone: string,
    toTone: string,
    progress: number,
    scrollVelocity: number = 0
  ) {
    if (!this.ctx || !this.dynamicFilterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const clampedP = Math.max(0, Math.min(1, progress));

    const fromSpec = ROOM_SPECS[fromTone] || ROOM_SPECS.welcoming_strings;
    const toSpec = ROOM_SPECS[toTone] || ROOM_SPECS.marble_hall_reverb;

    const midDip = Math.sin(clampedP * Math.PI) * 320;
    const velocityAirSparkle = Math.min(600, Math.abs(scrollVelocity) * 320);

    const targetCutoff = Math.max(
      380,
      fromSpec.baseCutoff + (toSpec.baseCutoff - fromSpec.baseCutoff) * clampedP - midDip + velocityAirSparkle
    );

    const midResonancePeak = Math.sin(clampedP * Math.PI) * 1.6;
    const targetQ = fromSpec.resonanceQ + (toSpec.resonanceQ - fromSpec.resonanceQ) * clampedP + midResonancePeak;

    this.dynamicFilterNode.frequency.cancelScheduledValues(now);
    this.dynamicFilterNode.frequency.setValueAtTime(this.dynamicFilterNode.frequency.value, now);
    this.dynamicFilterNode.frequency.setTargetAtTime(targetCutoff, now, 0.1);

    this.dynamicFilterNode.Q.cancelScheduledValues(now);
    this.dynamicFilterNode.Q.setValueAtTime(this.dynamicFilterNode.Q.value, now);
    this.dynamicFilterNode.Q.setTargetAtTime(targetQ, now, 0.1);

    this.crossfadeRoomLayers(fromSpec.primaryLayer, toSpec.primaryLayer, clampedP, fromSpec, toSpec);
  }

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
      const targetGain = layerName === activeLayerName ? Math.max(0.0001, spec.layerGain * (volume / 0.6)) : 0.0001;
      const currentGain = layer.gainNode.gain.value;
      layer.gainNode.gain.cancelScheduledValues(now);
      layer.gainNode.gain.setValueAtTime(currentGain, now);
      layer.gainNode.gain.setTargetAtTime(targetGain, now, timeConstant);
    });
  }

  public crossfadeBetweenTones(fromTone: string, toTone: string, durationSeconds: number = 1.8) {
    if (!this.ctx || this.isMuted) return;
    const toSpec = ROOM_SPECS[toTone] || ROOM_SPECS.marble_hall_reverb;
    const now = this.ctx.currentTime;
    const dur = Math.max(0.4, durationSeconds);
    const timeConstant = dur * 0.38;

    if (this.dynamicFilterNode) {
      this.dynamicFilterNode.frequency.cancelScheduledValues(now);
      this.dynamicFilterNode.frequency.setValueAtTime(this.dynamicFilterNode.frequency.value, now);
      this.dynamicFilterNode.frequency.setTargetAtTime(toSpec.baseCutoff, now, timeConstant);

      this.dynamicFilterNode.Q.cancelScheduledValues(now);
      this.dynamicFilterNode.Q.setValueAtTime(this.dynamicFilterNode.Q.value, now);
      this.dynamicFilterNode.Q.setTargetAtTime(toSpec.resonanceQ, now, timeConstant);
    }

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

  private initAllRoomLayers() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    this.createDistantWavesLayer();
    this.createGentlePianoLayer();
    this.createCrystalWaterLayer();
    this.createMarbleHallLayer();
    this.createCourtyardBreezeLayer();
  }

  private createDistantWavesLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    layerGain.connect(this.dynamicFilterNode);

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 sec ocean wave cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(260, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    whiteNoise.connect(filter);
    filter.connect(layerGain);
    whiteNoise.start();
    lfo.start();

    this.activeRoomLayers.set('distant_waves', {
      gainNode: layerGain,
      stop: () => {
        try {
          whiteNoise.stop();
          lfo.stop();
          whiteNoise.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
          layerGain.disconnect();
        } catch {}
      },
    });
  }

  private createGentlePianoLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    layerGain.connect(this.dynamicFilterNode);

    const pianoNotes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25];
    let noteIdx = 0;

    const triggerPianoNote = () => {
      if (!this.ctx || this.isMuted) return;
      if (layerGain.gain.value < 0.0005) return;

      const now = this.ctx.currentTime;
      const freq = pianoNotes[noteIdx % pianoNotes.length];
      noteIdx++;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(noteGain);
      noteGain.connect(layerGain);
      osc.onended = () => {
        try {
          osc.disconnect();
          noteGain.disconnect();
        } catch {}
      };
      osc.start(now);
      osc.stop(now + 3.0);
    };

    this.pianoIntervalId = setInterval(triggerPianoNote, 3400);

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

  private createCrystalWaterLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    layerGain.connect(this.dynamicFilterNode);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, this.ctx.currentTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(layerGain);
    osc1.start();
    osc2.start();

    this.activeRoomLayers.set('crystal_water', {
      gainNode: layerGain,
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
          filter.disconnect();
          layerGain.disconnect();
        } catch {}
      },
    });
  }

  private createMarbleHallLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    layerGain.connect(this.dynamicFilterNode);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(layerGain);
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
  }

  private createCourtyardBreezeLayer() {
    if (!this.ctx || !this.dynamicFilterNode) return;
    const layerGain = this.ctx.createGain();
    layerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    layerGain.connect(this.dynamicFilterNode);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(layerGain);
    osc.start();

    this.activeRoomLayers.set('courtyard_breeze', {
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
  }

  public playTransitionChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.35);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
    osc.start(t);
    osc.stop(t + 0.65);
  }

  public playTick() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
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
  }

  private stopCurrentDrones() {
    this.currentDroneNodes.forEach((node) => node.stop());
    this.currentDroneNodes = [];
  }

  public destroy() {
    this.pendingTimeouts.forEach((tid) => clearTimeout(tid));
    this.pendingTimeouts.clear();

    if (this.pianoIntervalId) {
      clearInterval(this.pianoIntervalId);
      this.pianoIntervalId = null;
    }

    this.stopCurrentDrones();
    this.activeRoomLayers.forEach((layer) => {
      try {
        layer.stop();
      } catch {}
    });
    this.activeRoomLayers.clear();

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
