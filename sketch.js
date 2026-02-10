// Constants
const BRICK_COLS = 10;
const BRICK_ROWS = 10;

const PADDLE_WIDTH = 250;
const PADDLE_HEIGHT = 50;
const PADDLE_Y = 1000;
const PADDLE_MOVE_SPEED = 22;

const BALL_DIAMETER = 38;
const LASER_BEAM_WIDTH = 120;
const LASER_GROWTH_RATE = 4200;
const LASER_FRAME_DURATION_MS = 70;
const LASER_PERSISTENCE_MS = 150;
const LASER_DAMAGE_INTERVAL_MS = 100;
const LASER_SHOTS_PER_PICKUP = 3;

const GRAVITY_WELL_DURATION_MS = 20000;
const GRAVITY_WELL_PULL_FORCE = 28800;
const GRAVITY_WELL_CAPTURE_RADIUS = 140;
const GRAVITY_DAMAGE_INTERVAL_MS = 1000;
const GRAVITY_NOVA_MAX_BRICKS = 4;

const CAUGHT_TRAJECTORY_LENGTH = 260;
const CAUGHT_AIM_ANGLE_OFFSET = 0.2;
const CAUGHT_RELEASE_FLASH_DURATION = 180;

// Declare variables for the start and end points of the laser
let laser;
let laserFrames = [];

// Game state identifiers used for the various UI scenes
const GAME_STATES = Object.freeze({
    TITLE: 'title',
    PLAYING: 'game',
    GAME_OVER: 'gameover',
    VICTORY: 'win'
});

// Global variables
let bricks = [];
let paddle;
const paddleInputState = {
    left: false,
    right: false
};
let allBalls = [];
let powerUps = [];
let gameOver = false;
let paused = false;
let isDebugging = false;
let gravityWell;
let gravityWellSound;
let caughtBall = null;
let caughtBallSide = null;
let paddleCatchSoundPlayer = null;
let paddleReleaseSoundPlayer = null;

