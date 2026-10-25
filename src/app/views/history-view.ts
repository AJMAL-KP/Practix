import { StorageService } from '../../core/storage';

export class HistoryView {
  private element: HTMLElement;

  constructor(private onBack: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'history-view';
    this.render();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private render(): void {
    const history = StorageService.getHistory();

    const gameNames: Record<string, { name: string; emoji: string; color: string }> = {
      'math-bubble': { name: 'Math Bubble Rush', emoji: '🫧', color: 'var(--accent-cyan)' },
      'rotate-path': { name: 'Rotate the Path', emoji: '🧀', color: 'var(--accent-amber)' },
      'invisible-walls': { name: 'Invisible Walls', emoji: '🧱', color: 'var(--accent-indigo)' },
    };

    const historyItemsHtml = history.length === 0
      ? `<div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">No practice sessions recorded yet. Complete a game to see your performance here!</div>`
      : history.map((rec) => {
          const game = gameNames[rec.gameId] || { name: rec.gameId, emoji: '🎮', color: '#fff' };
          const dateStr = new Date(rec.timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const detailsStr = Object.entries(rec.details)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1')}: <strong>${v}</strong>`)
            .join(' • ');

          return `
            <div class="card" style="display: flex; flex-direction: column; gap: 0.5rem; border-left: 3px solid ${game.color};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 1.25rem;">${game.emoji}</span>
                  <span style="font-weight: 700; font-size: 0.95rem;">${game.name}</span>
                </div>
                <div style="font-weight: 900; font-size: 1.15rem; color: ${game.color};">${rec.score.toLocaleString()} pts</div>
              </div>

              <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">
                ${detailsStr}
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                <span>${dateStr}</span>
                <span>Time: ${rec.timeUsedSec}s</span>
              </div>
            </div>
          `;
        }).join('');

    this.element.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <h2 style="font-size: 1.5rem; font-weight: 800;">Session History</h2>
          <button class="btn btn-secondary btn-back-history" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">← Back</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${historyItemsHtml}
        </div>
      </div>
    `;

    this.element.querySelector('.btn-back-history')?.addEventListener('click', () => {
      this.onBack();
    });
  }

  destroy(): void {
    this.element.innerHTML = '';
  }
}
