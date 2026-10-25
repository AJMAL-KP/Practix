import { DPadComponent } from '../../components/dpad';
import { ResultScreenComponent } from '../../components/result-screen';
import { TimerBarComponent } from '../../components/timer-bar';
import { StorageService } from '../../core/storage';
import { InvisibleWallsEngine } from './engine';
import { InvisibleWallsState, MoveDirection } from './types';

export class InvisibleWallsView {
  private element: HTMLElement;
  private engine: InvisibleWallsEngine;
  private unsubscribe?: () => void;
  private timerBar: TimerBarComponent;
  private keydownHandler?: (e: KeyboardEvent) => void;
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  constructor(private onBackToMenu: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'walls-game-container';
    this.engine = new InvisibleWallsEngine();
    this.timerBar = new TimerBarComponent(true);

    this.showIntroModal();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private showIntroModal(): void {
    const settings = StorageService.getSettings();
    const durationMins = Math.round(settings.invisibleLevelDurationSec / 60);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <div style="text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🧱</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Invisible Walls</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">Accenture Spatial Navigation Assessment</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
          <div><strong style="color: #fff;">1.</strong> Navigate through a 10×10 grid from start (top-left) to exit (bottom-right).</div>
          <div><strong style="color: #fff;">2.</strong> Hidden walls are <strong style="color: var(--accent-rose);">completely invisible</strong> during normal play.</div>
          <div><strong style="color: #fff;">3.</strong> Hitting a hidden wall <strong style="color: #fff;">resets you to start</strong> and drops collected keys. The maze and timer remain intact!</div>
          <div><strong style="color: #fff;">4.</strong> Collect all required keys (<strong style="color: #fbbf24;">🔑</strong>) to unlock the exit door. Levels 1–3 require 1 key; Levels 4–5 require 2 keys.</div>
          <div><strong style="color: #fff;">5.</strong> Move using the D-Pad, Arrow keys / WASD, or swipe gestures. 5 levels (${durationMins}m each).</div>
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

    // Keyboard controls
    this.keydownHandler = (e: KeyboardEvent) => {
      let dir: MoveDirection | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'KeyW':
        case 'w':
          dir = 'up';
          break;
        case 'ArrowDown':
        case 'KeyS':
        case 's':
          dir = 'down';
          break;
        case 'ArrowLeft':
        case 'KeyA':
        case 'a':
          dir = 'left';
          break;
        case 'ArrowRight':
        case 'KeyD':
        case 'd':
          dir = 'right';
          break;
      }
      if (dir) {
        e.preventDefault();
        this.engine.move(dir);
      }
    };
    window.addEventListener('keydown', this.keydownHandler);

    this.engine.startSession();
  }

