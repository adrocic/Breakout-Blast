import * as Tone from "tone";

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

function gainToDb(gain) {
  if (gain <= 0) return -60;
  return Math.max(-60, 20 * Math.log10(gain));
}

export class AudioService {
  constructor() {
    this._masterVolume = 1;

    this._isUnlocked = false;
    this._unlockPromise = null;
    this._pendingMusicMode = "menu";
    this._musicMode = null;

    this._master = null;
    this._musicSynth = null;
    this._bassSynth = null;
    this._kick = null;
    this._hat = null;

    this._uiSynth = null;
    this._hitSynth = null;
    this._powerSynth = null;
    this._laserSynth = null;

    this._onFirstGesture = () => {
      // Don't await; browsers require this to be sync-initiated by a gesture.
      this.ensureUnlocked();
    };

    window.addEventListener("pointerdown", this._onFirstGesture, {
      passive: true,
      once: true,
    });
    window.addEventListener("keydown", this._onFirstGesture, { once: true });
  }

  /**
   * Must be called from a user gesture (button click, key press, pointerdown).
   * @returns {Promise<void>}
   */
  async ensureUnlocked() {
    if (this._isUnlocked) return;
    if (this._unlockPromise) return this._unlockPromise;

    this._unlockPromise = (async () => {
      await Tone.start();

      this._isUnlocked = true;
      this._buildGraph();
      this._applyMasterVolume();
      this.setMusicMode(this._pendingMusicMode);
    })();

    return this._unlockPromise;
  }

  /**
   * @param {number} value 0..1
   */
  setMasterVolume(value) {
    this._masterVolume = clamp01(value);
    this._applyMasterVolume();
  }

  get masterVolume() {
    return this._masterVolume;
  }

  get isUnlocked() {
    return this._isUnlocked;
  }

  /**
   * @param {'menu'|'play'|'victory'|'defeat'} mode
   */
  setMusicMode(mode) {
    this._pendingMusicMode = mode;
    if (!this._isUnlocked) return;
    if (this._musicMode === mode) return;
    this._musicMode = mode;

    this._stopMusic();
    if (mode === "victory" || mode === "defeat") {
      this._playStinger(mode);
      return;
    }
    this._startMusic(mode);
  }

  playUiConfirm() {
    if (!this._uiSynth) return;
    const t = Tone.now();
    this._uiSynth.triggerAttackRelease("C6", 0.05, t, 0.6);
    this._uiSynth.triggerAttackRelease("E6", 0.06, t + 0.03, 0.45);
  }

  playPaddleHit() {
    if (!this._hitSynth) return;
    this._hitSynth.triggerAttackRelease("G2", 0.04, Tone.now(), 0.7);
  }

  /**
   * @param {{ destroyed?: boolean }=} opts
   */
  playBrickHit(opts) {
    if (!this._hitSynth) return;
    const destroyed = Boolean(opts?.destroyed);
    const note = destroyed ? "C3" : "A2";
    const vel = destroyed ? 0.9 : 0.55;
    this._hitSynth.triggerAttackRelease(note, 0.03, Tone.now(), vel);
  }

  /**
   * @param {string} type
   */
  playPowerUp(type) {
    if (!this._powerSynth) return;
    const t = Tone.now();
    const base =
      type === "gravity-well" ? "E5" : type === "laser" ? "G5" : "C5";
    this._powerSynth.triggerAttackRelease(base, 0.08, t, 0.6);
    this._powerSynth.triggerAttackRelease("C6", 0.08, t + 0.06, 0.5);
  }

  playLaser() {
    if (!this._laserSynth) return;
    this._laserSynth.triggerAttackRelease("32n", Tone.now(), 0.65);
  }

  dispose() {
    this._stopMusic();

    try {
      this._musicSynth?.dispose();
      this._bassSynth?.dispose();
      this._kick?.dispose();
      this._hat?.dispose();
      this._uiSynth?.dispose();
      this._hitSynth?.dispose();
      this._powerSynth?.dispose();
      this._laserSynth?.dispose();
      this._master?.dispose();
    } finally {
      this._musicSynth = null;
      this._bassSynth = null;
      this._kick = null;
      this._hat = null;
      this._uiSynth = null;
      this._hitSynth = null;
      this._powerSynth = null;
      this._laserSynth = null;
      this._master = null;
    }
  }

