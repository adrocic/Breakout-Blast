// Constants
const BRICK_COLS = 10;
const BRICK_ROWS = 10;

const PADDLE_WIDTH = 250;
const PADDLE_HEIGHT = 50;
const PADDLE_Y = 1000;

const BALL_DIAMETER = 38;
const LASER_BEAM_WIDTH = 120;
const LASER_GROWTH_RATE = 4200;
const LASER_FRAME_DURATION_MS = 70;
const LASER_PERSISTENCE_MS = 150;
const LASER_DAMAGE_INTERVAL_MS = 100;
const LASER_SHOTS_PER_PICKUP = 3;

const GRAVITY_WELL_DURATION_MS = 20000;
const GRAVITY_WELL_PULL_FORCE = 14400;
const GRAVITY_WELL_CAPTURE_RADIUS = 140;
const GRAVITY_DAMAGE_INTERVAL_MS = 1000;
const GRAVITY_NOVA_MAX_BRICKS = 4;

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
let allBalls = [];
let powerUps = [];
let gameOver = false;
let paused = false;
let isDebugging = false;
let gravityWell;
let gravityWellSound;

function removeTemporaryBalls() {
    if (!allBalls.length) {
        return;
    }

    allBalls = allBalls.filter(ball => !ball.isTemporary);
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

let brickHitSoundPlayers = [];
let brickSoundVolume = 1;
let masterVolumeSlider;
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
    }

    update() {
        this.x = constrain(mouseX - this.width / 2, 0, width - this.width);
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
    }

    update(dt) {
        if (this.gravityDamageCooldown > 0) {
            this.gravityDamageCooldown = Math.max(0, this.gravityDamageCooldown - dt);
        }
    }

    move() {
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

        pop();
    }

    startBounce() {
        if (isGravityWellActive()) {
            this.bounceStartTime = null;
            return;
        }

        this.bounceStartTime = millis();
    }

    checkCollision(paddle) {
        // Check if the ball is colliding with the paddle
        if (collideCircleRect(this, paddle)) {
            const ballPosition = this.x
            const paddleCenter = (paddle.width / 2) + paddle.x;
            const ballDistanceFromCenter = Math.abs(ballPosition + 15 - paddleCenter);
            const ballPaddleCollideMultiplier = ballDistanceFromCenter / (paddle.width / 2) * 3
            smite.play()
            if (ballPosition > paddleCenter) {
                this.xspeed += ballPaddleCollideMultiplier
            } else {
                this.xspeed -= ballPaddleCollideMultiplier;
            }
            this.startBounce();
            if (typeof paddle.startBounce === 'function') {
                paddle.startBounce();
            }
            return true;
        }
        return false;  // Return false to indicate that the paddle was not hit
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


    // Create volume slider
    masterVolumeSlider = createInput(brickSoundVolume, 'range');
    masterVolumeSlider.attribute('min', 0);
    masterVolumeSlider.attribute('max', 1);
    masterVolumeSlider.attribute('step', 0.01);
    masterVolumeSlider.input(() => {
        const sliderValue = parseFloat(masterVolumeSlider.value());
        if (!isNaN(sliderValue)) {
            updateMasterVolume(sliderValue);
        }
    });
    updateMasterVolume(parseFloat(masterVolumeSlider.value()) || brickSoundVolume);

    // Start with the menu displayed
    menuMusic.setLoop(true);
    menuMusic.play();
    initializeMenuParticles();
}

// Initializes or resets game entities and enters the playing state
function startGame() {
    bricks = [];
    allBalls = [];
    powerUps = [];
    powerUpCatchEffects = [];
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
    menuMusic.stop();
    seaShanty.setLoop(true);
    seaShanty.play();
    gameState = GAME_STATES.PLAYING;
    sessionStats = createSessionStats();
    paused = false;
    loop();
}

