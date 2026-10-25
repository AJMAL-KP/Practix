import { ResultScreenComponent } from '../../components/result-screen';
import { StorageService } from '../../core/storage';
import { MathBubbleEngine } from './engine';
import { MathBubbleState } from './types';

export class MathBubbleView {
  private element: HTMLElement;
  private engine: MathBubbleEngine;
  private unsubscribe?: () => void;
  private currentDurationSec: number = 15;

  constructor(private onBackToMenu: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'math-game-container';
    this.engine = new MathBubbleEngine();

    this.showIntroModal();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private showIntroModal(): void {
    const settings = StorageService.getSettings();
    this.currentDurationSec = settings.mathQuestionDurationSec ?? 15;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <div style="text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🫧</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Math Bubble Rush</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">Accenture Timed Practice Assessment</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
          <div><strong style="color: #fff;">1.</strong> Evaluate arithmetic values in 3 floating bubbles.</div>
          <div><strong style="color: #fff;">2.</strong> Tap bubbles in <strong style="color: var(--accent-cyan);">strictly ascending order</strong> (lowest to highest).</div>
          <div><strong style="color: #fff;">3.</strong> 25 questions total. ${this.currentDurationSec} seconds per question.</div>
          <div><strong style="color: #fff;">4.</strong> Wrong taps incur a penalty. Timed-out questions score 0 points.</div>
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

  private render(state: MathBubbleState): void {
    if (state.status === 'session_complete' || state.status === 'results') {
      this.showResults(state.stats);
      return;
    }

    if (state.status === 'intro') {
      return;
    }

    const { questionIndex, question, selectedIds, remainingMs, penaltyCount } = state as any;
    const settings = StorageService.getSettings();
    const totalDurationMs = (settings.mathQuestionDurationSec ?? 15) * 1000;
    const safeRemainingMs = Math.max(0, remainingMs || 0);
    const ratio = totalDurationMs > 0 ? Math.min(1, Math.max(0, safeRemainingMs / totalDurationMs)) : 0;
    const remainingSecFormatted = (safeRemainingMs / 1000).toFixed(0);

    // Build or update DOM shell
    if (!this.element.querySelector('.math-top-bar')) {
      this.element.innerHTML = `
        <div class="math-top-bar">
          <div class="math-status-row">
            <div class="math-countdown-display">
              <span class="math-countdown-number">${remainingSecFormatted}</span>
              <span class="math-countdown-unit">s</span>
            </div>
            <div class="math-question-indicator">
              Question <span class="q-num">${questionIndex + 1}</span> / 25
            </div>
            <div class="math-penalty-indicator" style="display: ${penaltyCount > 0 ? 'block' : 'none'};">
              Penalties: <span class="p-num">${penaltyCount || 0}</span>
            </div>
          </div>
          <div class="math-progress-wrapper">
            <div class="math-progress-fill"></div>
          </div>
        </div>
        <div class="math-bubbles-arena"></div>
      `;
    }

    // Update Header Numbers
    const countEl = this.element.querySelector('.math-countdown-number');
    const displayEl = this.element.querySelector('.math-countdown-display');
    if (countEl) countEl.textContent = remainingSecFormatted;

    if (displayEl) {
      if (ratio < 0.2) {
        displayEl.className = 'math-countdown-display critical';
      } else if (ratio < 0.4) {
        displayEl.className = 'math-countdown-display warning';
      } else {
        displayEl.className = 'math-countdown-display';
      }
    }

    const qNumEl = this.element.querySelector('.q-num');
    if (qNumEl) qNumEl.textContent = String(questionIndex + 1);

    const pIndEl = this.element.querySelector('.math-penalty-indicator') as HTMLElement;
    const pNumEl = this.element.querySelector('.p-num');
    if (pIndEl && pNumEl) {
      pNumEl.textContent = String(penaltyCount || 0);
      pIndEl.style.display = penaltyCount > 0 ? 'block' : 'none';
    }

    // Update Progress Bar
    const fillEl = this.element.querySelector('.math-progress-fill') as HTMLElement;
    if (fillEl) {
      fillEl.style.width = `${(ratio * 100).toFixed(1)}%`;
      if (ratio < 0.2) {
        fillEl.className = 'math-progress-fill critical';
      } else if (ratio < 0.4) {
        fillEl.className = 'math-progress-fill warning';
      } else {
        fillEl.className = 'math-progress-fill';
      }
    }

    // Celebration indicator
    if (state.status === 'question_complete') {
      this.element.classList.add('cleared-celebration');
    } else {
      this.element.classList.remove('cleared-celebration');
    }

    // Render 3 Bubbles in Organic Arena
    const arena = this.element.querySelector('.math-bubbles-arena');
    if (arena && question && question.bubbles) {
      arena.innerHTML = '';
      question.bubbles.forEach((bubble: any) => {
        const isSelected = selectedIds?.includes(bubble.id);
        const orderIdx = selectedIds ? selectedIds.indexOf(bubble.id) : -1;
        const isIncorrectFeedback =
          state.status === 'selection_feedback' &&
          (state as any).feedbackId === bubble.id &&
          (state as any).feedbackType === 'incorrect';

        const slot = document.createElement('div');
        slot.className = 'bubble-slot';

        const bubbleEl = document.createElement('div');
        bubbleEl.className = `math-bubble ${isSelected ? 'selected' : ''} ${isIncorrectFeedback ? 'incorrect' : ''}`;
        bubbleEl.innerHTML = `<span class="bubble-expression">${bubble.expression}</span>`;

        if (isSelected) {
          const badge = document.createElement('div');
          badge.className = 'bubble-sequence-badge';
          badge.textContent = String(orderIdx + 1);
          bubbleEl.appendChild(badge);
        }

        bubbleEl.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.engine.tapBubble(bubble.id);
        });

        slot.appendChild(bubbleEl);
        arena.appendChild(slot);
      });
    }
  }

  private showResults(stats: any): void {
    const tierNames = ['Novice', 'Intermediate', 'Advanced', 'Master'];
    const highestTierName = tierNames[(stats.highestDifficultyTier || 1) - 1] || 'Novice';

    const results = new ResultScreenComponent({
      title: 'Math Bubble Rush Completed!',
      subtitle: 'Session performance summary',
      score: stats.score,
      metrics: [
        { label: 'Completed Questions', value: `${stats.completedQuestions} / 25`, highlight: true },
        { label: 'Correct Bubbles Selected', value: `${stats.correctSelections} / 75` },
        { label: 'Accuracy', value: `${stats.accuracy}%`, highlight: true },
        { label: 'Incorrect Taps (Penalties)', value: stats.incorrectTaps },
        { label: 'Timed Out Questions', value: stats.timedOutQuestions },
        { label: 'Highest Tier Reached', value: highestTierName },
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
