export interface ResultMetric {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface ResultScreenProps {
  title: string;
  subtitle?: string;
  score: number;
  metrics: ResultMetric[];
  onReplay: () => void;
  onHome: () => void;
}

export class ResultScreenComponent {
  private element: HTMLElement;

  constructor(props: ResultScreenProps) {
    this.element = document.createElement('div');
    this.element.className = 'modal-overlay';

    const metricsHtml = props.metrics
      .map(
        (m) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0; border-bottom: 1px solid var(--border-subtle);">
          <span style="color: var(--text-secondary); font-size: 0.9rem;">${m.label}</span>
          <span style="font-weight: 700; font-size: 0.95rem; color: ${m.highlight ? 'var(--accent-cyan)' : 'var(--text-primary)'};">${m.value}</span>
        </div>
      `
      )
      .join('');

    this.element.innerHTML = `
      <div class="modal-card">
        <div style="text-align: center;">
          <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.25rem;">${props.title}</h2>
          ${props.subtitle ? `<p style="color: var(--text-secondary); font-size: 0.85rem;">${props.subtitle}</p>` : ''}
        </div>

        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 1.25rem; text-align: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);">
          <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; margin-bottom: 0.25rem;">Final Score</div>
          <div style="font-size: 2.5rem; font-weight: 900; background: linear-gradient(135deg, var(--accent-cyan), var(--accent-emerald)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${props.score.toLocaleString()}</div>
        </div>

        <div style="display: flex; flex-direction: column;">
          ${metricsHtml}
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
          <button class="btn btn-secondary btn-block btn-home">Main Menu</button>
          <button class="btn btn-primary btn-block btn-replay">Play Again</button>
        </div>
      </div>
    `;

    this.element.querySelector('.btn-replay')?.addEventListener('click', () => {
      this.destroy();
      props.onReplay();
    });

    this.element.querySelector('.btn-home')?.addEventListener('click', () => {
      this.destroy();
      props.onHome();
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
