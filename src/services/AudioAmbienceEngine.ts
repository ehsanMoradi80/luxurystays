/**
 * AudioAmbienceEngine.ts
 * 
 * موتور طراحی صوتی اختصاصی مدیتیشن و آرامش‌بخش (Zen Luxury Meditation Soundscape)
 * تنظیم شده بر اساس فرکانس طبیعی ۴۳۲ هرتز (فرکانس آلفا و تتا)
 * - حذف کامل کلیه فرکانس‌های تیز، بیپ‌های دیجیتالی و صداهای خشن
 * - بازسازی کاسه تبتی (Tibetan Singing Bowl) با رزونانس طبیعی برنزی و طنین آرامش‌بخش
 * - اتمسفر تنفس عمیق اقیانوس (Oceanic Breath Drone) با فیلتر پایین‌گذر عمیق
 * - بازخورد لمسی ملایم چوبی/قطره آب در ترنزیشن‌ها و اسکرابینگ
 */

export class AudioAmbienceEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dynamicFilterNode: BiquadFilterNode | null = null;
  private isMuted: boolean = false;
  private currentVolume: number = 0.5;
  private activeTone: string = 'zen_sanctuary';

  // لایه‌های پایدار اتمسفر مدیتیشن
  private droneGain: GainNode | null = null;
  private oceanGain: GainNode | null = null;
  private bowlIntervalId: ReturnType<typeof setInterval> | null = null;
  private activeOscillators: { stop: () => void }[] = [];

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    // مستر گین با شیب ملایم
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0001 : this.currentVolume, this.ctx.currentTime);

    // فیلتر پایین‌گذر اصلی برای حذف کامل هرگونه فرکانس گوش‌خراش
    this.dynamicFilterNode = this.ctx.createBiquadFilter();
    this.dynamicFilterNode.type = 'lowpass';
    this.dynamicFilterNode.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.dynamicFilterNode.Q.setValueAtTime(0.7, this.ctx.currentTime); // نرم و طبیعی بدون زنگ زدن

    this.dynamicFilterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // راه‌اندازی لایه‌های صوتی پایه مدیتیشن
    this.startMeditationDrone();
    this.startOceanBreath();
  }

  /**
   * صدای پهن‌باند اقیانوسی و تنفس آرامش‌بخش (Deep Oceanic Breathing)
   */
  private startOceanBreath() {
    if (!this.ctx || !this.dynamicFilterNode) return;

    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    // تولید نویز قهوه‌ای/صورتی نرم (Brown Noise)
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 0.6; // دامنه ملایم
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // فیلتر پایین‌گذر شدید روی ۱۶۰ هرتز (صدای دوردست امواج آرام ساحل در شب)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, this.ctx.currentTime);

    // نوسان‌ساز ریتم تنفس (LFO با پریود ~۱۲ ثانیه)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(60, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.connect(filter);
    filter.connect(this.oceanGain);
    this.oceanGain.connect(this.dynamicFilterNode);

    noiseSource.start();
    lfo.start();

    this.activeOscillators.push({
      stop: () => {
        try {
          noiseSource.stop();
          lfo.stop();
          noiseSource.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          filter.disconnect();
        } catch {}
      },
    });
  }

  /**
   * پد عمیق ۴۳۲ هرتز و هارمونی‌های آرامش‌بخش تتا (Theta Meditation Chords)
   */
  private startMeditationDrone() {
    if (!this.ctx || !this.dynamicFilterNode) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.droneGain.connect(this.dynamicFilterNode);

    const now = this.ctx.currentTime;
    // فرکانس‌های هارمونیک بر پایه ۴۳۲ هرتز (108Hz Sub-Root, 216Hz Body, 324Hz Gentle Fifth)
    const droneFreqs = [108.0, 216.0, 324.0];

    droneFreqs.forEach((freq, idx) => {
      if (!this.ctx || !this.droneGain) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'sine';
      // دیتون ظریف (Binaural beating ملایم برای ترشح امواج آلفا)
      const detune = idx === 1 ? 0.8 : idx === 2 ? -0.6 : 0;
      osc.frequency.setValueAtTime(freq + detune, now);

      // بهره کم برای صدای پس‌زمینه گرم و مخملی
      const gainVal = idx === 0 ? 0.08 : idx === 1 ? 0.06 : 0.035;
      oscGain.gain.setValueAtTime(gainVal, now);

      osc.connect(oscGain);
      oscGain.connect(this.droneGain);
      osc.start(now);

      this.activeOscillators.push({
        stop: () => {
          try {
            osc.stop();
            osc.disconnect();
            oscGain.disconnect();
          } catch {}
        },
      });
    });
  }

  /**
   * کاسه تبتی / چایم کریستال مدیتیشن (Tibetan Singing Bowl Chime)
   * صدایی گرم، عمیق و طنین‌انداز در هنگام آغاز ترنزیشن، بدون هرگونه تیزی
   */
  public playTransitionChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // گین اختصاصی کاسه تبتی
    const chimeGain = this.ctx.createGain();
    chimeGain.gain.setValueAtTime(0.0001, now);
    // اتک نرم و ابریشمی (۸۰ میلی‌ثانیه به جای ضربه خشن)
    chimeGain.gain.exponentialRampToValueAtTime(0.14, now + 0.08);
    // دم ملایم و طولانی (۳.۸ ثانیه دی‌کی آرامش‌بخش)
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);
    chimeGain.connect(this.masterGain);

    // مولفه‌های فرکانسی کاسه تبتی (ریشه ۲۱۶ هرتز + فواصل هارمونیک ملایم)
    const partials = [
      { freq: 216.0, gain: 0.12 },  // ریشه عمیق
      { freq: 324.0, gain: 0.05 },  // پرده پنجم هارمونیک
      { freq: 432.0, gain: 0.04 },  // اکتاو ۴۳۲ هرتز آرامش
    ];

    partials.forEach(({ freq, gain }) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      pGain.gain.setValueAtTime(gain, now);

      osc.connect(pGain);
      pGain.connect(chimeGain);

      osc.start(now);
      osc.stop(now + 4.0);

      osc.onended = () => {
        try {
          osc.disconnect();
          pGain.disconnect();
        } catch {}
      };
    });

    setTimeout(() => {
      try {
        chimeGain.disconnect();
      } catch {}
    }, 4200);
  }

  /**
   * بازخورد لمسی اسکرابینگ و کلیک (Tactile Wooden Zen Drop)
   * یک فرکانس ملایم ۲۱۶ هرتز شبیه قطره آب روی چوب با ولوم بسیار ناچیز
   */
  public playTick() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(216.0, now);

    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /**
   * تنظیم ملایم فیلتر در حین ترنزیشن بدون صدای آزاردهنده
   */
  public modulateTransitionSoundscape(
    progress: number,
    _fromTone?: string,
    _toTone?: string,
    velocity: number = 0
  ) {
    if (!this.ctx || !this.dynamicFilterNode || this.isMuted) return;
    const now = this.ctx.currentTime;
    const clampedP = Math.max(0, Math.min(1, progress));

    // تغییر تدریجی و آرام کات‌آف فیلتر در بازه ۲۴۰ تا ۳۶۰ هرتز (همواره گرم و فاقد تیزی)
    const targetCutoff = 240 + Math.sin(clampedP * Math.PI) * 90 + Math.min(40, Math.abs(velocity) * 20);

    this.dynamicFilterNode.frequency.cancelScheduledValues(now);
    this.dynamicFilterNode.frequency.setValueAtTime(this.dynamicFilterNode.frequency.value, now);
    this.dynamicFilterNode.frequency.setTargetAtTime(targetCutoff, now, 0.2);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.setTargetAtTime(muted ? 0.0001 : this.currentVolume, now, 0.25);
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

  public playAmbiance(tone: string = 'zen_sanctuary', volume: number = 0.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    this.activeTone = tone;
    this.setVolume(volume);

    if (this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }
  }

  public setRoomAmbientLayer(tone: string, volume: number = 0.5, _fadeDuration?: number) {
    this.activeTone = tone;
    this.setVolume(volume);
  }

  public crossfadeBetweenTones(_fromTone: string, toTone: string, _duration?: number) {
    this.activeTone = toTone;
  }

  public warmUpAudioProfile(_tone: string): void {}
  public purgeAudioBuffersForTones(tones: string[]): { purgedCount: number } {
    return { purgedCount: tones.length };
  }
  public pruneNonAdjacentAudio(_tones: string[]): void {}

  public destroy() {
    if (this.bowlIntervalId) {
      clearInterval(this.bowlIntervalId);
      this.bowlIntervalId = null;
    }
    this.activeOscillators.forEach((osc) => osc.stop());
    this.activeOscillators = [];

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
