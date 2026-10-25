import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';

export class SettingsView {
  private element: HTMLElement;

  constructor(private onBack: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'settings-view';
    this.render();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private render(): void {
    const settings = StorageService.getSettings();

    this.element.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h2 style="font-size: 1.5rem; font-weight: 800;">Settings & Timers</h2>
          <button class="btn btn-secondary btn-back-settings" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">← Back</button>
        </div>

        <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <!-- Sound Toggle -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid var(--border-subtle);">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">Sound Effects</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">Synthesized Web Audio beeps and fanfares</div>
            </div>
            <label style="position: relative; display: inline-block; width: 48px; height: 26px;">
              <input type="checkbox" id="sound-toggle" ${settings.soundEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span class="toggle-slider" style="position: absolute; cursor: pointer; inset: 0; background-color: ${settings.soundEnabled ? 'var(--accent-emerald)' : '#334155'}; border-radius: 34px; transition: .2s;">
                <span style="position: absolute; height: 18px; width: 18px; left: ${settings.soundEnabled ? '26px' : '4px'}; bottom: 4px; background-color: white; border-radius: 50%; transition: .2s;"></span>
              </span>
            </label>
          </div>

          <!-- Math Timer -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
              <span style="font-weight: 700;">Math Bubble Rush</span>
              <span style="color: var(--accent-cyan); font-weight: 700;"><span id="math-val">${settings.mathQuestionDurationSec}</span>s / question</span>
            </div>
            <input type="range" id="math-slider" min="5" max="60" step="1" value="${settings.mathQuestionDurationSec}" style="width: 100%; accent-color: var(--accent-cyan);">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Default: 15 seconds per question (Total: 6m 15s)</div>
          </div>

          <!-- Rotate Timer -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
              <span style="font-weight: 700;">Rotate the Path</span>
              <span style="color: var(--accent-amber); font-weight: 700;"><span id="rotate-val">${settings.rotateLevelDurationSec}</span>s / level</span>
            </div>
            <input type="range" id="rotate-slider" min="60" max="600" step="30" value="${settings.rotateLevelDurationSec}" style="width: 100%; accent-color: var(--accent-amber);">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Default: 240 seconds (4 minutes) per level</div>
          </div>

          <!-- Invisible Walls Timer -->
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
              <span style="font-weight: 700;">Invisible Walls</span>
              <span style="color: var(--accent-indigo); font-weight: 700;"><span id="walls-val">${settings.invisibleLevelDurationSec}</span>s / level</span>
            </div>
            <input type="range" id="walls-slider" min="60" max="600" step="30" value="${settings.invisibleLevelDurationSec}" style="width: 100%; accent-color: var(--accent-indigo);">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Default: 240 seconds (4 minutes) per level</div>
          </div>
        </div>

        <button class="btn btn-primary btn-save-settings">Save Preferences</button>
      </div>
    `;

    // Sliders live text update
    const mathSlider = this.element.querySelector('#math-slider') as HTMLInputElement;
    const mathVal = this.element.querySelector('#math-val') as HTMLElement;
    mathSlider?.addEventListener('input', () => {
      mathVal.textContent = mathSlider.value;
    });

    const rotateSlider = this.element.querySelector('#rotate-slider') as HTMLInputElement;
    const rotateVal = this.element.querySelector('#rotate-val') as HTMLElement;
    rotateSlider?.addEventListener('input', () => {
      rotateVal.textContent = rotateSlider.value;
    });

    const wallsSlider = this.element.querySelector('#walls-slider') as HTMLInputElement;
    const wallsVal = this.element.querySelector('#walls-val') as HTMLElement;
    wallsSlider?.addEventListener('input', () => {
      wallsVal.textContent = wallsSlider.value;
    });

    const soundToggle = this.element.querySelector('#sound-toggle') as HTMLInputElement;
    soundToggle?.addEventListener('change', () => {
      SoundController.setSoundEnabled(soundToggle.checked);
      this.render();
    });

    this.element.querySelector('.btn-save-settings')?.addEventListener('click', () => {
      StorageService.saveSettings({
        mathQuestionDurationSec: Number(mathSlider.value),
        rotateLevelDurationSec: Number(rotateSlider.value),
        invisibleLevelDurationSec: Number(wallsSlider.value),
        soundEnabled: soundToggle.checked,
      });
      this.onBack();
    });

    this.element.querySelector('.btn-back-settings')?.addEventListener('click', () => {
      this.onBack();
    });
  }

  destroy(): void {
    this.element.innerHTML = '';
  }
}