function removeTemporaryBalls() {
    if (!allBalls.length) {
        return;
    }

    allBalls = allBalls.filter(ball => !ball.isTemporary);

    if (caughtBall && !allBalls.includes(caughtBall)) {
        resetCaughtBallState();
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function resetCaughtBallState() {
    if (caughtBall) {
        caughtBall.isCaught = false;
    }
    caughtBall = null;
    caughtBallSide = null;
}

function resetPaddleInputState() {
    paddleInputState.left = false;
    paddleInputState.right = false;
}

function updatePaddleMovementFromKey(keyCode, key, isPressed) {
    const normalizedKey = typeof key === 'string' ? key.toLowerCase() : '';
    let handled = false;

    if (keyCode === LEFT_ARROW || normalizedKey === 'a') {
        paddleInputState.left = isPressed;
        handled = true;
    }

    if (keyCode === RIGHT_ARROW || normalizedKey === 'd') {
        paddleInputState.right = isPressed;
        handled = true;
    }

    return handled;
}

// Tracks the current screen/scene
let gameState = GAME_STATES.TITLE;

// Session level tracking for the end screen summary
let sessionStats = null;
let lastSessionSummary = null;

// Decorative particles used on the title and end screens
const MENU_PARTICLE_COUNT = 70;
let menuParticles = [];

let backgroundImage;

let paddleImage;

let brick3Image;
let brick2Image;
let brick1Image;

let ballImage;
let ballFullPowerImage;

let powerUpExtraBallsImage;
let powerUpExtraBallsImage2;
let powerUpExtraBallsImage3;
let powerUpExtraBallsImage4;
let powerUpExtraBallsImage5;
let powerUpExtraBallsImage6;
let powerUpExtraBallsImage7;

let powerUpLaserImage;
let powerUpLaserImage2;
let powerUpLaserImage3;
let powerUpLaserImage4;
let powerUpLaserImage5;
let powerUpLaserImage6;
let powerUpLaserImage7;

let seaShanty;
let smite;
let menuMusic;
let menuGif;
let menuTrack = null;
let gameplayTrack = null;

let brickHitSoundPlayers = [];
let brickSoundVolume = 1;
let menuUiElements = null;
let powerUpCatchSoundPlayer = null;
let powerUpCatchEffects = [];

function preload() {
    // Ensure p5.sound APIs exist in environments where the sound
    // library might not be available. This prevents runtime errors
    // that stop asset loading when sound support is missing.
    if (typeof soundFormats === 'function') {
        soundFormats('mp3', 'ogg');
    }

    if (typeof loadSound !== 'function') {
        // Provide a stub loadSound that returns an object with the
        // sound methods used in this game.
        window.loadSound = () => ({
            play() { },
            stop() { },
            setLoop() { },
            setVolume() { },
            isPlaying() { return false; }
        });
    }
    //images
    backgroundImage = loadImage('Assets/background1.png')
    paddleImage = loadImage('Assets/paddle.png')
    brick3Image = loadImage('Assets/brick3.png')
    brick2Image = loadImage('Assets/brick2.png')
    brick1Image = loadImage('Assets/brick1.png')
    ballImage = loadImage('Assets/ball.png')
    ballFullPowerImage = loadImage('Assets/ball-full-power.png')
    powerUpExtraBallsImage = loadImage('Assets/power-up-extra-balls.png')
    powerUpExtraBallsImage2 = loadImage('Assets/power-up-extra-balls2.png')
    powerUpExtraBallsImage3 = loadImage('Assets/power-up-extra-balls3.png')
    powerUpExtraBallsImage4 = loadImage('Assets/power-up-extra-balls4.png')
    powerUpExtraBallsImage5 = loadImage('Assets/power-up-extra-balls5.png')
    powerUpExtraBallsImage6 = loadImage('Assets/power-up-extra-balls6.png')
    powerUpExtraBallsImage7 = loadImage('Assets/power-up-extra-balls7.png')
    powerUpLaserImage = loadImage('Assets/power-up-laser.png')
    powerUpLaserImage2 = loadImage('Assets/power-up-laser2.png')
    powerUpLaserImage3 = loadImage('Assets/power-up-laser3.png')
    powerUpLaserImage4 = loadImage('Assets/power-up-laser4.png')
    powerUpLaserImage5 = loadImage('Assets/power-up-laser5.png')
    powerUpLaserImage6 = loadImage('Assets/power-up-laser6.png')
    powerUpLaserImage7 = loadImage('Assets/power-up-laser7.png')
    laserFrames = [
        loadImage('Assets/laser.png'),
        loadImage('Assets/laser2.png')
    ];
    menuGif = loadImage('Assets/Breakout Blast Gif.gif')

    //sounds
    seaShanty = loadSound('Assets/Sea_Shanty.mp3');
    smite = loadSound('Assets/Smite.mp3');
    menuMusic = loadSound('Assets/Sea_Shanty.mp3');
}

function ensureAudioContextRunning() {
    if (typeof getAudioContext !== 'function') {
        return;
    }

    const context = getAudioContext();
    if (context && typeof context.resume === 'function' && context.state !== 'running') {
        context.resume();
    }
}


function createChiptuneTrack(config) {
    if (typeof p5 === 'undefined' || typeof p5.Oscillator !== 'function' || typeof p5.Envelope !== 'function') {
        return null;
    }

    const oscillatorA = new p5.Oscillator(config.waveA || 'square');
    const oscillatorB = new p5.Oscillator(config.waveB || 'triangle');
    const envelopeA = new p5.Envelope();
    const envelopeB = new p5.Envelope();

    envelopeA.setADSR(0.003, 0.06, 0.0, 0.08);
    envelopeB.setADSR(0.002, 0.04, 0.0, 0.08);
    envelopeA.setRange((config.volumeA || 0.16) * brickSoundVolume, 0);
    envelopeB.setRange((config.volumeB || 0.1) * brickSoundVolume, 0);

    oscillatorA.amp(envelopeA);
    oscillatorB.amp(envelopeB);
    oscillatorA.start();
    oscillatorB.start();

    const beatMs = 60000 / (config.bpm || 128);

    return {
        playing: false,
        index: 0,
        nextNoteTime: 0,
        start() {
            ensureAudioContextRunning();
            this.playing = true;
            this.index = 0;
            this.nextNoteTime = 0;
        },
        stop() {
            this.playing = false;
            oscillatorA.amp(0, 0.06);
            oscillatorB.amp(0, 0.06);
        },
        setVolume(multiplier) {
            envelopeA.setRange((config.volumeA || 0.16) * multiplier, 0);
            envelopeB.setRange((config.volumeB || 0.1) * multiplier, 0);
        },
        update(nowMs) {
            if (!this.playing || !config.pattern || !config.pattern.length) {
                return;
            }

            if (this.nextNoteTime === 0) {
                this.nextNoteTime = nowMs;
            }

            while (nowMs >= this.nextNoteTime) {
                const step = config.pattern[this.index % config.pattern.length];
                const beats = step.beats || 1;
                const durationMs = beatMs * beats;

                if (!step.rest) {
                    const frequency = midiToFreq(step.midi);
                    oscillatorA.freq(frequency, 0.02);
                    oscillatorB.freq(frequency * (step.detuneMultiplier || 1.5), 0.02);
                    envelopeA.play(oscillatorA);
                    envelopeB.play(oscillatorB);
                }

                this.index += 1;
                this.nextNoteTime += durationMs;
            }
        }
    };
}

function initializeChiptuneMusic() {
    menuTrack = createChiptuneTrack({
        bpm: 152,
        waveA: 'square',
        waveB: 'triangle',
        volumeA: 0.14,
        volumeB: 0.08,
        pattern: [
            { midi: 72, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 79, beats: 0.5 }, { midi: 84, beats: 0.5 },
            { midi: 83, beats: 0.5 }, { midi: 79, beats: 0.5 }, { midi: 76, beats: 0.5 }, { midi: 72, beats: 0.5 },
            { midi: 74, beats: 0.5 }, { midi: 77, beats: 0.5 }, { midi: 81, beats: 0.5 }, { midi: 84, beats: 0.5 },
            { midi: 81, beats: 0.5 }, { midi: 77, beats: 0.5 }, { midi: 74, beats: 0.5 }, { midi: 71, beats: 0.5 }
        ]
    });

    gameplayTrack = createChiptuneTrack({
        bpm: 168,
        waveA: 'square',
        waveB: 'sawtooth',
        volumeA: 0.13,
        volumeB: 0.09,
        pattern: [
            { midi: 64, beats: 0.5 }, { midi: 67, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 76, beats: 0.5 },
            { midi: 74, beats: 0.5 }, { midi: 71, beats: 0.5 }, { midi: 67, beats: 0.5 }, { midi: 64, beats: 0.5 },
            { midi: 62, beats: 0.5 }, { midi: 66, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 74, beats: 0.5 },
            { midi: 71, beats: 0.5 }, { midi: 69, beats: 0.5 }, { midi: 66, beats: 0.5 }, { midi: 62, beats: 0.5 }
        ]
    });
}

function stopGameplayMusic() {
    if (gameplayTrack && typeof gameplayTrack.stop === 'function') {
        gameplayTrack.stop();
    }

    if (seaShanty && typeof seaShanty.stop === 'function') {
        seaShanty.stop();
    }
}

function startGameplayMusic() {
    if (gameplayTrack && typeof gameplayTrack.start === 'function') {
        gameplayTrack.start();
        return;
    }

    if (seaShanty && typeof seaShanty.setLoop === 'function') {
        seaShanty.setLoop(true);
        seaShanty.play();
    }
}

function startMenuMusic() {
    if (menuTrack && typeof menuTrack.start === 'function') {
        menuTrack.start();
        return;
    }

    if (menuMusic && typeof menuMusic.setLoop === 'function') {
        menuMusic.setLoop(true);
        menuMusic.play();
    }
}

function updateMusicSequencers() {
    const now = getCurrentTimeMs();
    if (menuTrack && typeof menuTrack.update === 'function') {
        menuTrack.update(now);
    }
    if (gameplayTrack && typeof gameplayTrack.update === 'function') {
        gameplayTrack.update(now);
    }
}

function initializeBrickHitSounds() {
    if (typeof p5 === 'undefined' ||
        typeof p5.Oscillator !== 'function' ||
        typeof p5.Envelope !== 'function' ||
        typeof p5.Noise !== 'function') {
        brickHitSoundPlayers = [];
        return;
    }

    const firstHit = createBrickTone({
        wave: 'triangle',
        startFreq: 720,
        endFreq: 620,
        baseAmp: 0.28,
        attack: 0.002,
        decay: 0.18,
        sustain: 0.0,
        release: 0.1
    });

    const secondHit = createBrickTone({
        wave: 'sawtooth',
        startFreq: 520,
        endFreq: 410,
        baseAmp: 0.26,
        attack: 0.002,
        decay: 0.22,
        sustain: 0.0,
        release: 0.12
    });

    const breakSound = createBrickBreakSound();

    brickHitSoundPlayers = [firstHit, secondHit, breakSound];
}

function initializePowerUpCatchSound() {
    if (typeof p5 === 'undefined' ||
        typeof p5.Oscillator !== 'function' ||
        typeof p5.Envelope !== 'function') {
        powerUpCatchSoundPlayer = null;
        return;
    }

    const primaryOscillator = new p5.Oscillator('triangle');
    const primaryEnvelope = new p5.Envelope();
    primaryEnvelope.setADSR(0.001, 0.18, 0, 0.28);
    primaryEnvelope.setRange(0.5, 0);
    primaryOscillator.amp(primaryEnvelope);
    primaryOscillator.start();

    const shimmerOscillator = new p5.Oscillator('sine');
    const shimmerEnvelope = new p5.Envelope();
    shimmerEnvelope.setADSR(0.001, 0.24, 0, 0.22);
    shimmerEnvelope.setRange(0.35, 0);
    shimmerOscillator.amp(shimmerEnvelope);
    shimmerOscillator.start();

    powerUpCatchSoundPlayer = (type) => {
        ensureAudioContextRunning();

        const baseFrequency = type === 'laser' ? 540 : type === 'gravity well' ? 420 : 660;
        const shimmerFrequency = type === 'laser' ? baseFrequency * 1.32 : type === 'gravity well' ? baseFrequency * 1.24 : baseFrequency * 1.5;

        primaryOscillator.freq(baseFrequency);
        primaryOscillator.freq(baseFrequency * 1.18, 0.16);

        shimmerOscillator.freq(shimmerFrequency);
        shimmerOscillator.freq(shimmerFrequency * 1.05, 0.18);

        primaryEnvelope.setRange(0.5 * brickSoundVolume, 0);
        shimmerEnvelope.setRange(0.35 * brickSoundVolume, 0);
        primaryEnvelope.play(primaryOscillator);
        shimmerEnvelope.play(shimmerOscillator);
    };
}

function initializeGravityWellSound() {
    if (typeof p5 === 'undefined' ||
        typeof p5.Oscillator !== 'function') {
        gravityWellSound = null;
        return;
    }

    const lowOscillator = new p5.Oscillator('sine');
    const shimmerOscillator = new p5.Oscillator('triangle');

    lowOscillator.amp(0);
    shimmerOscillator.amp(0);
    lowOscillator.start();
    shimmerOscillator.start();

    gravityWellSound = {
        playing: false,
        start() {
            ensureAudioContextRunning();
            lowOscillator.freq(68);
            shimmerOscillator.freq(240);
            this.playing = true;
            this.setVolume();
        },
        stop() {
            if (!this.playing) {
                return;
            }

            lowOscillator.amp(0, 0.5);
            shimmerOscillator.amp(0, 0.5);
            this.playing = false;
        },
        update() {
            if (!this.playing) {
                return;
            }

            const timeSeconds = getCurrentTimeMs() / 1000;
            lowOscillator.freq(68 + Math.sin(timeSeconds * 0.9) * 18);
            shimmerOscillator.freq(240 + Math.sin(timeSeconds * 1.7) * 55);
        },
        setVolume() {
            if (!this.playing) {
                return;
            }

            lowOscillator.amp(0.26 * brickSoundVolume, 0.24);
            shimmerOscillator.amp(0.14 * brickSoundVolume, 0.24);
        }
    };
}

function playPowerUpCatchSound(type) {
    if (typeof powerUpCatchSoundPlayer === 'function') {
        powerUpCatchSoundPlayer(type);
    }
}

function initializePaddleCatchSounds() {
    if (typeof p5 === 'undefined' ||
        typeof p5.Oscillator !== 'function' ||
        typeof p5.Envelope !== 'function' ||
        typeof p5.Noise !== 'function') {
        paddleCatchSoundPlayer = null;
        paddleReleaseSoundPlayer = null;
        return;
    }

    const catchOscillator = new p5.Oscillator('triangle');
    const catchEnvelope = new p5.Envelope();
    catchEnvelope.setADSR(0.001, 0.12, 0, 0.26);
    catchEnvelope.setRange(0.45, 0);
    catchOscillator.amp(catchEnvelope);
    catchOscillator.start();

    paddleCatchSoundPlayer = () => {
        ensureAudioContextRunning();
        catchOscillator.freq(560);
        catchOscillator.freq(340, 0.18);
        catchEnvelope.setRange(0.45 * brickSoundVolume, 0);
        catchEnvelope.play(catchOscillator);
    };

    const releaseOscillator = new p5.Oscillator('sawtooth');
    const releaseEnvelope = new p5.Envelope();
    releaseEnvelope.setADSR(0.001, 0.18, 0, 0.32);
    releaseEnvelope.setRange(0.55, 0);
    releaseOscillator.amp(releaseEnvelope);
    releaseOscillator.start();

    const releaseNoise = new p5.Noise('white');
    const releaseNoiseEnvelope = new p5.Envelope();
    releaseNoiseEnvelope.setADSR(0.001, 0.16, 0, 0.28);
    releaseNoiseEnvelope.setRange(0.32, 0);
    releaseNoise.amp(releaseNoiseEnvelope);
    releaseNoise.start();

    paddleReleaseSoundPlayer = () => {
        ensureAudioContextRunning();
        releaseOscillator.freq(520);
        releaseOscillator.freq(820, 0.18);
        releaseEnvelope.setRange(0.55 * brickSoundVolume, 0);
        releaseEnvelope.play(releaseOscillator);
        releaseNoiseEnvelope.setRange(0.32 * brickSoundVolume, 0);
        releaseNoiseEnvelope.play(releaseNoise);
    };
}

function playPaddleCatchSound() {
    if (typeof paddleCatchSoundPlayer === 'function') {
        paddleCatchSoundPlayer();
    }
}

function playPaddleReleaseSound() {
    if (typeof paddleReleaseSoundPlayer === 'function') {
        paddleReleaseSoundPlayer();
    }
}

function catchBallOnPaddle(ball, paddle, side) {
    if (!ball || !paddle) {
        return;
    }

    resetCaughtBallState();

    caughtBall = ball;
    caughtBallSide = side;
    ball.isCaught = true;
    ball.xspeed = 0;
    ball.yspeed = 0;
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    ball.caughtOffsetY = clamp(ball.y - paddle.y, ball.diameter / 2, paddle.height - ball.diameter / 2);
    ball.caughtAt = millis();
    ball.releaseFlashTimer = 0;
    ball.aimAngle = -Math.PI / 2;

    if (typeof paddle.startBounce === 'function') {
        paddle.startBounce();
    }

    updateCaughtBallState();
    playPaddleCatchSound();
}

function updateCaughtBallState() {
    if (!caughtBall || !caughtBall.isCaught) {
        return;
    }

    if (!paddle || !allBalls.includes(caughtBall)) {
        resetCaughtBallState();
        return;
    }

    const ball = caughtBall;
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    const offsetX = caughtBallSide === 'left'
        ? -ball.diameter / 2
        : paddle.width + ball.diameter / 2;
    ball.caughtOffsetY = clamp(ball.caughtOffsetY, ball.diameter / 2, paddle.height - ball.diameter / 2);
    ball.x = paddle.x + offsetX;
    ball.y = paddle.y + ball.caughtOffsetY;

    updateCaughtBallAim();
}

function updateCaughtBallAim() {
    if (!caughtBall || !caughtBall.isCaught) {
        return;
    }

    const ball = caughtBall;
    let angle = Math.atan2(mouseY - ball.y, mouseX - ball.x);
    if (Number.isNaN(angle)) {
        angle = -Math.PI / 2;
    }

    if (caughtBallSide === 'left') {
        const minAngle = -Math.PI + CAUGHT_AIM_ANGLE_OFFSET;
        const maxAngle = -Math.PI / 2 - CAUGHT_AIM_ANGLE_OFFSET;
        ball.aimAngle = clamp(angle, minAngle, maxAngle);
    } else {
        const minAngle = -Math.PI / 2 + CAUGHT_AIM_ANGLE_OFFSET;
        const maxAngle = -CAUGHT_AIM_ANGLE_OFFSET;
        ball.aimAngle = clamp(angle, minAngle, maxAngle);
    }
}

function drawCaughtBallAimingGuide() {
    if (!caughtBall || !caughtBall.isCaught) {
        return;
    }

    const ball = caughtBall;
    const angle = typeof ball.aimAngle === 'number' ? ball.aimAngle : -Math.PI / 2;
    const endX = ball.x + Math.cos(angle) * CAUGHT_TRAJECTORY_LENGTH;
    const endY = ball.y + Math.sin(angle) * CAUGHT_TRAJECTORY_LENGTH;
    const elapsed = millis() - (ball.caughtAt || 0);
    const pulse = 0.5 + 0.5 * Math.sin(elapsed / 120);

    push();
    stroke(255, 240, 160, 190 + pulse * 60);
    strokeWeight(4 + pulse * 2);
    line(ball.x, ball.y, endX, endY);

    push();
    translate(endX, endY);
    rotate(angle);
    noStroke();
    fill(255, 210, 140, 200);
    const arrowLength = 24;
    const arrowWidth = 11;
    triangle(0, 0, -arrowLength, arrowWidth, -arrowLength, -arrowWidth);
    pop();

    pop();
}

function fireCaughtBall() {
    if (!caughtBall || !caughtBall.isCaught) {
        return;
    }

    const ball = caughtBall;
    const angle = typeof ball.aimAngle === 'number' ? ball.aimAngle : -Math.PI / 2;
    const speed = 13;
    ball.isCaught = false;
    ball.xspeed = Math.cos(angle) * speed;
    ball.yspeed = Math.sin(angle) * speed;
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    ball.releaseFlashTimer = CAUGHT_RELEASE_FLASH_DURATION;
    ball.startBounce();
    playPaddleReleaseSound();
    resetCaughtBallState();
}

class PowerUpCatchEffect {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.startTime = millis();
        this.duration = 460;
        this.particles = Array.from({ length: 14 }, () => ({
            angle: Math.random() * Math.PI * 2,
            baseRadius: 10 + Math.random() * 12,
            expansion: 45 + Math.random() * 55,
            size: 6 + Math.random() * 6,
            phase: Math.random() * Math.PI * 2
        }));
    }

    draw() {
        const elapsed = millis() - this.startTime;
        const progress = elapsed / this.duration;

        if (progress >= 1) {
            return false;
        }

        const eased = Math.sin(Math.min(progress, 1) * Math.PI * 0.5);
        const palette = getPowerUpEffectPalette(this.type);
        const fade = 1 - progress;

        push();
        translate(this.x, this.y);

        noStroke();
        fill(palette.core.r, palette.core.g, palette.core.b, 190 * fade);
        const coreSize = 22 + eased * 24;
        ellipse(0, 0, coreSize, coreSize);

        const ringRadius = 24 + eased * 70;
        noFill();
        stroke(palette.ring.r, palette.ring.g, palette.ring.b, 220 * fade);
        strokeWeight(4);
        ellipse(0, 0, ringRadius * 2, ringRadius * 2);

        noStroke();
        const swirl = eased * Math.PI * 2.4;
        this.particles.forEach(particle => {
            const distance = particle.baseRadius + eased * particle.expansion;
            const wobble = Math.sin(swirl + particle.phase) * 4;
            const px = Math.cos(particle.angle + swirl) * (distance + wobble);
            const py = Math.sin(particle.angle + swirl) * (distance + wobble * 0.4);
            const size = Math.max(1.5, particle.size * (1 - progress * 0.7));
            fill(palette.particle.r, palette.particle.g, palette.particle.b, 200 * fade);
            ellipse(px, py, size, size);
        });

        pop();

        return true;
    }
}

function getPowerUpEffectPalette(type) {
    if (type === 'laser') {
        return {
            core: { r: 255, g: 120, b: 90 },
            ring: { r: 255, g: 200, b: 130 },
            particle: { r: 255, g: 160, b: 110 }
        };
    }

    if (type === 'gravity well') {
        return {
            core: { r: 150, g: 170, b: 255 },
            ring: { r: 120, g: 150, b: 255 },
            particle: { r: 180, g: 210, b: 255 }
        };
    }

    return {
        core: { r: 130, g: 255, b: 200 },
        ring: { r: 90, g: 235, b: 180 },
        particle: { r: 170, g: 255, b: 220 }
    };
}

function triggerPowerUpCatchFeedback(powerUp) {
    powerUpCatchEffects.push(new PowerUpCatchEffect(powerUp.x, powerUp.y, powerUp.type));
    playPowerUpCatchSound(powerUp.type);
}

function drawPowerUpCatchEffects() {
    if (!powerUpCatchEffects.length) {
        return;
    }

    const activeEffects = [];
    for (const effect of powerUpCatchEffects) {
        if (effect.draw()) {
            activeEffects.push(effect);
        }
    }

    powerUpCatchEffects = activeEffects;
}

function createBrickTone({ wave, startFreq, endFreq, baseAmp, attack, decay, sustain, release }) {
    const oscillator = new p5.Oscillator(wave);
    const envelope = new p5.Envelope();
    envelope.setADSR(attack, decay, sustain, release);
    envelope.setRange(baseAmp, 0);
    oscillator.amp(envelope);
    oscillator.start();

    return () => {
        ensureAudioContextRunning();
        const detune = (Math.random() * 18) - 9;
        oscillator.freq(startFreq + detune);
        if (typeof endFreq === 'number') {
            oscillator.freq(endFreq + detune * 0.5, decay + release);
        }
        envelope.setRange(baseAmp * brickSoundVolume, 0);
        envelope.play(oscillator);
    };
}

function createBrickBreakSound() {
    const noise = new p5.Noise('white');
    const filter = new p5.BandPass();
    noise.disconnect();
    noise.connect(filter);
    filter.freq(480);
    filter.res(8);

    const noiseEnvelope = new p5.Envelope();
    noiseEnvelope.setADSR(0.001, 0.18, 0, 0.24);
    noiseEnvelope.setRange(0.6, 0);
    noise.amp(noiseEnvelope);
    noise.start();

    const thumpOscillator = new p5.Oscillator('sine');
    const thumpEnvelope = new p5.Envelope();
    thumpEnvelope.setADSR(0.001, 0.15, 0, 0.32);
    thumpEnvelope.setRange(0.7, 0);
    thumpOscillator.amp(thumpEnvelope);
    thumpOscillator.freq(140);
    thumpOscillator.start();

    return () => {
        ensureAudioContextRunning();
        const breakSweep = 420 + Math.random() * 60;
        filter.freq(breakSweep);
        thumpOscillator.freq(110 + Math.random() * 40);
        noiseEnvelope.setRange(0.6 * brickSoundVolume, 0);
        thumpEnvelope.setRange(0.7 * brickSoundVolume, 0);
        noiseEnvelope.play(noise);
        thumpEnvelope.play(thumpOscillator);
    };
}

function triggerBrickHitSound(healthBeforeHit, destroyed) {
    if (!brickHitSoundPlayers.length) {
        return;
    }

    if (destroyed || healthBeforeHit <= 1) {
        brickHitSoundPlayers[2]();
        return;
    }

    if (healthBeforeHit >= 3) {
        brickHitSoundPlayers[0]();
    } else {
        brickHitSoundPlayers[1]();
    }
}

function getCurrentTimeMs() {
    if (typeof millis === 'function') {
        return millis();
    }

    return Date.now();
}

function isGravityWellActive() {
    return !!(gravityWell && gravityWell.active);
}

function updateBrickAppearance(brick) {
    if (!brick) {
        return;
    }

    if (brick.health >= 3) {
        brick.currentBrickImage = brick3Image;
        return;
    }

    if (brick.health === 2) {
        brick.currentBrickImage = brick2Image;
        return;
    }

    if (brick.health === 1) {
        brick.currentBrickImage = brick1Image;
        return;
    }
}

function damageBrick(brick, amount) {
    if (!brick || typeof amount !== 'number') {
        return false;
    }

    const healthBeforeHit = brick.health;
    brick.health = Math.max(0, brick.health - Math.max(0, amount));
    updateBrickAppearance(brick);

    const destroyed = brick.health <= 0;
    triggerBrickHitSound(healthBeforeHit, destroyed);
    return destroyed;
}

function applyLaserDamageToBrick(brick) {
    if (!laser || !laser.hitTimestamps || !brick) {
        return false;
    }

    const now = getCurrentTimeMs();
    const lastHit = laser.hitTimestamps.get(brick.id) || 0;

    if (now - lastHit < LASER_DAMAGE_INTERVAL_MS) {
        return false;
    }

    laser.hitTimestamps.set(brick.id, now);
    const destroyed = damageBrick(brick, 1);

    if (destroyed) {
        laser.hitTimestamps.delete(brick.id);
    }

    return destroyed;
}

function updateMasterVolume(newVolume) {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    brickSoundVolume = clampedVolume;

    const sounds = [menuMusic, seaShanty, smite];
    sounds.forEach(sound => {
        if (sound && typeof sound.setVolume === 'function') {
            sound.setVolume(clampedVolume);
        }
    });

    if (menuTrack && typeof menuTrack.setVolume === 'function') {
        menuTrack.setVolume(clampedVolume);
    }

    if (gameplayTrack && typeof gameplayTrack.setVolume === 'function') {
        gameplayTrack.setVolume(clampedVolume);
    }

    if (gravityWellSound && typeof gravityWellSound.setVolume === 'function') {
        gravityWellSound.setVolume();
    }
}

// START BRICK CLASS

class Brick {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 150;
        this.height = 60;
        this.health = isDebugging ? 1 : 3;
        this.currentBrickImage = brick3Image;
        this.chanceToSpawnBall = isDebugging ? 50 : 8;
        this.powerUp = ((Math.random() * 100) + 1) > (100 - this.chanceToSpawnBall) || false;  // random 8% chance for brick to contain power up
        this.id = Math.floor(Math.random() * Math.floor(Math.random() * Date.now()))
    }

    draw() {
        image(this.currentBrickImage, this.x, this.y, this.width, this.height);
    }

    checkCollision(ball) {
        // Check if the ball is colliding with the brick
        if (collideCircleRect(ball, this)) {
            const gravityActive = isGravityWellActive();
            let brickBottom = this.y + this.height;
            let brickTop = this.y;

            if (ball.y > brickTop && ball.y < brickBottom) {
                ball.xspeed *= -1;
            } else {
                ball.yspeed *= -1;
            }

            if (gravityActive) {
                if (ball.gravityDamageCooldown > 0) {
                    return true;
                }

                const destroyedByGravity = damageBrick(this, 1);
                ball.gravityDamageCooldown = GRAVITY_DAMAGE_INTERVAL_MS;

                if (destroyedByGravity && this.powerUp) {
                    spawnPowerUpFromBrick(this);
                    this.powerUp = false;
                }

                return true;
            }

            const highSpeedImpact = Math.abs(ball.xspeed) > 15;
            const destroyed = damageBrick(this, highSpeedImpact ? this.health : 1);

            if (highSpeedImpact) {
                ball.xspeed += 1;
            }

            if (destroyed && this.powerUp) {
                spawnPowerUpFromBrick(this);
                this.powerUp = false;
            }

            return true;  // Return true to indicate that the brick was hit
        }

        return false;  // Return false to indicate that the brick was not hit
    }
}

