import { ResultScreenComponent } from '../../components/result-screen';
import { TimerBarComponent } from '../../components/timer-bar';
import { StorageService } from '../../core/storage';
import { RotatePathEngine } from './engine';
import { Direction, PathTile, RotatePathState } from './types';

export class RotatePathView {
  private element: HTMLElement;
  private engine: RotatePathEngine;
  private unsubscribe?: () => void;
  private timerBar: TimerBarComponent;

  constructor(private onBackToMenu: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'path-game-container';
    this.engine = new RotatePathEngine();
    this.timerBar = new TimerBarComponent(true);

    this.showIntroModal();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private showIntroModal(): void {
    const settings = StorageService.getSettings();
    const durationMins = Math.round(settings.rotateLevelDurationSec / 60);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <div style="text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🧀</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Rotate the Path</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">Accenture Assessment Grid Challenge</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
          <div><strong style="color: #fff;">1.</strong> Guide the mouse from the left entrance to the cheese on the right.</div>
          <div><strong style="color: #fff;">2.</strong> Tap any <strong style="color: #eab308;">3×3 region</strong> to select it.</div>
          <div><strong style="color: #fff;">3.</strong> Use <strong style="color: #fff;">Rotate ↻</strong> (90° clockwise) and <strong style="color: #fff;">Direction ⇄</strong> (reverse flow) to align arrows.</div>
          <div><strong style="color: #fff;">4.</strong> Press <strong style="color: var(--accent-emerald);">Test Path ▶</strong> to test the directed route.</div>
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

    // Standard arrow rotations relative to North (0 deg)
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
        <line x1="50" y1="75" x2="50" y2="28" stroke="#f8fafc" stroke-width="8" stroke-linecap="round" />
        <polygon points="50,20 34,42 66,42" fill="#f8fafc" />
      </g>
    `;
  }

  private getCorridorSvg(tile: PathTile): string {
    if (tile.type === 'empty') return '';

    let corridorPath = '';
    switch (tile.type) {
      case 'straight_h':
        corridorPath = `<rect x="0" y="30" width="100" height="40" class="corridor-bg" />`;
        break;
      case 'straight_v':
        corridorPath = `<rect x="30" y="0" width="40" height="100" class="corridor-bg" />`;
        break;
      case 'corner_ws':
        corridorPath = `
          <rect x="0" y="30" width="70" height="40" class="corridor-bg" />
          <rect x="30" y="30" width="40" height="70" class="corridor-bg" />
        `;
        break;
      case 'corner_wn':
        corridorPath = `
          <rect x="0" y="30" width="70" height="40" class="corridor-bg" />
          <rect x="30" y="0" width="40" height="70" class="corridor-bg" />
        `;
        break;
      case 'corner_es':
        corridorPath = `
          <rect x="30" y="30" width="70" height="40" class="corridor-bg" />
          <rect x="30" y="30" width="40" height="70" class="corridor-bg" />
        `;
        break;
      case 'corner_en':
        corridorPath = `
          <rect x="30" y="30" width="70" height="40" class="corridor-bg" />
          <rect x="30" y="0" width="40" height="70" class="corridor-bg" />
        `;
        break;
      default:
        corridorPath = `<rect x="0" y="30" width="100" height="40" class="corridor-bg" />`;
    }

    return `
      <svg viewBox="0 0 100 100" class="tile-svg">
        ${corridorPath}
        ${this.getArrowSvg(tile.arrow)}
      </svg>
    `;
  }

  private render(state: RotatePathState): void {
    if (state.status === 'final_results') {
      this.showResults(state.stats);
      return;
    }

    if (state.status === 'idle') return;

    const { level, grid, selectedRegion, remainingMs } = state as any;
    const settings = StorageService.getSettings();
    const totalDurationMs = settings.rotateLevelDurationSec * 1000;
    const ratio = totalDurationMs > 0 ? remainingMs / totalDurationMs : 0;

    // Create container shell if not built
    if (!this.element.querySelector('.path-header-bar')) {
      this.element.innerHTML = `
        <div class="path-header-bar">
          <div class="path-level-badge">Level <span class="lvl-num">1</span> / 5</div>
          <div class="path-timer-slot" style="flex: 1; margin: 0 1rem;"></div>
        </div>

        <div class="path-board-wrapper">
          <div class="mouse-marker">🐭</div>
          <div class="path-grid"></div>
          <div class="cheese-marker">🧀</div>
        </div>

        <div class="path-feedback-slot"></div>

        <div class="path-controls-bar">
          <button class="path-ctrl-btn btn-rotate">
            <span class="btn-icon-text">↻</span>
            <span>Rotate 90°</span>
          </button>
          <button class="path-ctrl-btn btn-flip">
            <span class="btn-icon-text">⇄</span>
            <span>Direction</span>
          </button>
          <button class="path-ctrl-btn btn-test">
            <span class="btn-icon-text">▶</span>
            <span>Test Path</span>
          </button>
        </div>
      `;

      this.element.querySelector('.path-timer-slot')?.appendChild(this.timerBar.getElement());

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

    // Update level badge and timer
    const lvlNumEl = this.element.querySelector('.lvl-num');
    if (lvlNumEl) lvlNumEl.textContent = String(level);
    this.timerBar.update(remainingMs || 0, ratio);

    // Update Feedback banner
    const feedbackSlot = this.element.querySelector('.path-feedback-slot');
    if (feedbackSlot) {
      if (state.status === 'path_failed') {
        feedbackSlot.innerHTML = `
          <div class="path-feedback-banner error">
            ${state.reason} — Tap board to continue adjusting!
          </div>
        `;
        feedbackSlot.addEventListener('click', () => this.engine.dismissFailure(), { once: true });
      } else if (state.status === 'path_succeeded') {
        feedbackSlot.innerHTML = `
          <div class="path-feedback-banner success">
            Level Cleared! Path reached the cheese! 🧀
          </div>
        `;
      } else {
        feedbackSlot.innerHTML = '';
      }
    }

    // Render 9x9 Grid Cells
    const gridEl = this.element.querySelector('.path-grid');
    if (gridEl && grid) {
      gridEl.innerHTML = '';

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const tile = grid.tiles[r][c];
          const regionIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
          const localR = r % 3;
          const localC = c % 3;

          const isRegionSelected = selectedRegion === regionIdx;
          const isFailureCell = state.status === 'path_failed' && state.failurePoint?.row === r && state.failurePoint?.col === c;
          const isActiveRunnerCell = state.status === 'testing_path' && (state as any).activeCoord?.row === r && (state as any).activeCoord?.col === c;

          const cell = document.createElement('div');
          cell.className = `region-cell ${isRegionSelected ? 'region-selected' : ''} ${isFailureCell ? 'path-failure' : ''} ${isActiveRunnerCell ? 'path-active' : ''}`;
          cell.dataset.row = String(r);
          cell.dataset.col = String(c);
          cell.dataset.localR = String(localR);
          cell.dataset.localC = String(localC);
          cell.dataset.region = String(regionIdx);

          cell.innerHTML = this.getCorridorSvg(tile);

          // Clicking any cell selects its 3x3 region
          cell.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (state.status === 'path_failed') {
              this.engine.dismissFailure();
            }
            this.engine.selectRegion(regionIdx);
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
        { label: 'Direction Flips', value: stats.flips },
        { label: 'Path Test Attempts', value: stats.testAttempts },
        { label: 'Failed Tests', value: stats.failedTests },
        { label: 'Total Time', value: `${Math.round(stats.totalTimeMs / 1000)}s` },
      ],
      onReplay: () => {
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