  _buildGraph() {
    if (this._master) return;

    this._master = new Tone.Volume(0).toDestination();

    this._musicSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.25, release: 0.6 },
    }).connect(this._master);

    this._bassSynth = new Tone.MonoSynth({
      oscillator: { type: "square" },
      filter: { Q: 2, type: "lowpass", rolloff: -24, frequency: 280 },
      envelope: { attack: 0.01, decay: 0.14, sustain: 0.1, release: 0.22 },
    }).connect(this._master);

    this._kick = new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
    }).connect(this._master);

    this._hat = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0 },
    }).connect(this._master);

    this._uiSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.05 },
    }).connect(this._master);

    this._hitSynth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
    }).connect(this._master);

    this._powerSynth = new Tone.FMSynth({
      harmonicity: 2,
      modulationIndex: 10,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.05, release: 0.18 },
    }).connect(this._master);

    this._laserSynth = new Tone.MetalSynth({
      frequency: 240,
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 900,
      octaves: 1.2,
    }).connect(this._master);

    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = "2m";
  }

  _applyMasterVolume() {
    if (!this._master) return;
    this._master.volume.value = gainToDb(this._masterVolume);
  }

  _stopMusic() {
    if (!this._isUnlocked) return;
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
  }

  /**
   * @param {'menu'|'play'} mode
   */
  _startMusic(mode) {
    if (!this._musicSynth || !this._bassSynth || !this._kick || !this._hat)
      return;

    const now = Tone.now();
    const bpm = mode === "menu" ? 84 : 114;
    Tone.Transport.bpm.value = bpm;

    // Very lightweight procedural loop; easy to swap later for a Strudel-style DSL.
    const chordProg =
      mode === "menu"
        ? [
            ["C4", "E4", "B4"],
            ["A3", "C4", "E4"],
            ["F3", "A3", "E4"],
            ["G3", "C4", "D4"],
          ]
        : [
            ["D4", "F4", "A4"],
            ["Bb3", "D4", "F4"],
            ["G3", "Bb3", "D4"],
            ["A3", "C4", "E4"],
          ];

    const bassLine =
      mode === "menu" ? ["C2", "A1", "F1", "G1"] : ["D2", "Bb1", "G1", "A1"];

    const chordPart = new Tone.Part(
      (time, chord) => {
        this._musicSynth.triggerAttackRelease(chord, "1n", time, 0.22);
      },
      [
        ["0:0:0", chordProg[0]],
        ["0:2:0", chordProg[1]],
        ["1:0:0", chordProg[2]],
        ["1:2:0", chordProg[3]],
      ],
    ).start(0);

    const bassPart = new Tone.Part(
      (time, note) => {
        this._bassSynth.triggerAttackRelease(note, "8n", time, 0.25);
      },
      [
        ["0:0:0", bassLine[0]],
        ["0:2:0", bassLine[1]],
        ["1:0:0", bassLine[2]],
        ["1:2:0", bassLine[3]],
      ],
    ).start(0);

    const drumPart = new Tone.Part(
      (time, step) => {
        if (mode === "play") {
          if (step % 4 === 0)
            this._kick.triggerAttackRelease("C1", "16n", time, 0.55);
          if (step % 2 === 1) this._hat.triggerAttackRelease("16n", time, 0.08);
        } else {
          if (step === 0)
            this._kick.triggerAttackRelease("C1", "16n", time, 0.25);
          if (step === 4) this._hat.triggerAttackRelease("16n", time, 0.05);
        }
      },
      Array.from({ length: 8 }, (_, i) => [
        `0:${Math.floor(i / 4)}:${(i % 4) * 2}`,
        i,
      ]),
    ).start(0);

    // Store parts so Transport.cancel doesn't leak references.
    this._activeParts = [chordPart, bassPart, drumPart];

    Tone.Transport.start(now + 0.02);
  }

  _playStinger(mode) {
    if (!this._musicSynth) return;
    const t = Tone.now();
    const chord =
      mode === "victory" ? ["C4", "E4", "G4", "C5"] : ["A3", "C4", "E4", "G4"];
    this._musicSynth.triggerAttackRelease(chord, 0.8, t, 0.35);
  }
}