// END BRICK CLASS

// START POWER UP CLASS

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.diameter = 35;
        this.type = type;
        this.rotation = 1;
        this.currentPuImage = powerUpExtraBallsImage;
        this.spinAngle = 0;
        this.pulsePhase = 0;

        if (this.type === 'gravity well') {
            this.currentPuImage = null;
        }
    }

    draw() {
        if (this.type === 'gravity well') {
            drawGravityPowerUpIcon(this);
            return;
        }

        // subtracting 16 here to center the png on the hitbox
        if (this.currentPuImage) {
            image(this.currentPuImage, this.x - 16, this.y - 16, this.diameter, this.diameter);
        } else {
            push();
            translate(this.x, this.y);
            noStroke();
            fill(255, 255, 255, 180);
            ellipse(0, 0, this.diameter, this.diameter);
            pop();
        }
    }

    update() {
        this.y += 2;  // Move the power-up down the screen
        if (this.type === 'gravity well') {
            this.spinAngle = (this.spinAngle + 0.12) % (Math.PI * 2);
            this.pulsePhase = (this.pulsePhase + 0.15) % (Math.PI * 2);
            return;
        }

        if (this.rotation > 6) {
            this.rotation = 0;
            return;
        }
        // took me a while to figure this one out, but this helps slow down the rotation of the power ups
        this.rotation = Math.round((this.rotation + 0.20) / 0.20) * 0.20
    }

    checkCollision(paddle) {
        // Check if the ball is colliding with the brick
        if (collideCircleRect(this, paddle)) {
            return true;  // Return true to indicate that the paddle was hit
        }
        return false;  // Return false to indicate that the paddle was not hit
    }
}