function keyPressed() {
    if (gameState === GAME_STATES.TITLE && keyCode === ENTER) {
        smite.play();
        startGame();
        return;
    }

    if (gameState === GAME_STATES.PLAYING && key === ' ') {  // Toggle pause with spacebar
        paused = !paused;
        if (paused) {
            seaShanty.stop();
            noLoop();
        } else {
            seaShanty.play();
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

function mousePressed() {
    if (mouseButton === LEFT) {
        attemptLaserFire();
    }
}

function draw() {
    if (gameState === GAME_STATES.TITLE) {
        ensureMenuMusicPlaying();
        drawTitleScreen();
        return;
    }

    if (gameState === GAME_STATES.GAME_OVER || gameState === GAME_STATES.VICTORY) {
        ensureMenuMusicPlaying();
        drawEndScreen(gameState);
        return;
    }

    if (gameState !== GAME_STATES.PLAYING) {
        return;
    }

    background(backgroundImage);

    if (paddle && typeof paddle.update === 'function') {
        paddle.update();
    }

    updateLaserState();
    updateGravityWell();

    fill(0, 0, 0, 100);
    if (paused) {
        fill(0, 0, 0, 200);  // Set the fill color to semi-transparent black
        rect(0, 0, 1920, 1080);
        textAlign(CENTER, CENTER);
        textSize(32);
        fill(255);
        text('Paused', 1920 / 2, 1080 / 2);
    }

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
        if (ball.x > width || ball.x < 0) {
            ball.xspeed *= -1;
        }
        if (ball.y < 0) {
            ball.yspeed *= -1;
        }
        if (ball.y > height) {
            const temp = allBalls.filter(tempBall => {
                return tempBall.id !== ball.id
            })
            allBalls = temp;
        }
    })

    // Check for paddle collision with ball
    allBalls.forEach(ball => {
        if (ball.checkCollision(paddle)) {
            ball.yspeed *= -1;
        }
    })

    // Move paddle with mouse
    paddle.x = mouseX - PADDLE_WIDTH / 2;

    // Game over
    if (!allBalls.length) {
        endCurrentSession(GAME_STATES.GAME_OVER, 'defeat');
        return;
    }

    if (!bricks.length) {
        endCurrentSession(GAME_STATES.VICTORY, 'victory');
        return;
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
    textAlign(LEFT, TOP);
    textSize(28);
    fill(255);
    text('Laser Charges', 40, 40);

    const iconHeight = 48;
    const iconWidth = 20;
    for (let i = 0; i < laser.charges; i++) {
        const iconX = 40 + i * (iconWidth + 10);
        const iconY = 80;
        if (laserFrames.length) {
            const frame = laserFrames[i % laserFrames.length];
            image(frame, iconX, iconY, iconWidth, iconHeight);
        } else {
            fill(255, 160, 0, 160);
            rect(iconX, iconY, iconWidth, iconHeight);
        }
    }

    if (laser.isFiring) {
        fill(255, 200, 0);
        textSize(20);
        text('FIRING!', 40, 80 + iconHeight + 10);
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

function ensureMenuMusicPlaying() {
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
        radius: Math.random() * 14 + 10,
        speed: Math.random() * 40 + 35,
        drift: Math.random() * 30 + 18,
        offset: Math.random() * Math.PI * 2,
        colorShift: Math.random() * 120 - 40
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
        particle.x += Math.sin(frameCount * 0.02 + particle.offset) * particle.drift * dt;

        if (particle.y - particle.radius > height + 80) {
            particle.y = -particle.radius - Math.random() * 120;
            particle.x = Math.random() * width;
        }

        const shimmer = Math.sin(frameCount * 0.05 + particle.offset);
        const alpha = 120 + shimmer * 80;
        const tintShift = particle.colorShift;
        const r = constrain(baseR + tintShift * 0.4, 0, 255);
        const g = constrain(baseG + tintShift * 0.2, 0, 255);
        const b = constrain(baseB + 40 + tintShift * 0.5, 0, 255);

        noStroke();
        fill(r, g, b, alpha);
        ellipse(particle.x, particle.y, particle.radius * 1.4, particle.radius);
        fill(r, g, b, alpha * 0.4);
        ellipse(particle.x, particle.y, particle.radius * 0.6, particle.radius * 0.6);
    });
}

function drawMenuBackdrop(accentColor) {
    background(12, 10, 32);

    if (backgroundImage) {
        push();
        tint(255, 35);
        image(backgroundImage, 0, 0, width, height);
        pop();
    }

    push();
    noStroke();
    const layers = 8;
    for (let i = 0; i < layers; i++) {
        const progress = i / layers;
        const bandHeight = height / layers + 32;
        const wave = Math.sin(frameCount * 0.01 + progress * Math.PI * 2);
        const baseColor = color(32, 24, 70, 110);
        const highlight = color(red(accentColor), green(accentColor), blue(accentColor), 70);
        const blended = lerpColor(baseColor, highlight, (wave + 1) / 2);
        fill(blended);
        rect(0, i * (height / layers) + wave * 16 - 16, width, bandHeight);
    }
    pop();

    updateMenuParticles(accentColor);

    push();
    stroke(red(accentColor), green(accentColor), blue(accentColor), 90);
    strokeWeight(3);
    noFill();
    const margin = 50 + Math.sin(frameCount * 0.01) * 8;
    rect(margin, margin, width - margin * 2, height - margin * 2, 26);
    pop();
}

function drawTitleScreen() {
    const accent = color(110, 180, 255);
    drawMenuBackdrop(accent);

    const panelWidth = width * 0.55;
    const panelHeight = height * 0.52;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2 + 60;

    push();
    noStroke();
    fill(10, 12, 30, 220);
    rect(panelX, panelY, panelWidth, panelHeight, 32);
    const glowAlpha = 90 + 40 * Math.sin(frameCount * 0.05);
    stroke(red(accent), green(accent), blue(accent), glowAlpha);
    strokeWeight(4);
    noFill();
    rect(panelX - 8, panelY - 8, panelWidth + 16, panelHeight + 16, 36);
    pop();

    push();
    textAlign(CENTER, CENTER);
    textSize(96);
    fill(255);
    text('Breakout Blast', width / 2, panelY - 140);
    textSize(28);
    fill(215);
    text('An interstellar gauntlet of ricochets and power-ups', width / 2, panelY - 80);
    pop();

    const infoX = panelX + 60;
    const infoY = panelY + 70;
    push();
    textAlign(LEFT, TOP);
    textSize(26);
    fill(255);
    text('Mission Briefing', infoX, infoY);
    textSize(18);
    fill(225);
    const briefingLines = [
        '• Glide the paddle with your mouse to redirect the energy core.',
        '• Snatch power-ups to duplicate balls, ignite lasers, or bend gravity.',
        '• Click to unleash stored laser charges with pinpoint precision.'
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
    text('Press ENTER to Launch', width / 2, calloutY);
    textSize(20);
    fill(235);
    text('Space: Pause · Click: Fire Lasers · Adjust volume via the slider above', width / 2, calloutY + 40);
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
    fill(12, 16, 34, 220);
    rect(x - 30, y - 20, 260, 150, 18);
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

    push();
    noStroke();
    fill(10, 12, 28, 235);
    rect(panelX, panelY, panelWidth, panelHeight, 32);
    stroke(red(accent), green(accent), blue(accent), 130);
    strokeWeight(4);
    noFill();
    rect(panelX - 10, panelY - 10, panelWidth + 20, panelHeight + 20, 36);
    pop();

    const title = isVictory ? 'Arena Secured!' : 'Shields Shattered';
    const subtitle = isVictory ? 'Your volleys echo across the stars.' : 'The swarm overwhelmed the defense grid.';
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
        text('Mission Report', statsX, statsY);
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

        const flavor = isVictory ? 'The void falls silent... for now.' : 'Recalibrate your aim and strike back.';
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
    text('Press ENTER to Retry', width / 2, promptY);
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
    if (seaShanty && typeof seaShanty.stop === 'function') {
        seaShanty.stop();
    }

    if (gravityWellSound && typeof gravityWellSound.stop === 'function') {
        gravityWellSound.stop();
    }

    ensureMenuMusicPlaying();
    finalizeSession(resultLabel);
    gameState = nextState;
    paused = false;
    loop();
}

function goToTitleScreen() {
    if (seaShanty && typeof seaShanty.stop === 'function') {
        seaShanty.stop();
    }

    ensureMenuMusicPlaying();
    bricks = [];
    allBalls = [];
    powerUps = [];
    powerUpCatchEffects = [];
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
