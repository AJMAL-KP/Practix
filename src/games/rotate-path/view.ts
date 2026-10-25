import { ResultScreenComponent } from '../../components/result-screen';
import { StorageService } from '../../core/storage';
import { RotatePathEngine } from './engine';
import { Direction, PathTile, RotatePathState } from './types';

export class RotatePathView {
  private element: HTMLElement;
  private engine: RotatePathEngine;
  private unsubscribe?: () => void;

  constructor(private onBackToMenu: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'path-game-container';
    this.engine = new RotatePathEngine();

    this.showIntroModal();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private showIntroModal(): void {
    const settings = StorageService.getSettings();
    const durationMins = Math.round((settings.rotateLevelDurationSec ?? 240) / 60);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <div style="text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🚀</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Rotate the Path</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">Accenture Spatial Assessment Challenge</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
          <div><strong style="color: #fff;">1.</strong> Guide the spaceship from the left entrance to the planet on the right.</div>
          <div><strong style="color: #fff;">2.</strong> Tap any <strong style="color: #eab308;">3×3 region</strong> to select it with the yellow frame.</div>
          <div><strong style="color: #fff;">3.</strong> Use <strong style="color: #fff;">🔄 Rotate</strong> (90° clockwise) and <strong style="color: #fff;">⇄ Flip</strong> (reverse flow) to align the route.</div>
          <div><strong style="color: #fff;">4.</strong> Press <strong style="color: var(--accent-emerald);">✓ Test</strong> to watch the rocket follow the path.</div>
          <div><strong style="color: #fff;">5.</strong> 5 progressive levels. ${durationMins} minutes per level.</div>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary btn-block btn-intro-back">Back</button>
          <button class="btn btn-primary btn-block btn-intro-start">Start Game</button>
        </div>
      </div>
    `;

    modal.querySelector('.btn-intro-back')?.addEventListener('click', () => {
      if (modal.parentElement) modal.parentElement.removeChild(modal);
      this.onBackToMenu();
    });

    modal.querySelector('.btn-intro-start')?.addEventListener('click', () => {
      if (modal.parentElement) modal.parentElement.removeChild(modal);
      this.initGameplay();
    });

    this.element.appendChild(modal);
  }

  private initGameplay(): void {
    this.unsubscribe = this.engine.subscribe((state) => {
      this.render(state);
    });

    this.engine.startSession();
  }

  private getArrowSvg(arrow: Direction | null): string {
    if (!arrow) return '';

    const angleMap: Record<Direction, number> = {
      N: 0,
      NE: 45,
      E: 90,
      SE: 135,
      S: 180,
      SW: 225,
      W: 270,
      NW: 315,
    };

    const angle = angleMap[arrow] ?? 0;

    return `
      <g transform="translate(50, 50) rotate(${angle}) translate(-50, -50)">
        <line x1="50" y1="74" x2="50" y2="34" class="corridor-arrow-shaft" />
        <polygon points="50,20 34,42 66,42" class="corridor-arrow-head" />
      </g>
    `;
  }

  private getCorridorSvg(tile: PathTile): string {
    if (tile.type === 'empty' || tile.type === 'blocked') return '';

    let corridorPath = '';
    switch (tile.type) {
      case 'straight_h':
        corridorPath = `<rect x="0" y="26" width="100" height="48" class="corridor-bg" />`;
        break;
      case 'straight_v':
        corridorPath = `<rect x="26" y="0" width="48" height="100" class="corridor-bg" />`;
        break;
      case 'corner_ws':
        corridorPath = `
          <rect x="0" y="26" width="74" height="48" class="corridor-bg" />
          <rect x="26" y="26" width="48" height="74" class="corridor-bg" />
        `;
        break;
      case 'corner_wn':
        corridorPath = `
          <rect x="0" y="26" width="74" height="48" class="corridor-bg" />
          <rect x="26" y="0" width="48" height="74" class="corridor-bg" />
        `;
        break;
      case 'corner_es':
        corridorPath = `
          <rect x="26" y="26" width="74" height="48" class="corridor-bg" />
          <rect x="26" y="26" width="48" height="74" class="corridor-bg" />
        `;
        break;
      case 'corner_en':
        corridorPath = `
          <rect x="26" y="26" width="74" height="48" class="corridor-bg" />
          <rect x="26" y="0" width="48" height="74" class="corridor-bg" />
        `;
        break;
      case 'tee':
        corridorPath = `
          ${tile.ports.includes('W') ? '<rect x="0" y="26" width="50" height="48" class="corridor-bg" />' : ''}
          ${tile.ports.includes('E') ? '<rect x="50" y="26" width="50" height="48" class="corridor-bg" />' : ''}
          ${tile.ports.includes('N') ? '<rect x="26" y="0" width="48" height="50" class="corridor-bg" />' : ''}
          ${tile.ports.includes('S') ? '<rect x="26" y="50" width="48" height="50" class="corridor-bg" />' : ''}
          <rect x="26" y="26" width="48" height="48" class="corridor-bg" />
        `;
        break;
      case 'cross':
        corridorPath = `
          <rect x="0" y="26" width="100" height="48" class="corridor-bg" />
          <rect x="26" y="0" width="48" height="100" class="corridor-bg" />
        `;
        break;
      default:
        corridorPath = `<rect x="0" y="26" width="100" height="48" class="corridor-bg" />`;
    }

    return `
      <svg viewBox="0 0 100 100" class="tile-svg">
        ${corridorPath}
        ${this.getArrowSvg(tile.arrow)}
      </svg>
    `;
  }

  private formatTime(ms: number): string {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private render(state: RotatePathState): void {
    if (state.status === 'final_results') {
      this.showResults(state.stats);
      return;
    }

    if (state.status === 'idle' || state.status === 'intro') return;

    const { level, grid, selectedRegion, remainingMs } = state as any;

    // Build DOM structure if not yet constructed
    if (!this.element.querySelector('.path-board-wrapper')) {
      this.element.innerHTML = `
        <div class="path-header-bar">
          <div class="path-level-badge">Level <span class="lvl-num">1</span> / 5</div>
        </div>

        <div class="path-board-wrapper">
          <div class="mouse-marker" title="Spaceship Entrance">
            <svg viewBox="0 0 24 24" width="28" height="28" class="rocket-icon">
              <path d="M21 12c-4-2.5-9-3.5-14-3.5L3 6v12l4-2.5c5 0 10-1 14-3.5z M5 14v-4l4 1.5v1L5 14z" fill="currentColor"/>
            </svg>
          </div>
          <div class="path-grid"></div>
          <div class="cheese-marker" title="Planet Destination">
            <svg viewBox="0 0 24 24" width="28" height="28" class="planet-icon">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M12 3a9 9 0 0 1 7 13c-2-1-4-1-6 0s-3 3-5 2a9 9 0 0 1 4-15z" fill="currentColor"/>
            </svg>
          </div>
        </div>

        <div class="path-feedback-slot"></div>

        <div class="path-bottom-bar">
          <div class="circular-timer-badge">
            <span class="timer-countdown-text">4:00</span>
          </div>

          <div class="path-controls-group">
            <button class="path-square-btn btn-rotate" title="Rotate selected 3×3 sector 90° clockwise" aria-label="Rotate 90 degrees">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-2.636-6.364M21 3v6h-6" />
              </svg>
            </button>
            <button class="path-square-btn btn-flip" title="Reverse flow directions in sector" aria-label="Flip direction">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
              </svg>
            </button>
            <button class="path-square-btn btn-test" title="Test directed path" aria-label="Test path">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
          </div>
        </div>
      `;

      this.element.querySelector('.btn-rotate')?.addEventListener('click', () => {
        this.engine.rotateSelected();
      });

      this.element.querySelector('.btn-flip')?.addEventListener('click', () => {
        this.engine.flipSelected();
      });

      this.element.querySelector('.btn-test')?.addEventListener('click', () => {
        this.engine.testPath();
      });
    }

    // Update level badge
    const lvlNumEl = this.element.querySelector('.lvl-num');
    if (lvlNumEl) lvlNumEl.textContent = String(level);

    // Update circular timer
    const timerTextEl = this.element.querySelector('.timer-countdown-text');
    if (timerTextEl) {
      timerTextEl.textContent = this.formatTime(remainingMs || 0);
    }

    // Disable buttons during test runner or transitions
    const isBusy =
      state.status === 'testing_path' ||
      state.status === 'path_succeeded' ||
      state.status === 'level_transition';

    const btnRotate = this.element.querySelector('.btn-rotate') as HTMLButtonElement;
    const btnFlip = this.element.querySelector('.btn-flip') as HTMLButtonElement;
    const btnTest = this.element.querySelector('.btn-test') as HTMLButtonElement;

    if (btnRotate) btnRotate.disabled = isBusy || selectedRegion === null;
    if (btnFlip) btnFlip.disabled = isBusy || selectedRegion === null;
    if (btnTest) btnTest.disabled = isBusy;

    // Update Feedback banner
    const feedbackSlot = this.element.querySelector('.path-feedback-slot');
    if (feedbackSlot) {
      if (state.status === 'path_failed') {
        feedbackSlot.innerHTML = `
          <div class="path-feedback-banner error">
            ${state.reason} — Tap to dismiss
          </div>
        `;
        feedbackSlot.addEventListener('click', () => this.engine.dismissFailure(), {
          once: true,
        });
      } else if (state.status === 'path_succeeded') {
        feedbackSlot.innerHTML = `
          <div class="path-feedback-banner success">
            Level Cleared! Path reached the destination! 🪐
          </div>
        `;
      } else if (state.status === 'level_transition') {
        feedbackSlot.innerHTML = `
          <div class="path-feedback-banner success">
            Advancing to Level ${(state as any).nextLevel}...
          </div>
        `;
      } else {
        feedbackSlot.innerHTML = '';
      }
    }

    // Render 9x9 Grid Cells
    const gridEl = this.element.querySelector('.path-grid');
    if (gridEl && grid && grid.tiles) {
      gridEl.innerHTML = '';

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const tile = grid.tiles[r][c];
          const regionIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
          const localR = r % 3;
          const localC = c % 3;

          const isRegionSelected = selectedRegion === regionIdx;
          const isFailureCell =
            state.status === 'path_failed' &&
            state.failurePoint?.row === r &&
            state.failurePoint?.col === c;
          const isActiveRunnerCell =
            state.status === 'testing_path' &&
            (state as any).activeCoord?.row === r &&
            (state as any).activeCoord?.col === c;

          const cell = document.createElement('div');
          cell.className = `region-cell ${isRegionSelected ? 'region-selected' : ''} ${
            isFailureCell ? 'path-failure' : ''
          } ${isActiveRunnerCell ? 'path-active' : ''}`;
          cell.dataset.row = String(r);
          cell.dataset.col = String(c);
          cell.dataset.localR = String(localR);
          cell.dataset.localC = String(localC);
          cell.dataset.region = String(regionIdx);

          cell.innerHTML = this.getCorridorSvg(tile);

          cell.addEventListener('click', () => {
            if (!isBusy) {
              this.engine.selectRegion(regionIdx);
            }
          });

          gridEl.appendChild(cell);
        }
      }
    }
  }

  private showResults(stats: any): void {
    const results = new ResultScreenComponent({
      title: 'Rotate the Path Completed!',
      subtitle: 'Session performance summary',
      score: stats.score,
      metrics: [
        { label: 'Levels Completed', value: `${stats.levelsCompleted} / 5`, highlight: true },
        { label: 'Rotations Performed', value: stats.rotations },
        { label: 'Flips Applied', value: stats.flips },
        { label: 'Test Path Attempts', value: stats.testAttempts },
        { label: 'Failed Tests', value: stats.failedTests },
        { label: 'Total Time', value: `${Math.round(stats.totalTimeMs / 1000)}s` },
      ],
      onReplay: () => {
        this.element.innerHTML = '';
        this.engine.startSession();
      },
      onHome: () => {
        this.destroy();
        this.onBackToMenu();
      },
    });

    this.element.appendChild(results.getElement());
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.engine.destroy();
    this.element.innerHTML = '';
  }
}
