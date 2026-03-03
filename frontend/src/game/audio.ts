// ══════════════════════════════════════════════════════════
// Frostland Audio System — Procedural audio via Web Audio API
// BGM: Wind ambience loop   SFX: UI + game events
// ══════════════════════════════════════════════════════════

type SfxName = 'build' | 'click' | 'dayAdvance' | 'event' | 'victory' | 'defeat' | 'demolish' | 'assign';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windBuffer: AudioBuffer | null = null;
  private muted = false;
  private _bgmVolume = 0.25;
  private _sfxVolume = 0.5;
  private started = false;

  // Lazily initialize on first user gesture
  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this._bgmVolume;
      this.bgmGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._sfxVolume;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ── Wind Ambience (BGM) ──

  private generateWindBuffer(): AudioBuffer {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const duration = 8; // 8 second loop
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    // Layered wind: filtered noise with slow amplitude modulation
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Base wind noise
      const noise = (Math.random() * 2 - 1);
      // Slow amplitude envelope (howling gusts)
      const gust1 = 0.4 + 0.6 * Math.sin(t * 0.8) * Math.sin(t * 0.3);
      const gust2 = 0.3 + 0.7 * Math.sin(t * 1.3 + 1.2) * Math.sin(t * 0.5 + 0.7);
      // Low rumble
      const rumble = Math.sin(t * 45) * 0.08 + Math.sin(t * 72) * 0.05;
      // High whistle (occasional)
      const whistle = Math.sin(t * 2200 + Math.sin(t * 3) * 300) * 0.012 * Math.max(0, Math.sin(t * 0.6) - 0.6);

      data[i] = noise * 0.15 * (gust1 * 0.5 + gust2 * 0.5) + rumble + whistle;
    }

    // Apply crossfade for seamless loop (last 0.5s → first 0.5s)
    const fadeLen = Math.floor(sr * 0.5);
    for (let i = 0; i < fadeLen; i++) {
      const fade = i / fadeLen;
      data[i] = data[i] * fade + data[len - fadeLen + i] * (1 - fade);
    }

    return buf;
  }

  startBGM(): void {
    const ctx = this.ensure();
    if (this.started) return;

    if (!this.windBuffer) {
      this.windBuffer = this.generateWindBuffer();
    }

    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = this.windBuffer;
    this.windSource.loop = true;

    // Low-pass filter for muffled wind
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    lp.Q.value = 0.7;

    this.windSource.connect(lp);
    lp.connect(this.bgmGain!);
    this.windSource.start();
    this.started = true;
  }

  stopBGM(): void {
    if (this.windSource) {
      try { this.windSource.stop(); } catch {}
      this.windSource = null;
    }
    this.started = false;
  }

  // Adjust wind intensity based on temperature
  setWindIntensity(temperature: number): void {
    if (!this.bgmGain) return;
    // Colder → louder/harsher wind
    const coldness = Math.min(1, Math.max(0, (-temperature - 15) / 35));
    const vol = this._bgmVolume * (0.5 + coldness * 0.5);
    this.bgmGain.gain.setTargetAtTime(vol, this.ctx!.currentTime, 0.5);
  }

  // ── SFX ──

  playSfx(name: SfxName): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;

    switch (name) {
      case 'click':
        this.playTone(1200, 0.04, 'sine', 0.2);
        break;
      case 'build':
        this.playNoiseBurst(0.12, 600);
        this.playTone(220, 0.08, 'square', 0.15);
        setTimeout(() => this.playTone(330, 0.06, 'square', 0.12), 60);
        break;
      case 'demolish':
        this.playNoiseBurst(0.2, 400);
        this.playTone(150, 0.15, 'sawtooth', 0.12);
        break;
      case 'dayAdvance':
        // Rising chime: 3 ascending tones
        this.playTone(440, 0.12, 'sine', 0.15);
        setTimeout(() => this.playTone(554, 0.12, 'sine', 0.12), 80);
        setTimeout(() => this.playTone(659, 0.18, 'sine', 0.1), 160);
        break;
      case 'event':
        // Dramatic low brass + cymbal
        this.playTone(180, 0.3, 'sawtooth', 0.1);
        this.playTone(270, 0.25, 'sawtooth', 0.06);
        this.playNoiseBurst(0.15, 2000);
        break;
      case 'assign':
        this.playTone(600, 0.06, 'sine', 0.15);
        setTimeout(() => this.playTone(750, 0.06, 'sine', 0.12), 50);
        break;
      case 'victory':
        // Triumphant fanfare
        [523, 659, 784, 1047].forEach((freq, i) => {
          setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.12 - i * 0.02), i * 120);
        });
        break;
      case 'defeat':
        // Descending minor tones
        [392, 349, 311, 261].forEach((freq, i) => {
          setTimeout(() => this.playTone(freq, 0.4, 'sawtooth', 0.08), i * 200);
        });
        break;
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  private playNoiseBurst(duration: number, filterFreq: number): void {
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.value = 0.12;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    source.start();
  }

  // ── Controls ──

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx!.currentTime, 0.05);
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setBgmVolume(v: number): void {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(this._bgmVolume, this.ctx!.currentTime, 0.1);
    }
  }

  setSfxVolume(v: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this._sfxVolume, this.ctx!.currentTime, 0.1);
    }
  }

  dispose(): void {
    this.stopBGM();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.windBuffer = null;
  }
}

// Singleton instance
let _audio: AudioSystem | null = null;

export function getAudio(): AudioSystem {
  if (!_audio) _audio = new AudioSystem();
  return _audio;
}
