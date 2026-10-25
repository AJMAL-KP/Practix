export class DPadComponent {
  private element: HTMLElement;

  constructor(onDirection: (direction: 'up' | 'down' | 'left' | 'right') => void) {
    this.element = document.createElement('div');
    this.element.className = 'dpad-container';

    this.element.innerHTML = `
      <button class="dpad-btn dpad-up" aria-label="Move Up">▲</button>
      <button class="dpad-btn dpad-left" aria-label="Move Left">◀</button>
      <div class="dpad-btn dpad-center"></div>
      <button class="dpad-btn dpad-right" aria-label="Move Right">▶</button>
      <button class="dpad-btn dpad-down" aria-label="Move Down">▼</button>
    `;

    const bindAction = (selector: string, dir: 'up' | 'down' | 'left' | 'right') => {
      const btn = this.element.querySelector(selector);
      if (btn) {
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          onDirection(dir);
        });
      }
    };

    bindAction('.dpad-up', 'up');
    bindAction('.dpad-down', 'down');
    bindAction('.dpad-left', 'left');
    bindAction('.dpad-right', 'right');
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