// END POWER UP CLASS

// START PADDLE CLASS

class Paddle {
    constructor() {
        this.width = PADDLE_WIDTH;
        this.height = PADDLE_HEIGHT;
        this.x = width / 2 - this.width / 2;
        this.y = PADDLE_Y;
        this.bounceStartTime = null;
        this.bounceDuration = 140; // milliseconds
        this.bounceMagnitude = 12;
        this.scaleMagnitudeX = 0.06;
        this.scaleMagnitudeY = 0.09;
        this.speed = PADDLE_MOVE_SPEED;
    }

    update() {
        let frameTime = typeof deltaTime === 'number' ? deltaTime : 16.67;
        if (!Number.isFinite(frameTime) || frameTime <= 0) {
            frameTime = 16.67;
        }

        const direction = (paddleInputState.right ? 1 : 0) - (paddleInputState.left ? 1 : 0);
        const frameMultiplier = frameTime / (1000 / 60);
        if (direction !== 0) {
            this.x += direction * this.speed * frameMultiplier;
        }

        this.x = clamp(this.x, 0, width - this.width);
    }

    startBounce() {
        this.bounceStartTime = millis();
    }

    draw() {
        let offsetY = 0;
        let scaleX = 1;
        let scaleY = 1;

        if (this.bounceStartTime !== null) {
            const elapsed = millis() - this.bounceStartTime;
            if (elapsed < this.bounceDuration) {
                const progress = elapsed / this.bounceDuration;
                const bounceWave = Math.sin(progress * Math.PI);
                offsetY = bounceWave * this.bounceMagnitude;
                scaleX = 1 + bounceWave * this.scaleMagnitudeX;
                scaleY = 1 - bounceWave * this.scaleMagnitudeY;
            } else {
                this.bounceStartTime = null;
            }
        }

        push();
        translate(this.x + this.width / 2, this.y + this.height / 2 + offsetY);
        scale(scaleX, scaleY);
        imageMode(CENTER);
        image(paddleImage, 0, 0, this.width, this.height);
        imageMode(CORNER);
        pop();
    }
}

// END PADDLE CLASS

// START BALL CLASS

class Ball {
    constructor(x, y, options) {
        if (typeof x === 'object' && x !== null) {
            options = x;
            x = options.x;
            y = options.y;
        }

        options = options || {};

        this.x = typeof x === 'number' ? x : width / 2;
        this.y = typeof y === 'number' ? y : PADDLE_Y - BALL_DIAMETER;
        this.diameter = BALL_DIAMETER;
        this.xspeed = 5;
        this.yspeed = -5;
        this.currentBallImage = ballImage;
        this.id = Math.floor(Math.random() * Math.floor(Math.random() * Date.now()))
        this.bounceStartTime = null;
        this.bounceDuration = 130; // milliseconds
        this.bounceMagnitude = 7;
        this.gravityDamageCooldown = 0;
        this.isTemporary = !!options.isTemporary;
        this.prevX = this.x;
        this.prevY = this.y;
        this.isCaught = false;
        this.caughtOffsetY = 0;
        this.caughtAt = 0;
        this.aimAngle = -Math.PI / 2;
        this.releaseFlashTimer = 0;
    }

    update(dt) {
        if (this.gravityDamageCooldown > 0) {
            this.gravityDamageCooldown = Math.max(0, this.gravityDamageCooldown - dt);
        }

        if (this.releaseFlashTimer > 0) {
            this.releaseFlashTimer = Math.max(0, this.releaseFlashTimer - dt);
        }
    }

    move() {
        this.prevX = this.x;
        this.prevY = this.y;

        if (this.isCaught) {
            return;
        }

        this.x += this.xspeed;
        this.y += this.yspeed;
    }

    speedUp() {
        if (Math.sign(this.x)) {
            this.xspeed += 1;
        } else {
            this.xspeed += 1;
        }
        if (Math.sign(this.y)) {
            this.yspeed += 1;
        } else {
            this.yspeed += -1;
        }
    }

    speedDown() {
        if (Math.sign(this.x)) {
            this.xspeed -= 1;
        } else {
            this.xspeed -= 1;
        }
        if (Math.sign(this.y)) {
            this.yspeed -= 1;
        } else {
            this.yspeed -= -1;
        }
    }

    draw() {
        let offsetY = 0;
        let scaleAmount = 1;

        const gravityActive = isGravityWellActive();

        if (gravityActive) {
            this.bounceStartTime = null;
        } else if (this.bounceStartTime !== null) {
            const elapsed = millis() - this.bounceStartTime;
            if (elapsed < this.bounceDuration) {
                const progress = elapsed / this.bounceDuration;
                const bounceWave = Math.sin(progress * Math.PI);
                offsetY = -bounceWave * this.bounceMagnitude;
                scaleAmount = 1 + bounceWave * 0.12;
            } else {
                this.bounceStartTime = null;
            }
        }

        if (this.isCaught) {
            const catchElapsed = millis() - (this.caughtAt || 0);
            const catchPulse = 1 + 0.08 * Math.sin(catchElapsed / 110);
            scaleAmount *= catchPulse;
        }

        push();
        translate(this.x, this.y + offsetY);
        const renderDiameter = this.diameter * scaleAmount;
        const halfRender = renderDiameter / 2;

        if (gravityActive) {
            push();
            tint(180, 70, 255, 255);
            image(this.currentBallImage, -halfRender, -halfRender, renderDiameter, renderDiameter);
            pop();
        } else {
            image(this.currentBallImage, -halfRender, -halfRender, renderDiameter, renderDiameter);
        }

        if (this.isCaught) {
            const auraElapsed = millis() - (this.caughtAt || 0);
            const auraPulse = 1 + 0.1 * Math.sin(auraElapsed / 100);
            noFill();
            stroke(255, 220, 140, 150 + Math.sin(auraElapsed / 90) * 60);
            strokeWeight(3);
            ellipse(0, 0, renderDiameter * auraPulse * 1.2, renderDiameter * auraPulse * 1.2);
            stroke(255, 255, 220, 130);
            strokeWeight(2);
            ellipse(0, 0, renderDiameter * auraPulse * 0.85, renderDiameter * auraPulse * 0.85);
        }

        if (this.releaseFlashTimer > 0) {
            const flashProgress = this.releaseFlashTimer / CAUGHT_RELEASE_FLASH_DURATION;
            const flashScale = 1 + flashProgress * 1.4;
            const flashAlpha = 200 * flashProgress;
            noStroke();
            fill(255, 190, 130, flashAlpha);
            ellipse(0, 0, renderDiameter * flashScale, renderDiameter * flashScale);
        }

        pop();
    }

    startBounce() {
        if (isGravityWellActive() || this.isCaught) {
            this.bounceStartTime = null;
            return;
        }

        this.bounceStartTime = millis();
    }

    checkCollision(paddle) {
        if (this.isCaught) {
            return 'caught';
        }

        if (!collideCircleRect(this, paddle)) {
            return 'none';
        }

        const ballTop = this.y - this.diameter / 2;
        const ballBottom = this.y + this.diameter / 2;
        const withinVertical = ballBottom > paddle.y && ballTop < paddle.y + paddle.height;

        if (!caughtBall && withinVertical) {
            const cameFromLeft = this.prevX + this.diameter / 2 <= paddle.x;
            const cameFromRight = this.prevX - this.diameter / 2 >= paddle.x + paddle.width;
            const prevTop = this.prevY - this.diameter / 2;
            const cameFromBelow = prevTop >= paddle.y + paddle.height;

            if (cameFromLeft || cameFromRight || cameFromBelow) {
                let side;
                if (cameFromBelow && !cameFromLeft && !cameFromRight) {
                    const distanceToLeft = Math.abs(this.x - paddle.x);
                    const distanceToRight = Math.abs((paddle.x + paddle.width) - this.x);
                    side = distanceToLeft <= distanceToRight ? 'left' : 'right';
                } else {
                    side = cameFromLeft ? 'left' : 'right';
                }

                catchBallOnPaddle(this, paddle, side);
                return 'catch';
            }
        }

        const ballPosition = this.x;
        const paddleCenter = (paddle.width / 2) + paddle.x;
        const ballDistanceFromCenter = Math.abs(ballPosition + 15 - paddleCenter);
        const ballPaddleCollideMultiplier = ballDistanceFromCenter / (paddle.width / 2) * 3;
        smite.play();
        if (ballPosition > paddleCenter) {
            this.xspeed += ballPaddleCollideMultiplier;
        } else {
            this.xspeed -= ballPaddleCollideMultiplier;
        }
        this.startBounce();
        if (typeof paddle.startBounce === 'function') {
            paddle.startBounce();
        }
        return 'bounce';
    }
}

// END BALL CLASS

function collideCircleRect(circle, rect) {
    var distX = Math.abs(circle.x - rect.x - rect.width / 2);
    var distY = Math.abs(circle.y - rect.y - rect.height / 2);

    if (distX > (rect.width / 2 + circle.diameter / 2)) { return false; }
    if (distY > (rect.height / 2 + circle.diameter / 2)) { return false; }

    if (distX <= (rect.width / 2)) { return true; }
    if (distY <= (rect.height / 2)) { return true; }

    var dx = distX - rect.width / 2;
    var dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= ((circle.diameter / 2) * (circle.diameter / 2)));
}

