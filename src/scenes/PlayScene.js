import * as THREE from "three";
import { Scene } from "../engine/Scene.js";
import { GAME } from "../game/GameConstants.js";
import {
  circleRectIntersect,
  clamp,
  rectRectIntersect,
} from "../game/math/collisions.js";
import { Paddle } from "../game/entities/Paddle.js";
import { Ball } from "../game/entities/Ball.js";
import { Brick } from "../game/entities/Brick.js";
import { PowerUp, PowerUpType } from "../game/entities/PowerUp.js";
import { LaserShot } from "../game/entities/LaserShot.js";
import { GravityWell } from "../game/entities/GravityWell.js";

export class PlayScene extends Scene {
  /**
   * @param {{ ui: any, input: any, assets: any, audio?: any, actions: { end: Function } }} deps
   */
  constructor({ ui, input, assets, audio, actions }) {
    super();
    this._ui = ui;
    this._input = input;
    this._assets = assets;
    this._audio = audio;
    this._actions = actions;

    this._scene = new THREE.Scene();

    // Y-down world coordinates to match the original p5 mental model.
    this._camera = new THREE.OrthographicCamera(
      0,
      GAME.WIDTH,
      GAME.HEIGHT,
      0,
      0.1,
      1000,
    );
    this._camera.position.set(0, 0, 10);

    this._bgMesh = null;
    this._paddle = null;
    this._balls = [];
    this._bricks = [];
    this._powerUps = [];
    this._laserShots = [];
    /** @type {GravityWell|null} */
    this._gravityWell = null;
    this._effects = {
      laser: {
        shotsRemaining: 0,
        cooldownLeftSeconds: 0,
      },
      gravityWell: {
        timeLeftSeconds: 0,
      },
    };
    this._paused = false;

    /** @type {Ball|null} */
    this._caughtBall = null;

    this._stats = {
      bricksDestroyed: 0,
      powerUpsCollected: 0,
      startTimeMs: 0,
    };

    this._textures = null;

    this._aimGuide = {
      line: null,
      arrow: null,
    };
  }

  async enter() {
    this._ui.setState({ mode: "hidden" });

    this._audio?.setMusicMode?.("play");

    this._paused = false;
    this._stats.bricksDestroyed = 0;
    this._stats.powerUpsCollected = 0;
    this._stats.startTimeMs = performance.now();

    await this._loadTextures();
    this._buildScene();
  }

  async exit() {
    this._scene.clear();
    this._bgMesh = null;
    this._paddle = null;
    this._balls = [];
    this._bricks = [];

    for (const pu of this._powerUps) pu.dispose();
    for (const shot of this._laserShots) shot.dispose();
    this._powerUps = [];
    this._laserShots = [];

    if (this._gravityWell) {
      this._gravityWell.dispose();
      this._gravityWell = null;
    }

    this._caughtBall = null;

    if (this._aimGuide.line) {
      this._scene.remove(this._aimGuide.line);
      this._aimGuide.line.geometry.dispose();
      this._aimGuide.line.material.dispose();
      this._aimGuide.line = null;
    }
    if (this._aimGuide.arrow) {
      this._scene.remove(this._aimGuide.arrow);
      this._aimGuide.arrow.geometry.dispose();
      this._aimGuide.arrow.material.dispose();
      this._aimGuide.arrow = null;
    }
  }

