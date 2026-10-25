export class TimerBarComponent {
  private element: HTMLElement;
  private fillElement!: HTMLElement;
  private labelElement?: HTMLElement;

  constructor(showLabel: boolean = false) {
    this.element = document.createElement('div');
    this.element.className = 'timer-bar-wrapper';

    let html = `<div class="timer-bar-container"><div class="timer-bar-fill"></div></div>`;
    if (showLabel) {
      html += `<div class="timer-bar-label" style="text-align: right; font-family: var(--font-mono); font-size: 0.85rem; margin-top: 4px; color: var(--text-secondary);"></div>`;
    }

    this.element.innerHTML = html;
    this.fillElement = this.element.querySelector('.timer-bar-fill')!;
    if (showLabel) {
      this.labelElement = this.element.querySelector('.timer-bar-label')!;
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }

  update(remainingMs: number, ratio: number): void {
    const pct = Math.max(0, Math.min(100, ratio * 100));
    this.fillElement.style.width = `${pct}%`;

    if (ratio < 0.15) {
      this.fillElement.className = 'timer-bar-fill critical';
    } else if (ratio < 0.35) {
      this.fillElement.className = 'timer-bar-fill warning';
    } else {
      this.fillElement.className = 'timer-bar-fill';
    }

    if (this.labelElement) {
      const totalSec = Math.ceil(remainingMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      this.labelElement.textContent = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${(remainingMs / 1000).toFixed(1)}s`;
    }
  }
}