function collideRectRect(rect1, rect2) {
    // are the sides of one rectangle touching the other?
    if (rect1.x + rect1.width >= rect2.x &&    // r1 right edge past r2 left
        rect1.x <= rect2.x + rect2.width &&    // r1 left edge past r2 right
        rect1.y + rect1.height >= rect2.y &&    // r1 top edge past r2 bottom
        rect1.y <= rect2.y + rect2.height) {    // r1 bottom edge past r2 top
        return true;
    }
    return false;
}

function spawnPowerUpFromBrick(brick) {
    const powerUpTypes = ['extra ball', 'laser', 'gravity well'];
    const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    const currentPowerUp = new PowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2, powerUpType);
    powerUps.push(currentPowerUp);
}

function initializeGravityWell() {
    if (gravityWellSound && typeof gravityWellSound.stop === 'function') {
        gravityWellSound.stop();
    }

    gravityWell = {
        active: false,
        x: width / 2,
        y: height * 0.18,
        radius: GRAVITY_WELL_CAPTURE_RADIUS,
        remainingTime: 0,
        particles: [],
        pulse: 0,
        nova: null
    };
}

function activateGravityWell() {
    if (!gravityWell) {
        initializeGravityWell();
    }

    removeTemporaryBalls();

    gravityWell.active = true;
    gravityWell.remainingTime = GRAVITY_WELL_DURATION_MS;
    gravityWell.x = width / 2;
    gravityWell.y = height * 0.18;
    gravityWell.radius = GRAVITY_WELL_CAPTURE_RADIUS;
    gravityWell.pulse = 0;
    gravityWell.particles = createGravityParticles();
    gravityWell.nova = null;

    spawnTemporaryGravityBalls();

    if (gravityWellSound && typeof gravityWellSound.start === 'function') {
        gravityWellSound.start();
    }
}

function spawnTemporaryGravityBalls() {
    if (!paddle || !allBalls) {
        return;
    }

    const spawnCount = 4;
    const originX = paddle.x + paddle.width / 2;
    const originY = paddle.y - BALL_DIAMETER * 0.75;
    const baseAngle = -Math.PI / 2;
    const spread = Math.PI / 2;
    const speed = 8;

    for (let i = 0; i < spawnCount; i++) {
        const angle = spread === 0 ? baseAngle : (baseAngle - spread / 2) + (spread / (spawnCount - 1)) * i;
        const tempBall = new Ball(originX, originY, { isTemporary: true });
        tempBall.xspeed = Math.cos(angle) * speed;
        tempBall.yspeed = Math.sin(angle) * speed;
        allBalls.push(tempBall);
    }
}

function createGravityParticles() {
    const particles = [];
    const count = 40;

    for (let i = 0; i < count; i++) {
        particles.push({
            angle: Math.random() * Math.PI * 2,
            baseRadius: GRAVITY_WELL_CAPTURE_RADIUS * (0.4 + Math.random() * 0.6),
            radialRange: 12 + Math.random() * 24,
            size: 6 + Math.random() * 7,
            angularVelocity: 0.9 + Math.random() * 1.4,
            phase: Math.random() * Math.PI * 2,
            alpha: 150 + Math.random() * 80,
            colorOffset: Math.random() * 60
        });
    }

    return particles;
}

function updateGravityWell() {
    if (!gravityWell) {
        return;
    }

    const dt = typeof deltaTime === 'number' ? deltaTime : 16.67;
    const dtSeconds = dt / 1000;

    if (gravityWell.active) {
        gravityWell.remainingTime -= dt;

        if (gravityWellSound && typeof gravityWellSound.update === 'function') {
            gravityWellSound.update();
        }

        if (gravityWell.remainingTime <= 0) {
            gravityWell.active = false;
            gravityWell.particles = [];
            if (gravityWellSound && typeof gravityWellSound.stop === 'function') {
                gravityWellSound.stop();
            }
            removeTemporaryBalls();
        } else {
            gravityWell.pulse = (gravityWell.pulse + dtSeconds * 3.2) % (Math.PI * 2);
            gravityWell.particles.forEach(particle => {
                particle.angle += particle.angularVelocity * dtSeconds;
            });

            for (const ball of allBalls) {
                applyGravityWellForce(ball, dtSeconds);

                if (!gravityWell || !gravityWell.active) {
                    break;
                }

                const dx = gravityWell.x - ball.x;
                const dy = gravityWell.y - ball.y;
                const distance = Math.hypot(dx, dy);

                if (distance <= gravityWell.radius) {
                    triggerGravityNova(ball);
                    break;
                }
            }
        }
    }

    if (gravityWell && gravityWell.nova) {
        gravityWell.nova.timer -= dt;
        gravityWell.nova.radius += gravityWell.nova.expansionRate * dtSeconds;

        if (gravityWell.nova.timer <= 0) {
            gravityWell.nova = null;
        }
    }
}

function applyGravityWellForce(ball, dtSeconds) {
    if (!gravityWell || !gravityWell.active) {
        return;
    }

    if (ball.isCaught) {
        return;
    }

    const dx = gravityWell.x - ball.x;
    const dy = gravityWell.y - ball.y;
    const distance = Math.hypot(dx, dy) || 0.0001;
    const normalizedX = dx / distance;
    const normalizedY = dy / distance;
    const falloff = Math.max(distance, GRAVITY_WELL_CAPTURE_RADIUS * 0.9);
    const acceleration = (GRAVITY_WELL_PULL_FORCE / falloff) * dtSeconds;

    ball.xspeed += normalizedX * acceleration;
    ball.yspeed += normalizedY * acceleration;

    const maxSpeed = 22;
    const speedMagnitude = Math.hypot(ball.xspeed, ball.yspeed);
    if (speedMagnitude > maxSpeed) {
        const scale = maxSpeed / speedMagnitude;
        ball.xspeed *= scale;
        ball.yspeed *= scale;
    }
}

function triggerGravityNova(ball) {
    if (!gravityWell || !gravityWell.active) {
        return;
    }

    if (ball.isCaught) {
        if (caughtBall === ball) {
            resetCaughtBallState();
        } else {
            ball.isCaught = false;
        }
    }

    gravityWell.active = false;
    gravityWell.remainingTime = 0;
    gravityWell.particles = [];

    if (gravityWellSound && typeof gravityWellSound.stop === 'function') {
        gravityWellSound.stop();
    }

    const novaDuration = 600;
    gravityWell.nova = {
        radius: gravityWell.radius,
        timer: novaDuration,
        duration: novaDuration,
        expansionRate: 420
    };

    destroyNearestBricks({ x: gravityWell.x, y: gravityWell.y }, GRAVITY_NOVA_MAX_BRICKS);

    const burstAngle = (Math.random() * Math.PI / 2) - Math.PI / 4;
    const burstSpeed = 16;
    ball.x = gravityWell.x;
    ball.y = gravityWell.y + gravityWell.radius + ball.diameter / 2 + 10;
    ball.xspeed = Math.sin(burstAngle) * burstSpeed;
    ball.yspeed = Math.abs(Math.cos(burstAngle) * burstSpeed) + 8;
    ball.currentBallImage = ballFullPowerImage;
    ball.isTemporary = false;

    removeTemporaryBalls();
}

function destroyNearestBricks(center, maxCount) {
    if (!bricks.length) {
        return;
    }

    const bricksByDistance = bricks
        .map(brick => ({
            brick,
            dist: Math.hypot(
                center.x - (brick.x + brick.width / 2),
                center.y - (brick.y + brick.height / 2)
            )
        }))
        .sort((a, b) => a.dist - b.dist);

    const targets = bricksByDistance.slice(0, Math.min(maxCount, bricksByDistance.length));

    targets.forEach(target => {
        destroyBrick(target.brick);
    });
}

function destroyBrick(brick) {
    const index = bricks.indexOf(brick);
    if (index === -1) {
        return;
    }

    if (brick.powerUp) {
        spawnPowerUpFromBrick(brick);
        brick.powerUp = false;
    }

    bricks.splice(index, 1);
    recordBrickDestroyed();
}

function drawGravityWell() {
    if (!gravityWell || (!gravityWell.active && !gravityWell.nova)) {
        return;
    }

    push();
    translate(gravityWell.x, gravityWell.y);

    if (gravityWell.active) {
        const pulsate = 1 + 0.08 * Math.sin(gravityWell.pulse || 0);
        const outerRadius = gravityWell.radius * 2.2 * pulsate;
        const innerRadius = gravityWell.radius * 1.4;

        noStroke();
        fill(20, 20, 40, 160);
        ellipse(0, 0, outerRadius, outerRadius);

        fill(0, 0, 0, 220);
        ellipse(0, 0, innerRadius, innerRadius);

        gravityWell.particles.forEach(particle => {
            const radius = particle.baseRadius + Math.sin((gravityWell.pulse || 0) + particle.phase) * particle.radialRange;
            const x = Math.cos(particle.angle) * radius;
            const y = Math.sin(particle.angle) * radius;
            const color = 150 + particle.colorOffset;
            fill(80, 80, color, particle.alpha);
            ellipse(x, y, particle.size, particle.size);
        });
    }

    if (gravityWell.nova) {
        const progress = Math.max(gravityWell.nova.timer, 0) / gravityWell.nova.duration;
        const radius = gravityWell.nova.radius;
        noFill();
        stroke(255, 220, 160, 180 * progress);
        strokeWeight(6);
        ellipse(0, 0, radius * 2.2, radius * 2.2);

        noStroke();
        fill(255, 180, 80, 140 * progress);
        ellipse(0, 0, radius * 1.2, radius * 1.2);
    }

    pop();
}

function drawGravityPowerUpIcon(powerUp) {
    push();
    translate(powerUp.x, powerUp.y);
    rotate(powerUp.spinAngle || 0);
    noStroke();

    const pulseScale = 1 + 0.12 * Math.sin(powerUp.pulsePhase || 0);
    const baseSize = powerUp.diameter * 0.9 * pulseScale;

    fill(30, 30, 50, 200);
    ellipse(0, 0, baseSize, baseSize);

    fill(0, 0, 0, 220);
    ellipse(0, 0, baseSize * 0.6, baseSize * 0.6);

    for (let i = 0; i < 3; i++) {
        const armAlpha = 140 - i * 30;
        fill(120, 120, 255, armAlpha);
        ellipse(baseSize * 0.35, 0, baseSize * 0.4, baseSize * 0.18);
        rotate(Math.PI * 2 / 3);
    }

    pop();
}

