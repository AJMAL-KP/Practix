import { SoundController } from '../core/audio';

export class AppShell {
  private element: HTMLElement;
  private contentSlot!: HTMLElement;
  private soundBtn!: HTMLButtonElement;

  constructor(private onNavigate: (route: string) => void) {
    this.element = document.createElement('div');
    this.element.id = 'app-root';

    SoundController.init();
    this.render();
    this.setupAudioUnlock();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  getContentSlot(): HTMLElement {
    return this.contentSlot;
  }

  private render(): void {
    const isSoundOn = SoundController.isSoundEnabled();

    this.element.innerHTML = `
      <header class="app-header">
        <a href="#home" class="brand-container">
          <div class="brand-logo">P</div>
          <span class="brand-name">Practix</span>
        </a>

        <div class="header-actions">
          <button class="btn-icon btn-sound" title="Toggle Sound" aria-label="Toggle Sound">
            ${isSoundOn ? '🔊' : '🔇'}
          </button>
          <button class="btn-icon btn-history-nav" title="Practice History" aria-label="Practice History">
            📊
          </button>
          <button class="btn-icon btn-settings-nav" title="Timer Settings" aria-label="Timer Settings">
            ⚙️
          </button>
        </div>
      </header>

      <main class="app-content"></main>
    `;

    this.contentSlot = this.element.querySelector('.app-content')!;
    this.soundBtn = this.element.querySelector('.btn-sound')!;

    this.soundBtn.addEventListener('click', () => {
      const nowEnabled = SoundController.toggleSound();
      this.soundBtn.textContent = nowEnabled ? '🔊' : '🔇';
    });

    this.element.querySelector('.btn-history-nav')?.addEventListener('click', () => {
      this.onNavigate('#history');
    });

    this.element.querySelector('.btn-settings-nav')?.addEventListener('click', () => {
      this.onNavigate('#settings');
    });

    this.element.querySelector('.brand-container')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.onNavigate('#home');
    });
  }

  private setupAudioUnlock(): void {
    const unlock = () => {
      SoundController.init();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  updateSoundButton(): void {
    if (this.soundBtn) {
      this.soundBtn.textContent = SoundController.isSoundEnabled() ? '🔊' : '🔇';
    }
  }
}
