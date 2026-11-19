// Keyboard and pointer input with edge-triggered actions for enter, weapon and fire.
export class Input {
  constructor(onStart) {
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouseDown = false;
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (!this.keys.has(key)) this.pressed.add(key);
      this.keys.add(key);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(key)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (this.keys.has(key)) this.released.add(key);
      this.keys.delete(key);
    });
    window.addEventListener('mousedown', (event) => { this.mouseDown = true; this.pressed.add('mouse' + event.button); if (event.button === 0) this.pressed.add('mouse0'); onStart?.(); });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('blur', () => this.keys.clear());
  }

  down(...codes) {
    for (const code of codes) if (this.keys.has(code)) return true;
    return false;
  }

  justPressed(code) {
    return this.pressed.has(code);
  }

  justReleased(code) {
    return this.released.has(code);
  }

  endFrame() { this.pressed.clear(); this.released.clear(); }
}