  update(dtSeconds) {
    // Pause toggle (matches legacy behavior)
    if (this._input.wasPressed("Space")) {
      this.setPaused(!this._paused);
    }

    if (this._paused) {
      return;
    }

    if (!this._paddle || this._balls.length === 0) {
      return;
    }

    // Effects timers.
    this._effects.laser.cooldownLeftSeconds = Math.max(
      0,
      this._effects.laser.cooldownLeftSeconds - dtSeconds,
    );
    this._effects.gravityWell.timeLeftSeconds = Math.max(
      0,
      this._effects.gravityWell.timeLeftSeconds - dtSeconds,
    );

    const left = this._input.isDown("ArrowLeft") || this._input.isDown("KeyA");
    const right =
      this._input.isDown("ArrowRight") || this._input.isDown("KeyD");

    this._paddle.update(
      dtSeconds,
      { left, right },
      { minX: 0, maxX: GAME.WIDTH },
      GAME.PADDLE_SPEED_PER_FRAME,
    );

    this._updateCaughtBallState();

    if (this._caughtBall && this._input.pointer.leftPressedThisFrame) {
      this._fireCaughtBall();
    }

    if (this._input.wasPressed("KeyF")) {
      this._tryFireLaserVolley();
    }

    this._updateGravityWell(dtSeconds);

    // Move balls + resolve world bounds.
    for (const ball of this._balls) {
      ball.move(dtSeconds);

      // Walls (cx/cy are centers)
      if (ball.cx + ball.radius > GAME.WIDTH) {
        ball.cx = GAME.WIDTH - ball.radius;
        ball.vxPerFrame *= -1;
      }
      if (ball.cx - ball.radius < 0) {
        ball.cx = ball.radius;
        ball.vxPerFrame *= -1;
      }
      if (ball.cy - ball.radius < 0) {
        ball.cy = ball.radius;
        ball.vyPerFrame *= -1;
      }
      ball.syncMesh();
    }

    // Remove balls that fall below the world.
    this._balls = this._balls.filter(
      (ball) => ball.cy - ball.radius <= GAME.HEIGHT,
    );

    // Paddle collision.
    for (const ball of this._balls) {
      if (ball.isCaught) {
        continue;
      }

      const hit = circleRectIntersect(
        ball.cx,
        ball.cy,
        ball.radius,
        this._paddle.x,
        this._paddle.y,
        this._paddle.width,
        this._paddle.height,
      );

      if (!hit) continue;

      const caught = this._maybeCatchBall(ball);
      if (caught) {
        continue;
      }

      this._audio?.playPaddleHit?.();

      // Replicate the original feel: adjust X velocity based on impact point.
      const paddleCenter = this._paddle.x + this._paddle.width / 2;
      const ballDistanceFromCenter = Math.abs(ball.cx + 15 - paddleCenter);
      const multiplier =
        (ballDistanceFromCenter / (this._paddle.width / 2)) * 3;

      if (ball.cx > paddleCenter) {
        ball.vxPerFrame += multiplier;
      } else {
        ball.vxPerFrame -= multiplier;
      }

      // Always bounce upward.
      if (ball.vyPerFrame > 0) {
        ball.vyPerFrame *= -1;
      }

      // Push ball out of paddle to prevent sticking.
      ball.cy = this._paddle.y - ball.radius - 1;
      ball.syncMesh();
    }

    // Brick collisions (single-hit per ball per frame to keep it simple).
    for (const ball of this._balls) {
      if (ball.isCaught) {
        continue;
      }
      for (let i = this._bricks.length - 1; i >= 0; i--) {
        const brick = this._bricks[i];
        if (!brick) {
          continue;
        }
        const hit = circleRectIntersect(
          ball.cx,
          ball.cy,
          ball.radius,
          brick.x,
          brick.y,
          brick.width,
          brick.height,
        );

        if (!hit) continue;

        // Rough side resolution similar to legacy Brick.checkCollision.
        const brickTop = brick.y;
        const brickBottom = brick.y + brick.height;
        if (ball.cy > brickTop && ball.cy < brickBottom) {
          ball.vxPerFrame *= -1;
        } else {
          ball.vyPerFrame *= -1;
        }

        const destroyed = brick.damage(ball.strengthTier);
        this._speedUpAndReTierBall(ball);
        this._audio?.playBrickHit?.({ destroyed });
        if (destroyed) {
          this._maybeSpawnPowerUp(brick);
          this._scene.remove(brick.mesh);
          this._bricks.splice(i, 1);
          this._stats.bricksDestroyed += 1;
        }

        break;
      }
    }

    this._updateLaserShots(dtSeconds);
    this._updatePowerUps(dtSeconds);

    // Win / lose.
    if (this._balls.length === 0) {
      this._actions.end("defeat", this._buildSummaryHtml("defeat"));
      return;
    }

    if (this._bricks.length === 0) {
      this._actions.end("victory", this._buildSummaryHtml("victory"));
      return;
    }
  }

  getRenderTarget() {
    return { scene: this._scene, camera: this._camera };
  }

  _getPointerWorld() {
    const px = this._input.pointer.x;
    const py = this._input.pointer.y;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    return {
      x: (px / w) * GAME.WIDTH,
      y: (py / h) * GAME.HEIGHT,
    };
  }