function setup() {
    // Initialize the start and end points of the laser
    laser = {
        charges: 0,
        isFiring: false,
        width: LASER_BEAM_WIDTH,
        height: 0,
        x: 0,
        y: 0,
        frameIndex: 0,
        frameTimer: 0,
        holdTimer: 0,
        hitTimestamps: new Map()
    }
    noStroke();
    createCanvas(1920, 1080);
    background(backgroundImage, 1000)

    initializeBrickHitSounds();
    initializePowerUpCatchSound();
    initializeGravityWellSound();
    initializePaddleCatchSounds();
    initializeChiptuneMusic();

    initializeMenuDomUi();
    updateMasterVolume(brickSoundVolume);

    // Start with the menu displayed
    startMenuMusic();
    initializeMenuParticles();
    resetPaddleInputState();
}

// Initializes or resets game entities and enters the playing state
function startGame() {
    bricks = [];
    allBalls = [];
    powerUps = [];
    powerUpCatchEffects = [];
    resetCaughtBallState();
    resetPaddleInputState();
    laser.charges = 0;
    laser.isFiring = false;
    laser.height = 0;
    laser.frameIndex = 0;
    laser.frameTimer = 0;
    laser.holdTimer = 0;
    if (laser.hitTimestamps) {
        laser.hitTimestamps.clear();
    }
    initializeGravityWell();

    for (let i = 0; i < BRICK_COLS; i++) {
        for (let j = 0; j < BRICK_ROWS; j++) {
            const brick = new Brick(200 + i * 155, j * 65);
            bricks.push(brick);
        }
    }

    paddle = new Paddle();
    paddle.update();

    allBalls.push(new Ball());
    if (menuTrack && typeof menuTrack.stop === 'function') {
        menuTrack.stop();
    }
    if (menuMusic && typeof menuMusic.stop === 'function') {
        menuMusic.stop();
    }
    startGameplayMusic();
    gameState = GAME_STATES.PLAYING;
    sessionStats = createSessionStats();
    syncMenuUi();
    paused = false;
    loop();
}

function keyPressed() {
    updatePaddleMovementFromKey(keyCode, key, true);

    if (gameState === GAME_STATES.TITLE && keyCode === ENTER) {
        smite.play();
        startGame();
        return;
    }

    if (gameState === GAME_STATES.PLAYING && key === ' ') {  // Toggle pause with spacebar
        paused = !paused;
        if (paused) {
            stopGameplayMusic();
            noLoop();
        } else {
            startGameplayMusic();
            loop();
        }
    }

    if (gameState === GAME_STATES.GAME_OVER || gameState === GAME_STATES.VICTORY) {
        if (keyCode === ENTER) {
            smite.play();
            startGame();
            return;
        }

        if (key === 'm' || key === 'M') {
            smite.play();
            goToTitleScreen();
        }
    }
}

function keyReleased() {
    updatePaddleMovementFromKey(keyCode, key, false);
}

function mousePressed() {
    if (mouseButton === LEFT) {
        if (caughtBall && caughtBall.isCaught) {
            fireCaughtBall();
        } else {
            attemptLaserFire();
        }
    }
}

function draw() {
    updateMusicSequencers();

    if (gameState === GAME_STATES.TITLE) {
        ensureMenuMusicPlaying();
        syncMenuUi();
        clear();
        return;
    }

    if (gameState === GAME_STATES.GAME_OVER || gameState === GAME_STATES.VICTORY) {
        ensureMenuMusicPlaying();
        syncMenuUi();
        clear();
        fill(255, 255, 255, 35);
        rect(0, 0, width, height);
        return;
    }

    if (gameState !== GAME_STATES.PLAYING) {
        return;
    }

    syncMenuUi();
    background(backgroundImage);

    if (paddle && typeof paddle.update === 'function') {
        paddle.update();
    }

    updateLaserState();
    updateGravityWell();
    updateCaughtBallState();

    fill(0, 0, 0, 100);

    // Draw bricks
    for (let i = bricks.length - 1; i >= 0; i--) {
        const brick = bricks[i];
        let shouldRemove = false;

        if (laser.isFiring && collideRectRect(laser, brick)) {
            const destroyedByLaser = applyLaserDamageToBrick(brick);
            if (destroyedByLaser) {
                shouldRemove = true;
            }
        }

        if (!shouldRemove) {
            for (const ball of allBalls) {
                if (!brick.checkCollision(ball)) {
                    continue;
                }

                if (brick.health <= 0) {
                    shouldRemove = true;
                    break;
                }
            }
        }

        if (shouldRemove) {
            if (brick.powerUp) {
                spawnPowerUpFromBrick(brick);
                brick.powerUp = false;
            }
            if (laser.hitTimestamps) {
                laser.hitTimestamps.delete(brick.id);
            }
            bricks.splice(i, 1);
            recordBrickDestroyed();
            continue;
        }

        brick.draw();
        isDebugging && debug(brick);
    }

    drawLaser();
    drawGravityWell();
    drawLaserHUD();

    // Draw Power Ups
    powerUps.forEach(pu => {
        if (pu.type === 'laser') {
            if (pu.rotation === 1) {
                pu.currentPuImage = powerUpLaserImage;
            }
            if (pu.rotation === 2) {
                pu.currentPuImage = powerUpLaserImage2;
            }
            if (pu.rotation === 3) {
                pu.currentPuImage = powerUpLaserImage3;
            }
            if (pu.rotation === 4) {
                pu.currentPuImage = powerUpLaserImage4;
            }
            if (pu.rotation === 5) {
                pu.currentPuImage = powerUpLaserImage5;
            }
            if (pu.rotation === 6) {
                pu.currentPuImage = powerUpLaserImage6;
            }
        } else if (pu.type === 'extra ball') {
            if (pu.rotation === 1) {
                pu.currentPuImage = powerUpExtraBallsImage;
            }
            if (pu.rotation === 2) {
                pu.currentPuImage = powerUpExtraBallsImage2;
            }
            if (pu.rotation === 3) {
                pu.currentPuImage = powerUpExtraBallsImage3;
            }
            if (pu.rotation === 4) {
                pu.currentPuImage = powerUpExtraBallsImage4;
            }
            if (pu.rotation === 5) {
                pu.currentPuImage = powerUpExtraBallsImage5;
            }
            if (pu.rotation === 6) {
                pu.currentPuImage = powerUpExtraBallsImage6;
            }
        } else if (pu.type === 'gravity well') {
            pu.currentPuImage = null;
        }

        if (pu.checkCollision(paddle)) {
            triggerPowerUpCatchFeedback(pu);
            recordPowerUpCollected();
            if (pu.type === 'extra ball') {
                const extraBall = new Ball(pu.x, pu.y - 10);
                //random speed and direction for extra ball
                extraBall.xspeed = Math.random() * (Math.round(Math.random()) ? 1 : -1);
                allBalls.push(extraBall);
            } else if (pu.type === 'laser') {
                laser.charges += LASER_SHOTS_PER_PICKUP;
                laser.isFiring = false;
                laser.height = 0;
                laser.frameIndex = 0;
                laser.frameTimer = 0;
                laser.holdTimer = 0;
            } else if (pu.type === 'gravity well') {
                activateGravityWell();
            }

            let temp = powerUps.filter(item => {
                return item != pu;
            })
            powerUps = temp;
            return;
        };
        pu.draw();
        pu.update();
        isDebugging && debug(pu);
    })

    // Draw paddle
    fill(0);
    if (typeof paddle.draw === 'function') {
        paddle.draw();
    } else {
        image(paddleImage, paddle.x, paddle.y, paddle.width, paddle.height);
    }
    isDebugging && debug(paddle);

    // Draw balls
    allBalls.forEach(ball => {
        if (ball.xspeed > 15) ball.currentBallImage = ballFullPowerImage
        ball.draw();
        isDebugging && debug(ball);
    })

    drawPowerUpCatchEffects();
    drawCaughtBallAimingGuide();

    const dtForBalls = typeof deltaTime === 'number' ? deltaTime : 16.67;
    allBalls.forEach(ball => {
        if (typeof ball.update === 'function') {
            ball.update(dtForBalls);
        }
    });

    // Move balls
    allBalls.forEach(ball => {
        ball.move();
    })

    // Check for ball collision with walls
    allBalls.forEach(ball => {
        if (ball.isCaught) {
            return;
        }
        if (ball.x > width || ball.x < 0) {
            ball.xspeed *= -1;
        }
        if (ball.y < 0) {
            ball.yspeed *= -1;
        }
        if (ball.y > height) {
            if (caughtBall === ball) {
                resetCaughtBallState();
            }
            const temp = allBalls.filter(tempBall => {
                return tempBall.id !== ball.id
            })
            allBalls = temp;
        }
    })

    // Check for paddle collision with ball
    allBalls.forEach(ball => {
        const collisionResult = ball.checkCollision(paddle);
        if (collisionResult === 'bounce') {
            ball.yspeed *= -1;
        }
    })

    // Game over
    if (!allBalls.length) {
        endCurrentSession(GAME_STATES.GAME_OVER, 'defeat');
        return;
    }

    if (!bricks.length) {
        endCurrentSession(GAME_STATES.VICTORY, 'victory');
        return;
    }

    if (paused) {
        push();
        noStroke();
        fill(255, 255, 255, 255);
        rect(0, 0, width, height);
        fill(142, 209, 255, 220);
        rect(0, 0, width, height);
        drawBubblePanel(width / 2 - 300, height / 2 - 170, 600, 340, color(114, 195, 255));
        textAlign(CENTER, CENTER);
        textSize(76);
        fill(44, 98, 162);
        text('Paused', width / 2, height / 2 - 36);
        textSize(28);
        fill(72, 120, 177);
        text('Press SPACE to jump back in!', width / 2, height / 2 + 30);
        pop();
    }
}

function attemptLaserFire() {
    if (gameState !== GAME_STATES.PLAYING || paused || !paddle) {
        return;
    }

    if (laser.charges <= 0 || laser.isFiring) {
        return;
    }

    laser.isFiring = true;
    laser.charges -= 1;
    laser.height = 0;
    laser.frameIndex = 0;
    laser.frameTimer = 0;
    laser.holdTimer = LASER_PERSISTENCE_MS;
    laser.width = LASER_BEAM_WIDTH;
    const paddleCenterX = paddle.x + PADDLE_WIDTH / 2;
    laser.x = paddleCenterX - laser.width / 2;
    laser.y = paddle.y;
    smite.play();
}