  private setupSwipeGestures(boardEl: HTMLElement): void {
    boardEl.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    boardEl.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches.length > 0) {
          const deltaX = e.changedTouches[0].clientX - this.touchStartX;
          const deltaY = e.changedTouches[0].clientY - this.touchStartY;
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          if (Math.max(absX, absY) > 25) {
            if (absX > absY) {
              this.engine.move(deltaX > 0 ? 'right' : 'left');
            } else {
              this.engine.move(deltaY > 0 ? 'down' : 'up');
            }
          }
        }
      },
      { passive: true }
    );
  }

  private render(state: InvisibleWallsState): void {
    if (state.status === 'final_results') {
      this.showResults(state.stats);
      return;
    }

    if (state.status === 'idle') return;

    const { level, maze, playerPos, keysRequired, collectedKeyIndices, remainingMs } = state as any;
    const settings = StorageService.getSettings();
    const totalDurationMs = settings.invisibleLevelDurationSec * 1000;
    const ratio = totalDurationMs > 0 ? remainingMs / totalDurationMs : 0;

    // Build DOM structure if not yet constructed
    if (!this.element.querySelector('.walls-header-bar')) {
      this.element.innerHTML = `
        <div class="walls-header-bar">
          <div class="walls-level-badge">Level <span class="lvl-num">1</span> / 5</div>
          <div class="walls-keys-badge">🔑 <span class="keys-num">0</span> / <span class="keys-req">1</span></div>
          <div class="walls-timer-slot" style="flex: 1; margin-left: 0.5rem;"></div>
        </div>

        <div class="walls-board-wrapper">
          <div class="walls-grid"></div>
        </div>

        <div class="walls-feedback-slot"></div>

        <div class="walls-dpad-slot"></div>
      `;

      this.element.querySelector('.walls-timer-slot')?.appendChild(this.timerBar.getElement());

      const dpad = new DPadComponent((dir) => this.engine.move(dir));
      this.element.querySelector('.walls-dpad-slot')?.appendChild(dpad.getElement());

      const boardWrapper = this.element.querySelector('.walls-board-wrapper') as HTMLElement;
      if (boardWrapper) {
        this.setupSwipeGestures(boardWrapper);
      }
    }

    // Update level and keys badges
    const lvlNumEl = this.element.querySelector('.lvl-num');
    if (lvlNumEl) lvlNumEl.textContent = String(level || 1);

    const keysNumEl = this.element.querySelector('.keys-num');
    if (keysNumEl) keysNumEl.textContent = String(collectedKeyIndices?.length || 0);

    const keysReqEl = this.element.querySelector('.keys-req');
    if (keysReqEl) keysReqEl.textContent = String(keysRequired || 1);

    this.timerBar.update(remainingMs || 0, ratio);

    // Board shake on wall collision
    const boardWrapper = this.element.querySelector('.walls-board-wrapper');
    if (boardWrapper) {
      if (state.status === 'wall_collision') {
        boardWrapper.classList.add('board-shake');
      } else {
        boardWrapper.classList.remove('board-shake');
      }
    }

    // Update Feedback slot
    const feedbackSlot = this.element.querySelector('.walls-feedback-slot');
    if (feedbackSlot) {
      if (state.status === 'locked_exit_feedback') {
        feedbackSlot.textContent = '🔒 Exit Locked! Collect all keys first.';
      } else if (state.status === 'wall_collision') {
        feedbackSlot.textContent = '💥 Hidden wall collision! Resetting to start...';
      } else if (state.status === 'resetting') {
        feedbackSlot.textContent = '🔄 Returning to start position...';
      } else if (state.status === 'level_complete') {
        feedbackSlot.textContent = '🎉 Level Complete!';
      } else if (state.status === 'level_transition') {
        feedbackSlot.textContent = `🚀 Preparing Level ${state.nextLevel}...`;
      } else {
        feedbackSlot.textContent = '';
      }
    }

    // Render 10x10 Grid
    const gridEl = this.element.querySelector('.walls-grid');
    if (gridEl && maze) {
      gridEl.innerHTML = '';

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = document.createElement('div');
          const isStart = r === maze.start.row && c === maze.start.col;
          const isExit = r === maze.exit.row && c === maze.exit.col;
          const isPlayer = r === playerPos?.row && c === playerPos?.col;

          const keyIdx = maze.keys.findIndex((k: any) => k.row === r && k.col === c);
          const hasKey = keyIdx !== -1 && !collectedKeyIndices?.includes(keyIdx);
          const keysMissing = (collectedKeyIndices?.length || 0) < (keysRequired || 1);

          cell.className = `maze-cell ${isStart ? 'is-start' : ''} ${isExit ? 'is-exit' : ''} ${
            isExit && keysMissing ? 'locked' : ''
          } ${isExit && state.status === 'locked_exit_feedback' ? 'pulse-locked' : ''}`;

          if (isPlayer) {
            const isCollided = state.status === 'wall_collision';
            const isResetting = state.status === 'resetting';
            cell.innerHTML = `<div class="player-avatar ${isCollided ? 'collided' : ''} ${
              isResetting ? 'resetting' : ''
            }">●</div>`;
          } else if (hasKey) {
            cell.innerHTML = `<span style="font-size: 1.1rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">🔑</span>`;
          } else if (isExit) {
            cell.innerHTML = `<span style="font-size: 1.1rem;">${
              keysMissing ? '🔒' : '🚪'
            }</span>`;
          } else if (isStart) {
            cell.innerHTML = `<span style="font-size: 0.7rem; color: var(--accent-cyan); font-weight: 700;">START</span>`;
          }

          gridEl.appendChild(cell);
        }
      }
    }
  }

  private showResults(stats: any): void {
    const results = new ResultScreenComponent({
      title: 'Invisible Walls Completed!',
      subtitle: 'Session performance summary',
      score: stats.score,
      metrics: [
        { label: 'Levels Completed', value: `${stats.levelsCompleted} / 5`, highlight: true },
        { label: 'Keys Collected', value: stats.keysCollected },
        { label: 'Hidden Wall Collisions', value: stats.wallCollisions },
        { label: 'Resets to Start', value: stats.resets },
        { label: 'Successful Moves', value: stats.successfulMoves ?? 0 },
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
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.engine.destroy();
    this.element.innerHTML = '';
  }
}