  _maybeCatchBall(ball) {
    if (this._caughtBall) {
      return false;
    }

    // Detect if the ball approached from the side or below.
    const paddle = this._paddle;
    const withinVertical =
      ball.cy + ball.radius > paddle.y &&
      ball.cy - ball.radius < paddle.y + paddle.height;

    if (!withinVertical) {
      return false;
    }

    const prevRight = ball.prevCx + ball.radius;
    const prevLeft = ball.prevCx - ball.radius;
    const prevTop = ball.prevCy - ball.radius;

    const cameFromLeft = prevRight <= paddle.x;
    const cameFromRight = prevLeft >= paddle.x + paddle.width;
    const cameFromBelow = prevTop >= paddle.y + paddle.height;

    if (!cameFromLeft && !cameFromRight && !cameFromBelow) {
      return false;
    }

    /** @type {'left'|'right'} */
    let side = "left";
    if (cameFromBelow && !cameFromLeft && !cameFromRight) {
      const distToLeft = Math.abs(ball.cx - paddle.x);
      const distToRight = Math.abs(paddle.x + paddle.width - ball.cx);
      side = distToLeft <= distToRight ? "left" : "right";
    } else {
      side = cameFromLeft ? "left" : "right";
    }

    this._catchBall(ball, side);
    return true;
  }

  _catchBall(ball, side) {
    this._caughtBall = ball;
    ball.isCaught = true;
    ball.caughtSide = side;
    ball.vxPerFrame = 0;
    ball.vyPerFrame = 0;
    ball.caughtOffsetY = clamp(
      ball.cy - this._paddle.y,
      ball.radius,
      this._paddle.height - ball.radius,
    );
    ball.aimAngle = -Math.PI / 2;

    this._updateCaughtBallState();
  }

  _updateCaughtBallState() {
    if (!this._caughtBall || !this._caughtBall.isCaught) {
      this._hideAimGuide();
      return;
    }

    const ball = this._caughtBall;
    const paddle = this._paddle;
    if (!paddle || !this._balls.includes(ball)) {
      this._resetCaughtBall();
      return;
    }

    const offsetX =
      ball.caughtSide === "left" ? -ball.radius : paddle.width + ball.radius;

    ball.caughtOffsetY = clamp(
      ball.caughtOffsetY,
      ball.radius,
      paddle.height - ball.radius,
    );

    ball.cx = paddle.x + offsetX;
    ball.cy = paddle.y + ball.caughtOffsetY;
    ball.prevCx = ball.cx;
    ball.prevCy = ball.cy;
    ball.syncMesh();

    this._updateCaughtBallAim();
    this._drawAimGuide();
  }

  _updateCaughtBallAim() {
    if (!this._caughtBall || !this._caughtBall.isCaught) {
      return;
    }

    const ball = this._caughtBall;
    const pointer = this._getPointerWorld();
    let angle = Math.atan2(pointer.y - ball.cy, pointer.x - ball.cx);
    if (Number.isNaN(angle)) {
      angle = -Math.PI / 2;
    }

    if (ball.caughtSide === "left") {
      const minAngle = -Math.PI + GAME.CAUGHT_AIM_ANGLE_OFFSET;
      const maxAngle = -Math.PI / 2 - GAME.CAUGHT_AIM_ANGLE_OFFSET;
      ball.aimAngle = clamp(angle, minAngle, maxAngle);
    } else {
      const minAngle = -Math.PI / 2 + GAME.CAUGHT_AIM_ANGLE_OFFSET;
      const maxAngle = -GAME.CAUGHT_AIM_ANGLE_OFFSET;
      ball.aimAngle = clamp(angle, minAngle, maxAngle);
    }
  }

  _fireCaughtBall() {
    if (!this._caughtBall || !this._caughtBall.isCaught) {
      return;
    }

    const ball = this._caughtBall;
    const angle =
      typeof ball.aimAngle === "number" ? ball.aimAngle : -Math.PI / 2;
    const speed = GAME.CAUGHT_RELEASE_SPEED_PER_FRAME;

    ball.isCaught = false;
    ball.caughtSide = null;
    ball.vxPerFrame = Math.cos(angle) * speed;
    ball.vyPerFrame = Math.sin(angle) * speed;
    ball.prevCx = ball.cx;
    ball.prevCy = ball.cy;

    this._resetCaughtBall();
  }

