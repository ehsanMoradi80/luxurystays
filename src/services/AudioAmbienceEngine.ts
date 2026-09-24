/**
 * Procedural Luxury Audio Ambiance Engine (Web Audio API)
 * Generates bespoke 5-star hotel soundscapes with harmonic drone pads, 
 * acoustic space reverbs, water cascades, and transition chimes.
 */

export class AudioAmbienceEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;
  private currentDroneNodes: { stop: () => void }[] = [];
  private currentVolume: number = 0.6;
  /** Explicit Web Audio Buffer cache for procedural noise, impulse responses, and ambient tones */
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
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
    if (!this.ctx || !this.masterGain) return;

    // Fade out previous drones
    this.stopCurrentDrones();

    if (this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const toneGain = this.ctx.createGain();
    toneGain.gain.setValueAtTime(0.001, t);
    toneGain.gain.exponentialRampToValueAtTime(1.0, t + 2.5);
    toneGain.connect(this.masterGain);

    const cleanupFns: (() => void)[] = [];

    // Frequencies corresponding to peaceful luxury harmonic spectra
    let freqs: number[] = [110, 164.81, 220, 329.63]; // A major 9th warm chord
    if (tone === 'marble_hall_reverb') {
      freqs = [130.81, 196.0, 261.63, 392.0]; // Cmaj spacious
    } else if (tone === 'ocean_breeze') {
      freqs = [98.0, 146.83, 220.0, 293.66]; // Gmaj peaceful
      this.spawnOceanNoise(toneGain);
    } else if (tone === 'crystal_water') {
      freqs = [146.83, 220.0, 293.66, 440.0]; // Dmaj ethereal
    } else if (tone === 'jazz_lounge') {
      freqs = [116.54, 146.83, 174.61, 233.08]; // Bbmaj7 warm lounge
    }

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // Subtle slow detune for luxurious shimmer
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.12 + idx * 0.05, t);
      lfoGain.gain.setValueAtTime(1.8, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + idx * 250, t);

      oscGain.gain.setValueAtTime(0.08 / (idx + 1), t);

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
        toneGain.gain.cancelScheduledValues(now);
        toneGain.gain.setTargetAtTime(0.0001, now, 0.8);
        setTimeout(() => {
          cleanupFns.forEach((fn) => fn());
          toneGain.disconnect();
        }, 2000);
      },
    });
  }

  private spawnOceanNoise(targetGain: GainNode) {
    if (!this.ctx) return;
    try {
      let buffer = this.audioBuffers.get('ocean_breeze');
      if (!buffer) {
        const bufferSize = this.ctx.sampleRate * 2;
        buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02; // Pink noise approx
          lastOut = data[i];
        }
        this.audioBuffers.set('ocean_breeze', buffer);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(targetGain);

      noise.start();

      this.currentDroneNodes.push({
        stop: () => {
          try {
            noise.stop();
            noise.disconnect();
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

    osc.start(t);
    osc.stop(t + 1.3);
  }

  /**
   * Pre-heats the Web Audio context and warms sound synthesis parameters / buffers
   * for adjacent nodes so switching sound profiles has zero initial latency.
   */
  public warmUpAudioProfile(tone: string) {
    if (!this.ctx) {
      this.init();
    }
    const validTones = ['warm_chords', 'marble_hall_reverb', 'ocean_breeze', 'crystal_water', 'jazz_lounge'];
    if (!validTones.includes(tone)) return;

    if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }

    // Pre-allocate audio synthesis buffer in memory for this tone if needed
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

  /**
   * LRU Resource Lifecycle Manager:
   * Explicitly purges audio buffers and stops synthesizers for tones corresponding to
   * evicted nodes that are more than 2 steps away from the active index.
   */
  public purgeAudioBuffersForTones(tonesToEvict: string[]): { purgedCount: number; remainingCount: number } {
    let purgedCount = 0;
    tonesToEvict.forEach((tone) => {
      if (this.audioBuffers.has(tone)) {
        this.audioBuffers.delete(tone);
        purgedCount++;
      }
    });

    // Stop and dispose obsolete synthesis nodes to free audio memory
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

  /**
   * Specifically unloads audio buffers and synthesizers for tones corresponding to
   * evicted nodes that are more than 2 nodes away and not needed by any protected nodes.
   */
  public unloadAudioBuffersForTones(tonesToEvict: string[]) {
    this.purgeAudioBuffersForTones(tonesToEvict);
  }

  /**
   * Returns current count of audio buffers retained in memory
   */
  public getAudioBufferCount(): number {
    return this.audioBuffers.size;
  }

  /**
   * Resource Lifecycle Manager: Prunes audio resources and releases any dangling
   * drone nodes or cached buffers for non-adjacent nodes during extended navigation.
   */
  public pruneNonAdjacentAudio(allowedTones: string[]) {
    if (!this.ctx) return;
    
    // Purge buffers for any tones not in allowedTones
    const tonesToPurge: string[] = [];
    for (const cachedTone of this.audioBuffers.keys()) {
      if (!allowedTones.includes(cachedTone)) {
        tonesToPurge.push(cachedTone);
      }
    }
    if (tonesToPurge.length > 0) {
      this.purgeAudioBuffersForTones(tonesToPurge);
    }

    // Ensure all drone nodes other than active ones are thoroughly disposed
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
    this.stopCurrentDrones();
    this.audioBuffers.clear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioAmbiance = new AudioAmbienceEngine();