function updateLaserState() {
    if (!laser.isFiring) {
        laser.height = 0;
        if (laser.hitTimestamps && typeof laser.hitTimestamps.clear === 'function') {
            laser.hitTimestamps.clear();
        }
        return;
    }

    if (!paddle) {
        return;
    }

    const maxHeight = paddle.y;
    const growth = LASER_GROWTH_RATE * (deltaTime / 1000);
    laser.height = Math.min(laser.height + growth, maxHeight);
    laser.width = LASER_BEAM_WIDTH;
    const paddleCenterX = paddle.x + PADDLE_WIDTH / 2;
    laser.x = paddleCenterX - laser.width / 2;
    laser.y = paddle.y - laser.height;

    if (laserFrames.length) {
        laser.frameTimer += deltaTime;
        if (laser.frameTimer >= LASER_FRAME_DURATION_MS) {
            laser.frameTimer = 0;
            laser.frameIndex = (laser.frameIndex + 1) % laserFrames.length;
        }
    }

    if (laser.height >= maxHeight) {
        laser.holdTimer -= deltaTime;
        if (laser.holdTimer <= 0) {
            laser.isFiring = false;
            laser.height = 0;
            laser.holdTimer = 0;
        }
    }
}

function drawLaser() {
    if (!laser.isFiring || !paddle) {
        return;
    }

    push();
    noStroke();
    fill(255, 120, 0, 90);
    const coreWidth = laser.width * 0.35;
    const coreX = laser.x + (laser.width - coreWidth) / 2;
    rect(coreX, laser.y, coreWidth, laser.height);
    pop();

    const frame = laserFrames.length ? laserFrames[laser.frameIndex % laserFrames.length] : null;
    if (frame) {
        image(frame, laser.x, laser.y, laser.width, laser.height);
        const baseHeight = Math.min(160, paddle.height * 2.5);
        image(frame, laser.x, paddle.y - baseHeight, laser.width, baseHeight);
    } else {
        push();
        noStroke();
        fill(255, 180, 0, 140);
        rect(laser.x, laser.y, laser.width, laser.height);
        pop();
    }
}

function drawLaserHUD() {
    if (gameState !== GAME_STATES.PLAYING) {
        return;
    }

    const shouldShowCharges = laser.charges > 0 || laser.isFiring;
    if (!shouldShowCharges) {
        return;
    }

    push();
    noStroke();
    fill(255, 255, 255, 200);
    rect(24, 22, 290, 150, 28);
    fill(255, 255, 255, 105);
    rect(38, 32, 160, 24, 16);

    textAlign(LEFT, TOP);
    textSize(26);
    fill(56, 112, 178);
    text('Laser Bubbles', 40, 40);

    const iconHeight = 50;
    const iconWidth = 20;
    for (let i = 0; i < laser.charges; i++) {
        const iconX = 40 + i * (iconWidth + 12);
        const iconY = 82;
        if (laserFrames.length) {
            const frame = laserFrames[i % laserFrames.length];
            image(frame, iconX, iconY, iconWidth, iconHeight);
        } else {
            fill(255, 160, 0, 160);
            rect(iconX, iconY, iconWidth, iconHeight, 8);
        }
    }

    if (laser.isFiring) {
        fill(255, 157, 58);
        textSize(22);
        text('ZAP!', 40, 84 + iconHeight + 8);
    }

    pop();
}

const debug = (shape) => {
    // Save the current drawing style and matrix
    push();
    // Set the drawing style for the overlay
    fill(255, 0, 0, 100);
    stroke(0);
    strokeWeight(2);
    if (shape.diameter) {
        ellipse(shape.x, shape.y, shape.diameter, shape.diameter)
    } else {
        rect(shape.x, shape.y, shape.width, shape.height);
    }
    // Restore the original drawing style and matrix
    pop();
}


function initializeMenuDomUi() {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.getElementById('menu-ui');
    if (!root) {
        return;
    }

    menuUiElements = {
        root,
        titlePanel: document.getElementById('menu-title-panel'),
        endPanel: document.getElementById('menu-end-panel'),
        endTitle: document.getElementById('menu-end-title'),
        endSubtitle: document.getElementById('menu-end-subtitle'),
        summary: document.getElementById('menu-summary'),
        startButton: document.getElementById('menu-start-button'),
        retryButton: document.getElementById('menu-retry-button'),
        mainMenuButton: document.getElementById('menu-main-button'),
        volumeRange: document.getElementById('menu-volume-range')
    };

    if (menuUiElements.startButton) {
        menuUiElements.startButton.addEventListener('click', () => {
            if (gameState === GAME_STATES.TITLE) {
                smite && typeof smite.play === 'function' && smite.play();
                startGame();
            }
        });
    }

    if (menuUiElements.retryButton) {
        menuUiElements.retryButton.addEventListener('click', () => {
            if (gameState === GAME_STATES.GAME_OVER || gameState === GAME_STATES.VICTORY) {
                smite && typeof smite.play === 'function' && smite.play();
                startGame();
            }
        });
    }

    if (menuUiElements.mainMenuButton) {
        menuUiElements.mainMenuButton.addEventListener('click', () => {
            smite && typeof smite.play === 'function' && smite.play();
            goToTitleScreen();
        });
    }

    if (menuUiElements.volumeRange) {
        menuUiElements.volumeRange.value = String(brickSoundVolume);
        menuUiElements.volumeRange.addEventListener('input', event => {
            const sliderValue = parseFloat(event.target.value);
            if (!isNaN(sliderValue)) {
                updateMasterVolume(sliderValue);
            }
        });
    }

    syncMenuUi();
}

function syncMenuUi() {
    if (!menuUiElements || typeof document === 'undefined') {
        return;
    }

    const isTitle = gameState === GAME_STATES.TITLE;
    const isEnd = gameState === GAME_STATES.GAME_OVER || gameState === GAME_STATES.VICTORY;

    menuUiElements.root.classList.toggle('visible', isTitle || isEnd);
    menuUiElements.root.classList.toggle('end-state', isEnd);

    if (menuUiElements.titlePanel) {
        menuUiElements.titlePanel.classList.toggle('hidden', !isTitle);
    }

    if (menuUiElements.endPanel) {
        menuUiElements.endPanel.classList.toggle('hidden', !isEnd);
    }

    if (isEnd && menuUiElements.endTitle && menuUiElements.endSubtitle) {
        const won = gameState === GAME_STATES.VICTORY;
        menuUiElements.endTitle.textContent = won ? 'Course Cleared!' : 'Cloudy Crash!';
        menuUiElements.endSubtitle.textContent = won
            ? 'You bounced through every block in style.'
            : 'You got close — jump back in for another run.';

        const summary = buildSummaryFromSession(sessionStats) || lastSessionSummary;
        if (menuUiElements.summary) {
            if (summary) {
                menuUiElements.summary.innerHTML = `
                    <li><strong>Bricks shattered:</strong> ${summary.bricksDestroyed}</li>
                    <li><strong>Power-ups collected:</strong> ${summary.powerUpsCollected}</li>
                    <li><strong>Time in arena:</strong> ${formatDuration(summary.durationMs)}</li>
                `;
            } else {
                menuUiElements.summary.innerHTML = '<li>Play a round to track your stats!</li>';
            }
        }
    }

    if (window.MenuScene && typeof window.MenuScene.setActive === 'function') {
        window.MenuScene.setActive(isTitle || isEnd);
        const theme = gameState === GAME_STATES.VICTORY ? 'victory' : gameState === GAME_STATES.GAME_OVER ? 'defeat' : 'title';
        window.MenuScene.setTheme(theme);
    }
}

function ensureMenuMusicPlaying() {
    if (menuTrack && typeof menuTrack.start === 'function') {
        if (!menuTrack.playing) {
            menuTrack.start();
        }
        return;
    }

    if (!menuMusic || typeof menuMusic.isPlaying !== 'function') {
        return;
    }

    if (!menuMusic.isPlaying()) {
        if (typeof menuMusic.setLoop === 'function') {
            menuMusic.setLoop(true);
        }
        menuMusic.play();
    }
}

function initializeMenuParticles() {
    if (typeof width === 'undefined' || typeof height === 'undefined') {
        return;
    }

    menuParticles = [];
    for (let i = 0; i < MENU_PARTICLE_COUNT; i++) {
        menuParticles.push(createMenuParticle());
    }
}

function createMenuParticle() {
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 18 + 12,
        speed: Math.random() * 32 + 18,
        drift: Math.random() * 45 + 22,
        wobble: Math.random() * 0.9 + 0.35,
        offset: Math.random() * Math.PI * 2,
        colorShift: Math.random() * 70 - 25
    };
}

function updateMenuParticles(accentColor) {
    if (!menuParticles.length) {
        initializeMenuParticles();
    }

    const dt = Math.min(deltaTime, 1000) / 1000;
    const baseR = red(accentColor);
    const baseG = green(accentColor);
    const baseB = blue(accentColor);

    menuParticles.forEach(particle => {
        particle.y += particle.speed * dt;
        const wobbleOffset = Math.sin(frameCount * 0.013 * particle.wobble + particle.offset) * particle.drift;
        particle.x += wobbleOffset * dt;

        if (particle.y - particle.radius > height + 120) {
            particle.y = -particle.radius - Math.random() * 180;
            particle.x = Math.random() * width;
        }

        const pulse = (Math.sin(frameCount * 0.035 + particle.offset) + 1) / 2;
        const alpha = 70 + pulse * 115;
        const tintShift = particle.colorShift;
        const r = constrain(baseR + 30 + tintShift * 0.3, 0, 255);
        const g = constrain(baseG + 35 + tintShift * 0.25, 0, 255);
        const b = constrain(baseB + 55 + tintShift * 0.35, 0, 255);

        noStroke();
        fill(r, g, b, alpha * 0.7);
        ellipse(particle.x, particle.y, particle.radius * 2, particle.radius * 1.2);

        fill(255, 255, 255, alpha * 0.65);
        ellipse(particle.x - particle.radius * 0.22, particle.y - particle.radius * 0.2, particle.radius * 0.58, particle.radius * 0.4);
        fill(r, g, b, alpha * 0.35);
        ellipse(particle.x + particle.radius * 0.16, particle.y + particle.radius * 0.09, particle.radius * 0.94, particle.radius * 0.6);
    });
}

function drawCloudPuff(x, y, size, alpha = 255) {
    noStroke();
    fill(255, 255, 255, alpha);
    ellipse(x - size * 0.45, y + size * 0.05, size * 0.75, size * 0.58);
    ellipse(x, y - size * 0.1, size * 0.95, size * 0.65);
    ellipse(x + size * 0.45, y + size * 0.03, size * 0.72, size * 0.55);
}