  _resetCaughtBall() {
    if (this._caughtBall) {
      this._caughtBall.isCaught = false;
      this._caughtBall.caughtSide = null;
    }
    this._caughtBall = null;
    this._hideAimGuide();
  }

  _hideAimGuide() {
    if (this._aimGuide.line) this._aimGuide.line.visible = false;
    if (this._aimGuide.arrow) this._aimGuide.arrow.visible = false;
  }

  _ensureAimGuideObjects() {
    if (!this._aimGuide.line) {
      const points = [new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, 5)];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffd28c,
        transparent: true,
        opacity: 0.85,
      });
      const line = new THREE.Line(geom, mat);
      this._aimGuide.line = line;
      this._scene.add(line);
    }

    if (!this._aimGuide.arrow) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(9), 3),
      );
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd28c,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const arrow = new THREE.Mesh(geom, mat);
      this._aimGuide.arrow = arrow;
      this._scene.add(arrow);
    }
  }

  _drawAimGuide() {
    if (!this._caughtBall || !this._caughtBall.isCaught) {
      this._hideAimGuide();
      return;
    }

    this._ensureAimGuideObjects();

    const ball = this._caughtBall;
    const angle =
      typeof ball.aimAngle === "number" ? ball.aimAngle : -Math.PI / 2;

    const startX = ball.cx;
    const startY = ball.cy;
    const endX = startX + Math.cos(angle) * GAME.CAUGHT_TRAJECTORY_LENGTH;
    const endY = startY + Math.sin(angle) * GAME.CAUGHT_TRAJECTORY_LENGTH;

    // Convert y-down to y-up for rendering.
    const sy = GAME.HEIGHT - startY;
    const ey = GAME.HEIGHT - endY;

    const line = this._aimGuide.line;
    const arrow = this._aimGuide.arrow;
    line.visible = true;
    arrow.visible = true;

    const positions = line.geometry.attributes.position.array;
    positions[0] = startX;
    positions[1] = sy;
    positions[2] = 5;
    positions[3] = endX;
    positions[4] = ey;
    positions[5] = 5;
    line.geometry.attributes.position.needsUpdate = true;

    // Arrow triangle at the end.
    const arrowLength = 24;
    const arrowWidth = 11;
    const dirX = Math.cos(angle);
    const dirYDown = Math.sin(angle);
    const dirYUp = -dirYDown;

    const tipX = endX;
    const tipY = ey;

    // Perp in y-up space.
    const perpX = -dirYUp;
    const perpY = dirX;

    const baseX = tipX - dirX * arrowLength;
    const baseY = tipY - dirYUp * arrowLength;

    const leftX = baseX + perpX * arrowWidth;
    const leftY = baseY + perpY * arrowWidth;
    const rightX = baseX - perpX * arrowWidth;
    const rightY = baseY - perpY * arrowWidth;

    const arrPos = arrow.geometry.attributes.position.array;
    // tip
    arrPos[0] = tipX;
    arrPos[1] = tipY;
    arrPos[2] = 6;
    // left
    arrPos[3] = leftX;
    arrPos[4] = leftY;
    arrPos[5] = 6;
    // right
    arrPos[6] = rightX;
    arrPos[7] = rightY;
    arrPos[8] = 6;
    arrow.geometry.attributes.position.needsUpdate = true;
  }

  async _loadTextures() {
    if (this._textures) return;

    const [
      bg,
      paddle,
      ball,
      ballPowered,
      brick1,
      brick2,
      brick3,
      powerupMulti,
      powerupLaser,
      laserShot,
      gravityWell,
    ] = await Promise.all([
      this._assets.loadTexture("/Assets/background1.png"),
      this._assets.loadTexture("/Assets/paddle.png"),
      this._assets.loadTexture("/Assets/ball.png"),
      this._assets.loadTexture("/Assets/ball-full-power.png"),
      this._assets.loadTexture("/Assets/brick1.png"),
      this._assets.loadTexture("/Assets/brick2.png"),
      this._assets.loadTexture("/Assets/brick3.png"),
      this._assets.loadTexture("/Assets/power-up-extra-balls.png"),
      this._assets.loadTexture("/Assets/power-up-laser.png"),
      this._assets.loadTexture("/Assets/laser.png"),
      this._assets.loadTexture("/Assets/ball-full-power.png"),
    ]);

    this._textures = {
      bg,
      paddle,
      ball,
      ballPowered,
      bricks: new Map([
        [1, brick1],
        [2, brick2],
        [3, brick3],
      ]),
      powerUps: new Map([
        [PowerUpType.MULTIBALL, powerupMulti],
        [PowerUpType.LASER, powerupLaser],
        [PowerUpType.GRAVITY_WELL, gravityWell],
      ]),
      laserShot,
      gravityWell,
    };
  }

  _buildScene() {
    this._scene.clear();
    this._balls = [];
    this._bricks = [];
    this._powerUps = [];
    this._laserShots = [];
    this._caughtBall = null;
    this._effects.laser.shotsRemaining = 0;
    this._effects.laser.cooldownLeftSeconds = 0;
    this._effects.gravityWell.timeLeftSeconds = 0;

    // Background
    const bgGeom = new THREE.PlaneGeometry(GAME.WIDTH, GAME.HEIGHT);
    const bgMat = new THREE.MeshBasicMaterial({ map: this._textures.bg });
    this._bgMesh = new THREE.Mesh(bgGeom, bgMat);
    this._bgMesh.position.set(GAME.WIDTH / 2, GAME.HEIGHT / 2, -10);
    this._scene.add(this._bgMesh);

    // Paddle
    const paddleX = GAME.WIDTH / 2 - GAME.PADDLE_WIDTH / 2;
    this._paddle = new Paddle({
      x: paddleX,
      y: GAME.PADDLE_Y,
      width: GAME.PADDLE_WIDTH,
      height: GAME.PADDLE_HEIGHT,
      texture: this._textures.paddle,
    });
    this._scene.add(this._paddle.mesh);

    // Ball
    const ball = new Ball({
      cx: GAME.WIDTH / 2,
      cy: GAME.PADDLE_Y - GAME.BALL_RADIUS - 1,
      radius: GAME.BALL_RADIUS,
      texture: this._textures.ball,
      poweredTexture: this._textures.ballPowered,
      vxPerFrame: GAME.BALL_START_VX_PER_FRAME,
      vyPerFrame: GAME.BALL_START_VY_PER_FRAME,
    });
    this._balls.push(ball);
    this._scene.add(ball.mesh);

    // Gravity well (hidden until picked up)
    this._gravityWell = new GravityWell({
      cx: GAME.WIDTH / 2,
      cy: GAME.HEIGHT / 2,
      radius: GAME.GRAVITY_WELL_RADIUS,
      texture: this._textures.gravityWell,
    });
    this._gravityWell.mesh.visible = false;
    this._scene.add(this._gravityWell.mesh);

    // Bricks
    for (let i = 0; i < GAME.BRICK_COLS; i++) {
      for (let j = 0; j < GAME.BRICK_ROWS; j++) {
        const x = GAME.BRICK_OFFSET_X + i * GAME.BRICK_SPACING_X;
        const y = GAME.BRICK_OFFSET_Y + j * GAME.BRICK_SPACING_Y;
        const brick = new Brick({
          x,
          y,
          width: GAME.BRICK_WIDTH,
          height: GAME.BRICK_HEIGHT,
          health: 3,
          texturesByHealth: this._textures.bricks,
        });
        this._bricks.push(brick);
        this._scene.add(brick.mesh);
      }
    }
  }

  _buildSummaryHtml(result) {
    const durationMs = Math.max(0, performance.now() - this._stats.startTimeMs);
    const seconds = Math.round(durationMs / 1000);
    return `
      <li><strong>Result:</strong> ${result === "victory" ? "Victory" : "Defeat"}</li>
      <li><strong>Bricks shattered:</strong> ${this._stats.bricksDestroyed}</li>
      <li><strong>Power-ups collected:</strong> ${this._stats.powerUpsCollected}</li>
      <li><strong>Time in arena:</strong> ${seconds}s</li>
    `;
  }

  _maybeSpawnPowerUp(brick) {
    if (Math.random() > GAME.POWERUP_DROP_CHANCE) {
      return;
    }

    const roll = Math.random();
    let type = PowerUpType.MULTIBALL;
    if (roll < 0.55) {
      type = PowerUpType.MULTIBALL;
    } else if (roll < 0.85) {
      type = PowerUpType.LASER;
    } else {
      type = PowerUpType.GRAVITY_WELL;
    }

    const tex = this._textures.powerUps.get(type) || this._textures.ball;
    const pu = new PowerUp({
      cx: brick.x + brick.width / 2,
      cy: brick.y + brick.height / 2,
      radius: GAME.POWERUP_RADIUS,
      type,
      texture: tex,
      vyPerFrame: GAME.POWERUP_FALL_SPEED_PER_FRAME,
    });
    this._powerUps.push(pu);
    this._scene.add(pu.mesh);
  }

  _updatePowerUps(dtSeconds) {
    for (let i = this._powerUps.length - 1; i >= 0; i--) {
      const pu = this._powerUps[i];
      pu.update(dtSeconds);

      // Collected?
      const collected = circleRectIntersect(
        pu.cx,
        pu.cy,
        pu.radius,
        this._paddle.x,
        this._paddle.y,
        this._paddle.width,
        this._paddle.height,
      );

      if (collected) {
        this._applyPowerUp(pu.type);
        this._stats.powerUpsCollected += 1;
        this._scene.remove(pu.mesh);
        pu.dispose();
        this._powerUps.splice(i, 1);
        continue;
      }

      // Missed?
      if (pu.cy - pu.radius > GAME.HEIGHT) {
        this._scene.remove(pu.mesh);
        pu.dispose();
        this._powerUps.splice(i, 1);
      }
    }
  }

  _applyPowerUp(type) {
    this._audio?.playPowerUp?.(type);
    if (type === PowerUpType.MULTIBALL) {
      this._applyMultiBall();
      return;
    }
    if (type === PowerUpType.LASER) {
      this._effects.laser.shotsRemaining += GAME.LASER_SHOTS_PER_PICKUP;
      return;
    }
    if (type === PowerUpType.GRAVITY_WELL) {
      this._effects.gravityWell.timeLeftSeconds +=
        GAME.GRAVITY_WELL_DURATION_SECONDS;
      return;
    }
  }

  _applyMultiBall() {
    const spawnCount = GAME.MULTIBALL_EXTRA_BALLS;
    for (let i = 0; i < spawnCount; i++) {
      const paddleCenterX = this._paddle.x + this._paddle.width / 2;
      const spawnCx = paddleCenterX;
      const spawnCy = this._paddle.y - GAME.BALL_RADIUS - 2;

      const spread =
        (Math.random() * 2 - 1) * GAME.MULTIBALL_SPREAD_VX_PER_FRAME;
      const vx = GAME.BALL_START_VX_PER_FRAME + spread;
      const vy = -Math.abs(GAME.BALL_START_VY_PER_FRAME);

      const ball = new Ball({
        cx: spawnCx,
        cy: spawnCy,
        radius: GAME.BALL_RADIUS,
        texture: this._textures.ball,
        poweredTexture: this._textures.ballPowered,
        vxPerFrame: vx,
        vyPerFrame: vy,
      });
      this._balls.push(ball);
      this._scene.add(ball.mesh);
    }
  }

  /**
   * @param {Ball} ball
   */
  _speedUpAndReTierBall(ball) {
    if (!ball || ball.isCaught) return;

    const current = ball.getSpeedPerFrame();
    if (current <= 0.0001) return;

    const next = Math.min(
      GAME.BALL_MAX_SPEED_PER_FRAME,
      current + GAME.BALL_SPEEDUP_PER_BRICK_HIT,
    );
    ball.setSpeedPerFrame(next);

    const tier =
      next >= GAME.BALL_STRENGTH_TIER3_SPEED
        ? 3
        : next >= GAME.BALL_STRENGTH_TIER2_SPEED
          ? 2
          : 1;
    ball.setStrengthTier(/** @type {1|2|3} */ (tier));
  }

  /**
   * @param {boolean} paused
   */
  setPaused(paused) {
    this._paused = Boolean(paused);
    this._ui.setState({ mode: this._paused ? "pause" : "hidden" });
  }

  _tryFireLaserVolley() {
    if (this._effects.laser.shotsRemaining <= 0) {
      return;
    }
    if (this._effects.laser.cooldownLeftSeconds > 0) {
      return;
    }

    this._audio?.playLaser?.();

    // Fire two beams from the paddle's top corners.
    const y = this._paddle.y - GAME.LASER_SHOT_HEIGHT;
    const leftX = this._paddle.x + 12;
    const rightX =
      this._paddle.x + this._paddle.width - 12 - GAME.LASER_SHOT_WIDTH;

    const shot1 = new LaserShot({
      x: leftX,
      y,
      width: GAME.LASER_SHOT_WIDTH,
      height: GAME.LASER_SHOT_HEIGHT,
      texture: this._textures.laserShot,
      vyPerFrame: GAME.LASER_SHOT_SPEED_PER_FRAME,
    });
    const shot2 = new LaserShot({
      x: rightX,
      y,
      width: GAME.LASER_SHOT_WIDTH,
      height: GAME.LASER_SHOT_HEIGHT,
      texture: this._textures.laserShot,
      vyPerFrame: GAME.LASER_SHOT_SPEED_PER_FRAME,
    });

    this._laserShots.push(shot1, shot2);
    this._scene.add(shot1.mesh);
    this._scene.add(shot2.mesh);

    this._effects.laser.shotsRemaining = Math.max(
      0,
      this._effects.laser.shotsRemaining - 1,
    );
    this._effects.laser.cooldownLeftSeconds = GAME.LASER_COOLDOWN_SECONDS;
  }

  _updateLaserShots(dtSeconds) {
    for (let i = this._laserShots.length - 1; i >= 0; i--) {
      const shot = this._laserShots[i];
      if (!shot) {
        continue;
      }
      shot.update(dtSeconds);

      // Off-screen.
      if (shot.y + shot.height < 0) {
        this._scene.remove(shot.mesh);
        shot.dispose();
        this._laserShots.splice(i, 1);
        continue;
      }

      // Brick hits.
      let hitBrickIndex = -1;
      for (let b = this._bricks.length - 1; b >= 0; b--) {
        const brick = this._bricks[b];
        const hit = rectRectIntersect(
          shot.x,
          shot.y,
          shot.width,
          shot.height,
          brick.x,
          brick.y,
          brick.width,
          brick.height,
        );
        if (!hit) continue;
        hitBrickIndex = b;
        break;
      }

      if (hitBrickIndex >= 0) {
        const brick = this._bricks[hitBrickIndex];
        if (!brick) {
          this._scene.remove(shot.mesh);
          shot.dispose();
          this._laserShots.splice(i, 1);
          continue;
        }
        const destroyed = brick.damage(1);
        this._audio?.playBrickHit?.({ destroyed });
        if (destroyed) {
          this._maybeSpawnPowerUp(brick);
          this._scene.remove(brick.mesh);
          this._bricks.splice(hitBrickIndex, 1);
          this._stats.bricksDestroyed += 1;
        }

        this._scene.remove(shot.mesh);
        shot.dispose();
        this._laserShots.splice(i, 1);
      }
    }
  }

  _updateGravityWell(dtSeconds) {
    if (!this._gravityWell) {
      return;
    }

    const active = this._effects.gravityWell.timeLeftSeconds > 0;
    this._gravityWell.mesh.visible = active;
    if (!active) {
      return;
    }

    const pointer = this._getPointerWorld();
    const cx = clamp(pointer.x, 0, GAME.WIDTH);
    const cy = clamp(pointer.y, 0, GAME.HEIGHT);
    this._gravityWell.setPosition(cx, cy);

    // Apply attraction to uncaught balls.
    const frameMultiplier = dtSeconds * 60;
    for (const ball of this._balls) {
      if (ball.isCaught) continue;

      const dx = cx - ball.cx;
      const dy = cy - ball.cy;
      const distSq = dx * dx + dy * dy + GAME.GRAVITY_WELL_SOFTENING;
      const dist = Math.sqrt(distSq);
      if (dist <= 0.0001) continue;

      const force = GAME.GRAVITY_WELL_STRENGTH / distSq;
      const ax = (dx / dist) * force;
      const ay = (dy / dist) * force;

      ball.vxPerFrame += ax * frameMultiplier;
      ball.vyPerFrame += ay * frameMultiplier;
    }
  }
}
