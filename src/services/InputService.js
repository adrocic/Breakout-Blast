export class InputService {
  constructor() {
    this._down = new Set();
    this._pressedThisFrame = new Set();

    this._pointer = {
      x: 0,
      y: 0,
      leftDown: false,
      leftPressedThisFrame: false,
    };

    this._onKeyDown = (e) => {
      const code = e.code || e.key;
      if (!this._down.has(code)) {
        this._pressedThisFrame.add(code);
      }
      this._down.add(code);
    };

    this._onKeyUp = (e) => {
      const code = e.code || e.key;
      this._down.delete(code);
    };

    this._onPointerMove = (e) => {
      this._pointer.x = e.clientX;
      this._pointer.y = e.clientY;
    };

    this._onMouseDown = (e) => {
      if (e.button === 0) {
        if (!this._pointer.leftDown) {
          this._pointer.leftPressedThisFrame = true;
        }
        this._pointer.leftDown = true;
      }
    };

    this._onMouseUp = (e) => {
      if (e.button === 0) {
        this._pointer.leftDown = false;
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
  }

  dispose() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
  }

  beginFrame() {
    // nothing; events populate state
  }

  endFrame() {
    this._pressedThisFrame.clear();
    this._pointer.leftPressedThisFrame = false;
  }

  /**
   * @param {string} code
   */
  isDown(code) {
    return this._down.has(code);
  }

  /**
   * @param {string} code
   */
  wasPressed(code) {
    return this._pressedThisFrame.has(code);
  }

  get pointer() {
    return this._pointer;
  }
}