function drawBubblePanel(x, y, panelWidth, panelHeight, accentColor) {
    const accentR = red(accentColor);
    const accentG = green(accentColor);
    const accentB = blue(accentColor);

    push();
    noStroke();
    for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const bubbleColor = lerpColor(color(255, 255, 255, 225), color(accentR, accentG, accentB, 80), t);
        fill(bubbleColor);
        const pad = i * 7;
        rect(x + pad, y + pad, panelWidth - pad * 2, panelHeight - pad * 2, 52 - i * 4);
    }

    fill(255, 255, 255, 92);
    rect(x + 26, y + 22, panelWidth * 0.48, 38, 22);

    stroke(accentR, accentG, accentB, 170);
    strokeWeight(4);
    noFill();
    rect(x - 7, y - 7, panelWidth + 14, panelHeight + 14, 56);

    noStroke();
    for (let i = 0; i < 7; i++) {
        const orbit = (frameCount * 0.02 + i * 0.85);
        const bubbleX = x + panelWidth - 42 - i * 24 + Math.sin(orbit) * 6;
        const bubbleY = y + 30 + i * 18 + Math.cos(orbit * 1.3) * 8;
        fill(255, 255, 255, 150 - i * 12);
        ellipse(bubbleX, bubbleY, 14 - i * 0.9, 14 - i * 0.9);
    }

    pop();
}

function drawMenuBackdrop(accentColor) {
    background(128, 198, 255);

    push();
    noStroke();
    for (let i = 0; i < 5; i++) {
        const y = (height / 4) * i;
        const wave = Math.sin(frameCount * 0.01 + i) * 22;
        const skyTone = lerpColor(color(195, 232, 255, 170), color(red(accentColor), green(accentColor), blue(accentColor), 145), i / 4);
        fill(skyTone);
        rect(0, y + wave, width, height / 4 + 60);
    }
    pop();

    if (backgroundImage) {
        push();
        tint(255, 18);
        image(backgroundImage, 0, 0, width, height);
        pop();
    }

    updateMenuParticles(accentColor);

    push();
    const cloudDrift = frameCount * 0.8;
    drawCloudPuff(width * 0.13 + Math.sin(cloudDrift * 0.01) * 12, height * 0.14, 180, 170);
    drawCloudPuff(width * 0.76 + Math.sin(cloudDrift * 0.008 + 1.7) * 14, height * 0.2, 220, 165);
    drawCloudPuff(width * 0.57 + Math.sin(cloudDrift * 0.006 + 0.4) * 17, height * 0.1, 160, 150);
    drawCloudPuff(width * 0.25 + Math.sin(cloudDrift * 0.007 + 2.4) * 10, height * 0.86, 150, 125);
    pop();
}

function drawTitleScreen() {
    const accent = color(110, 180, 255);
    drawMenuBackdrop(accent);

    const panelWidth = width * 0.55;
    const panelHeight = height * 0.52;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2 + 60;

    drawBubblePanel(panelX, panelY, panelWidth, panelHeight, accent);

    push();
    textAlign(CENTER, CENTER);
    textSize(96);
    fill(255);
    text('Breakout Blast', width / 2, panelY - 148);
    textSize(34);
    fill(252, 242, 181);
    text('Bounce into a bubbly sky adventure!', width / 2, panelY - 84);
    pop();

    const infoX = panelX + 60;
    const infoY = panelY + 70;
    push();
    textAlign(LEFT, TOP);
    textSize(26);
    fill(255);
    text('How to Play', infoX, infoY);
    textSize(18);
    fill(225);
    const briefingLines = [
        '• Scoot with A/D or ←/→ and keep the ball hopping happily.',
        '• Catch power bubbles for extra balls, laser zaps, and gravity tricks.',
        '• Click to blast charged lasers and clear rows with style.'
    ];
    for (let i = 0; i < briefingLines.length; i++) {
        text(briefingLines[i], infoX, infoY + 40 + i * 28);
    }
    pop();

    if (menuGif) {
        const gifWidth = Math.min(menuGif.width * 0.75, panelWidth / 2.5);
        const gifHeight = gifWidth * (menuGif.height / menuGif.width);
        const gifX = panelX + panelWidth - gifWidth - 60;
        const gifY = panelY + 70;
        push();
        image(menuGif, gifX, gifY, gifWidth, gifHeight);
        stroke(red(accent), green(accent), blue(accent), 140);
        strokeWeight(2);
        noFill();
        rect(gifX - 6, gifY - 6, gifWidth + 12, gifHeight + 12, 18);
        pop();
    }

    if (lastSessionSummary) {
        drawLastRunSummary(panelX + panelWidth - 280, panelY + panelHeight - 160);
    }

    const calloutY = panelY + panelHeight - 70;
    const pulse = (Math.sin(frameCount * 0.08) + 1) / 2;
    const calloutAlpha = 150 + 90 * pulse;
    push();
    textAlign(CENTER, CENTER);
    textSize(38);
    fill(red(accent), green(accent), blue(accent), calloutAlpha);
    text('Press ENTER to Start!', width / 2, calloutY);
    textSize(20);
    fill(235);
    text('A/D or ←/→ move · Space pause · Click fire lasers · Slider controls volume', width / 2, calloutY + 40);
    pop();
}

function drawLastRunSummary(x, y) {
    const summary = lastSessionSummary;
    if (!summary) {
        return;
    }

    const accent = summary.result === 'victory' ? color(120, 220, 180) : color(255, 120, 150);
    const label = summary.result === 'victory' ? 'Last Run: Victory' : 'Last Run: Defeat';
    const durationLabel = formatDuration(summary.durationMs);

    push();
    noStroke();
    fill(255, 255, 255, 205);
    rect(x - 30, y - 20, 260, 150, 24);
    stroke(red(accent), green(accent), blue(accent), 150);
    strokeWeight(2);
    noFill();
    rect(x - 34, y - 24, 268, 158, 22);
    textAlign(LEFT, TOP);
    textSize(20);
    fill(255);
    text(label, x - 10, y - 8);
    textSize(16);
    fill(220);
    text(`Bricks shattered: ${summary.bricksDestroyed}`, x - 10, y + 28);
    text(`Power-ups secured: ${summary.powerUpsCollected}`, x - 10, y + 52);
    text(`Time in arena: ${durationLabel}`, x - 10, y + 76);
    pop();
}

function drawEndScreen(state) {
    const isVictory = state === GAME_STATES.VICTORY;
    const accent = isVictory ? color(120, 220, 170) : color(255, 120, 150);
    drawMenuBackdrop(accent);

    const panelWidth = width * 0.5;
    const panelHeight = height * 0.46;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2 + 40;

    drawBubblePanel(panelX, panelY, panelWidth, panelHeight, accent);

    const title = isVictory ? 'Course Cleared!' : 'Oops! Try Again!';
    const subtitle = isVictory ? 'You bounced your way through the clouds.' : 'The clouds got stormy — but you can bounce back!';
    push();
    textAlign(CENTER, CENTER);
    textSize(82);
    fill(255);
    text(title, width / 2, panelY - 90);
    textSize(26);
    fill(220);
    text(subtitle, width / 2, panelY - 40);
    pop();

    const summary = buildSummaryFromSession(sessionStats) || lastSessionSummary;
    if (summary) {
        const statsX = panelX + 60;
        const statsY = panelY + 70;
        push();
        textAlign(LEFT, TOP);
        textSize(26);
        fill(255);
        text('Round Summary', statsX, statsY);
        textSize(18);
        fill(225);
        const lines = [
            `Bricks shattered: ${summary.bricksDestroyed}`,
            `Power-ups secured: ${summary.powerUpsCollected}`,
            `Time in arena: ${formatDuration(summary.durationMs)}`
        ];
        for (let i = 0; i < lines.length; i++) {
            text(lines[i], statsX, statsY + 40 + i * 28);
        }

        const flavor = isVictory ? 'Sparkly work, sky champion!' : "One more hop and you'll clear it!";
        text(flavor, statsX, statsY + 140);
        pop();
    }

    const promptY = panelY + panelHeight - 70;
    const pulse = (Math.sin(frameCount * 0.12) + 1) / 2;
    const alpha = 150 + 90 * pulse;
    push();
    textAlign(CENTER, CENTER);
    textSize(34);
    fill(red(accent), green(accent), blue(accent), alpha);
    text('Press ENTER to Play Again', width / 2, promptY);
    textSize(20);
    fill(235);
    text('Press M for Main Menu', width / 2, promptY + 40);
    pop();
}

function createSessionStats() {
    return {
        bricksDestroyed: 0,
        powerUpsCollected: 0,
        startedAt: millis(),
        endedAt: null,
        result: null
    };
}

function buildSummaryFromSession(stats) {
    if (!stats) {
        return null;
    }

    const start = typeof stats.startedAt === 'number' ? stats.startedAt : millis();
    const end = typeof stats.endedAt === 'number' ? stats.endedAt : millis();
    return {
        result: stats.result || null,
        bricksDestroyed: stats.bricksDestroyed || 0,
        powerUpsCollected: stats.powerUpsCollected || 0,
        durationMs: Math.max(0, end - start)
    };
}

function finalizeSession(resultLabel) {
    if (!sessionStats) {
        return;
    }

    if (sessionStats.endedAt === null) {
        sessionStats.endedAt = millis();
    }

    if (resultLabel && !sessionStats.result) {
        sessionStats.result = resultLabel;
    }

    lastSessionSummary = buildSummaryFromSession(sessionStats);
    if (lastSessionSummary && !lastSessionSummary.result) {
        lastSessionSummary.result = resultLabel || 'defeat';
    }
}

function formatDuration(durationMs) {
    if (!durationMs || durationMs <= 0) {
        return '0s';
    }

    const totalSeconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) {
        return `${seconds}s`;
    }

    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function endCurrentSession(nextState, resultLabel) {
    stopGameplayMusic();

    if (gravityWellSound && typeof gravityWellSound.stop === 'function') {
        gravityWellSound.stop();
    }

    resetCaughtBallState();
    ensureMenuMusicPlaying();
    finalizeSession(resultLabel);
    gameState = nextState;
    paused = false;
    syncMenuUi();
    loop();
}

function goToTitleScreen() {
    stopGameplayMusic();

    ensureMenuMusicPlaying();
    bricks = [];
    allBalls = [];
    powerUps = [];
    powerUpCatchEffects = [];
    resetCaughtBallState();
    resetPaddleInputState();
    gravityWell = null;
    if (gravityWellSound && typeof gravityWellSound.stop === 'function') {
        gravityWellSound.stop();
    }
    if (laser) {
        laser.isFiring = false;
        laser.height = 0;
        laser.holdTimer = 0;
    }

    sessionStats = null;
    gameState = GAME_STATES.TITLE;
    paused = false;
    syncMenuUi();
    initializeMenuParticles();
    loop();
}

function recordBrickDestroyed() {
    if (sessionStats) {
        sessionStats.bricksDestroyed += 1;
    }
}

function recordPowerUpCollected() {
    if (sessionStats) {
        sessionStats.powerUpsCollected += 1;
    }
}
