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
const LASER_SHOTS_PER_PICKUP = 3;

const GRAVITY_WELL_DURATION_MS = 10000;
const GRAVITY_WELL_PULL_FORCE = 900;
const GRAVITY_WELL_CAPTURE_RADIUS = 90;
const GRAVITY_NOVA_MAX_BRICKS = 4;

// Declare variables for the start and end points of the laser
let laser;
let laserFrames = [];

// Global variables
let bricks = [];
let paddle;
let allBalls = [];
let powerUps = [];
let gameOver = false;
let paused = false;
let isDebugging = false;
let gravityWell;

// Tracks the current screen: 'menu', 'game', 'gameover', or 'win'
let gameState = 'menu';

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
            let brickBottom = this.y + this.height
            let brickTop = this.y
            if (ball.y > brickTop && ball.y < brickBottom) {
                ball.xspeed *= -1;
            } else {
                ball.yspeed *= -1;
            }
            if (Math.abs(ball.xspeed) > 15) {
                this.health = 0;
                ball.xspeed += 1;
            } else {
                this.health -= 1;
            }

            // If the brick has a power-up, create a new power-up object and add it to the game
            if (this.health === 0 && this.powerUp) {
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
    constructor(x, y) {
        this.x = x || width / 2;
        this.y = y || PADDLE_Y - BALL_DIAMETER;
        this.diameter = BALL_DIAMETER;
        this.xspeed = 5;
        this.yspeed = -5;
        this.currentBallImage = ballImage;
        this.id = Math.floor(Math.random() * Math.floor(Math.random() * Date.now()))
        this.bounceStartTime = null;
        this.bounceDuration = 130; // milliseconds
        this.bounceMagnitude = 7;
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

        if (this.bounceStartTime !== null) {
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
        image(this.currentBallImage, -halfRender, -halfRender, renderDiameter, renderDiameter);
        pop();
    }

    startBounce() {
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

    gravityWell.active = true;
    gravityWell.remainingTime = GRAVITY_WELL_DURATION_MS;
    gravityWell.x = width / 2;
    gravityWell.y = height * 0.18;
    gravityWell.radius = GRAVITY_WELL_CAPTURE_RADIUS;
    gravityWell.pulse = 0;
    gravityWell.particles = createGravityParticles();
    gravityWell.nova = null;
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

        if (gravityWell.remainingTime <= 0) {
            gravityWell.active = false;
            gravityWell.particles = [];
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
        holdTimer: 0
    }
    noStroke();
    createCanvas(1920, 1080);
    background(backgroundImage, 1000)


    // Create volume slider
    let volumeSlider = createInput(1, 'range');
    volumeSlider.input(function () {
        menuMusic.setVolume(this.value);
        seaShanty.setVolume(this.value);
    });

    // Start with the menu displayed
    menuMusic.setLoop(true);
    menuMusic.play();
    noLoop();
}

// Initializes or resets game entities and enters the playing state
function startGame() {
    bricks = [];
    allBalls = [];
    powerUps = [];
    laser.charges = 0;
    laser.isFiring = false;
    laser.height = 0;
    laser.frameIndex = 0;
    laser.frameTimer = 0;
    laser.holdTimer = 0;
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
    gameState = 'game';
    paused = false;
    loop();
}

function keyPressed() {
    if (gameState === 'menu' && keyCode === ENTER) {
        smite.play();
        startGame();
        return;
    }

    if (gameState === 'game' && key === ' ') {  // Toggle pause with spacebar
        paused = !paused;
        if (paused) {
            seaShanty.stop();
            noLoop();
        } else {
            seaShanty.play();
            loop();
        }
    }

    if ((gameState === 'gameover' || gameState === 'win') && (key === 'r' || key === 'R')) {
        smite.play();
        startGame();
    }
}

function mousePressed() {
    if (mouseButton === LEFT) {
        attemptLaserFire();
    }
}

function draw() {
    background(backgroundImage);

    if (gameState === 'menu') {
        if (!menuMusic.isPlaying()) menuMusic.play();
        showMenu();
        return;
    }

    if (gameState === 'gameover') {
        if (!menuMusic.isPlaying()) menuMusic.play();
        showGameOver();
        return;
    }

    if (gameState === 'win') {
        if (!menuMusic.isPlaying()) menuMusic.play();
        showWin();
        return;
    }

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
            brick.health = 0;
            shouldRemove = true;
        }

        if (!shouldRemove) {
            for (const ball of allBalls) {
                if (!brick.checkCollision(ball)) {
                    continue;
                }

                if (brick.health === 1) {
                    brick.currentBrickImage = brick1Image;
                } else if (brick.health === 2) {
                    brick.currentBrickImage = brick2Image;
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
            bricks.splice(i, 1);
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
        seaShanty.stop();
        menuMusic.play();
        gameState = 'gameover';
        noLoop();
    }

    if (!bricks.length) {
        seaShanty.stop();
        menuMusic.play();
        gameState = 'win';
        noLoop();
    }
}

function attemptLaserFire() {
    if (gameState !== 'game' || paused || !paddle) {
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
    if (gameState !== 'game') {
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

function showMenu() {
    background(backgroundImage);
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    if (menuGif) {
        image(menuGif, width / 2 - menuGif.width / 2, height / 2 - menuGif.height / 2 - 100);
    }
    textSize(64);
    fill(255);
    text('Breakout Blast', width / 2, height / 2 - 250);
    let alpha = 200 + 55 * sin(frameCount * 0.1);
    fill(255, alpha);
    textSize(36);
    text('Press ENTER to Start', width / 2, height - 200);
    textSize(20);
    fill(255, 200);
    text('Press SPACE to Pause during the game', width / 2, height - 160);
}

function showGameOver() {
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    textSize(64);
    const pulse = 150 + 105 * sin(frameCount * 0.1);
    fill(200, pulse * 0.3, pulse * 0.3);
    text('Game Over', width / 2, height / 2);
    textSize(24);
    text('Press R to Restart', width / 2, height / 2 + 50);
}

function showWin() {
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    textSize(64);
    const pulse = 150 + 105 * sin(frameCount * 0.1);
    fill(pulse * 0.3, 200, pulse * 0.3);
    text('Game Won!', width / 2, height / 2);
    textSize(24);
    text('Press R to Restart', width / 2, height / 2 + 50);
}
