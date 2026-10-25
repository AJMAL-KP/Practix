import { ResultScreenComponent } from '../../components/result-screen';
import { TimerBarComponent } from '../../components/timer-bar';
import { StorageService } from '../../core/storage';
import { MathBubbleEngine } from './engine';
import { MathBubbleState } from './types';

export class MathBubbleView {
  private element: HTMLElement;
  private engine: MathBubbleEngine;
  private unsubscribe?: () => void;
  private timerBar: TimerBarComponent;

  constructor(private onBackToMenu: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'math-game-container';
    this.engine = new MathBubbleEngine();
    this.timerBar = new TimerBarComponent(true);

    this.showIntroModal();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private showIntroModal(): void {
    const settings = StorageService.getSettings();
    const duration = settings.mathQuestionDurationSec;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <div style="text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🫧</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Math Bubble Rush</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">Accenture Cognitive Practice Assessment</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
          <div><strong style="color: #fff;">1.</strong> Evaluate arithmetic values in 3 floating bubbles.</div>
          <div><strong style="color: #fff;">2.</strong> Tap bubbles in <strong style="color: var(--accent-cyan);">strictly ascending order</strong> (lowest to highest).</div>
          <div><strong style="color: #fff;">3.</strong> 25 questions total. ${duration} seconds per question.</div>
          <div><strong style="color: #fff;">4.</strong> Wrong taps incur a penalty. Fast correct answers award speed bonuses.</div>
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
    if (state.status === 'session_complete') {
      this.showResults(state.stats);
      return;
    }

    if (state.status === 'idle') {
      return;
    }

    const { questionIndex, question, selectedIds, remainingMs, penaltyCount } = state as any;
    const settings = StorageService.getSettings();
    const totalDurationMs = settings.mathQuestionDurationSec * 1000;
    const ratio = totalDurationMs > 0 ? remainingMs / totalDurationMs : 0;

    // Build or update DOM
    if (!this.element.querySelector('.math-header-bar')) {
      this.element.innerHTML = `
        <div class="math-header-bar">
          <div class="math-question-badge">Question <span class="q-num">1</span> / 25</div>
          <div class="math-penalties-badge">Penalties: <span class="p-num">0</span></div>
        </div>
        <div class="math-timer-slot"></div>
        <div class="math-instruction-hint">Select bubbles in ascending numerical order</div>
        <div class="math-bubbles-arena"></div>
      `;

      this.element.querySelector('.math-timer-slot')?.appendChild(this.timerBar.getElement());
    }

    // Update Header
    const qNumEl = this.element.querySelector('.q-num');
    if (qNumEl) qNumEl.textContent = String(questionIndex + 1);

    const pNumEl = this.element.querySelector('.p-num');
    if (pNumEl) pNumEl.textContent = String(penaltyCount || 0);

    // Update Timer Bar
    this.timerBar.update(remainingMs || 0, ratio);

    // Render Bubbles Arena
    const arena = this.element.querySelector('.math-bubbles-arena');
    if (arena && question) {
      arena.innerHTML = '';
      question.bubbles.forEach((bubble: any) => {
        const isSelected = selectedIds?.includes(bubble.id);
        const orderIdx = selectedIds ? selectedIds.indexOf(bubble.id) : -1;
        const isIncorrectFeedback = state.status === 'selection_feedback' && (state as any).feedbackId === bubble.id;

        const wrapper = document.createElement('div');
        wrapper.className = 'math-bubble-wrapper';

        const bubbleEl = document.createElement('div');
        bubbleEl.className = `math-bubble ${isSelected ? 'selected' : ''} ${isIncorrectFeedback ? 'incorrect' : ''}`;
        bubbleEl.innerHTML = `<span class="bubble-expression">${bubble.expression}</span>`;

        if (isSelected) {
          const badge = document.createElement('div');
          badge.className = 'bubble-badge';
          badge.textContent = String(orderIdx + 1);
          bubbleEl.appendChild(badge);
        }

        bubbleEl.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.engine.tapBubble(bubble.id);
        });

        wrapper.appendChild(bubbleEl);
        arena.appendChild(wrapper);
      });
    }
  }

  private showResults(stats: any): void {
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
