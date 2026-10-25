import { StorageService } from '../../core/storage';

export class HomeView {
  private element: HTMLElement;

  constructor(private onNavigate: (route: string) => void) {
    this.element = document.createElement('div');
    this.element.className = 'home-view';
    this.render();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private render(): void {
    const bests = StorageService.getPersonalBests();

    this.element.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Hero Header -->
        <div style="text-align: center; padding: 1rem 0;">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.25); padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 0.75rem;">
            <span>⚡</span> ACCENTURE ASSESSMENT PRACTICE
          </div>
          <h1 style="font-size: 1.85rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 0.5rem;">
            Cognitive Assessment Suite
          </h1>
          <p style="color: var(--text-secondary); font-size: 0.95rem; max-width: 440px; margin: 0 auto;">
            Prepare for timed recruitment games with genuine rules, randomized puzzles, and instant feedback.
          </p>
        </div>

        <!-- Games Grid -->
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- Game 1: Math Bubble Rush -->
          <div class="card game-card" data-route="#math-bubble" style="cursor: pointer; transition: all var(--transition-normal); border-left: 4px solid var(--accent-cyan);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(6, 182, 212, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🫧</div>
                <div>
                  <h2 style="font-size: 1.15rem; font-weight: 700;">Math Bubble Rush</h2>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">25 Questions • 15s per question</div>
                </div>
              </div>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan); background: rgba(6, 182, 212, 0.1); padding: 0.25rem 0.6rem; border-radius: 6px;">
                Best: ${bests.mathBubbleHighScore.toLocaleString()}
              </span>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4; margin-bottom: 0.75rem;">
              Calculate numerical values in 3 bubbles and tap them in strictly ascending order. Decimals, negatives, and rapid calculations.
            </p>
            <div style="display: flex; justify-content: flex-end;">
              <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Play Rush →</button>
            </div>
          </div>

          <!-- Game 2: Rotate the Path -->
          <div class="card game-card" data-route="#rotate-path" style="cursor: pointer; transition: all var(--transition-normal); border-left: 4px solid var(--accent-amber);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🧀</div>
                <div>
                  <h2 style="font-size: 1.15rem; font-weight: 700;">Rotate the Path</h2>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">5 Levels • 9×9 Grid • 4m per level</div>
                </div>
              </div>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-amber); background: rgba(245, 158, 11, 0.1); padding: 0.25rem 0.6rem; border-radius: 6px;">
                Best: ${bests.rotatePathHighScore.toLocaleString()}
              </span>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4; margin-bottom: 0.75rem;">
              Select 3×3 regions to rotate and flip arrow directions. Connect a continuous directed corridor from the mouse entrance to the cheese.
            </p>
            <div style="display: flex; justify-content: flex-end;">
              <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: linear-gradient(135deg, var(--accent-amber), #d97706); box-shadow: 0 4px 14px var(--accent-amber-glow);">Play Grid →</button>
            </div>
          </div>

          <!-- Game 3: Invisible Walls -->
          <div class="card game-card" data-route="#invisible-walls" style="cursor: pointer; transition: all var(--transition-normal); border-left: 4px solid var(--accent-indigo);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(99, 102, 241, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🧱</div>
                <div>
                  <h2 style="font-size: 1.15rem; font-weight: 700;">Invisible Walls</h2>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">5 Levels • 10×10 Grid • Hidden Maze</div>
                </div>
              </div>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-indigo); background: rgba(99, 102, 241, 0.1); padding: 0.25rem 0.6rem; border-radius: 6px;">
                Best: ${bests.invisibleWallsHighScore.toLocaleString()}
              </span>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.4; margin-bottom: 0.75rem;">
              Navigate invisible maze corridors. Collect all keys to unlock the exit door. Wall collisions bounce you back to the start!
            </p>
            <div style="display: flex; justify-content: flex-end;">
              <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: linear-gradient(135deg, var(--accent-indigo), #4f46e5); box-shadow: 0 4px 14px var(--accent-indigo-glow);">Play Maze →</button>
            </div>
          </div>
        </div>

        <!-- Secondary Navigation -->
        <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 0.5rem;">
          <button class="btn btn-secondary btn-history" style="flex: 1;">📊 Session History</button>
          <button class="btn btn-secondary btn-settings" style="flex: 1;">⚙️ Timer Settings</button>
        </div>
      </div>
    `;

    // Attach listeners
    this.element.querySelectorAll('.game-card').forEach((card) => {
      card.addEventListener('click', () => {
        const route = (card as HTMLElement).dataset.route;
        if (route) this.onNavigate(route);
      });
    });

    this.element.querySelector('.btn-history')?.addEventListener('click', () => {
      this.onNavigate('#history');
    });

    this.element.querySelector('.btn-settings')?.addEventListener('click', () => {
      this.onNavigate('#settings');
    });
  }

  destroy(): void {
    this.element.innerHTML = '';
  }
}
