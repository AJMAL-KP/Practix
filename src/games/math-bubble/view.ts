import { ResultScreenComponent } from '../../components/result-screen';
import { StorageService } from '../../core/storage';
import { MathBubbleEngine } from './engine';
import { MathBubbleState, MathQuestionReview } from './types';

export class MathBubbleView {
  private element: HTMLElement;
  private engine: MathBubbleEngine;
  private unsubscribe?: () => void;

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
    const durationSec = settings.mathQuestionDurationSec ?? 15;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <div style="text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">⚡</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Math Bubble Rush</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">Accenture Mental Arithmetic Assessment</p>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
          <div><strong style="color: #fff;">1.</strong> Evaluate the arithmetic expressions on all 3 bubbles.</div>
          <div><strong style="color: #fff;">2.</strong> Tap all 3 bubbles in strictly <strong style="color: var(--accent-cyan);">ascending order</strong> (smallest to largest).</div>
          <div><strong style="color: #fff;">3.</strong> Once all 3 are tapped, a <strong style="color: #10b981;">green</strong> or <strong style="color: #f43f5e;">red</strong> light reveals if your order was correct.</div>
          <div><strong style="color: #fff;">4.</strong> 25 questions total (${durationSec}s per question). Review all incorrect ones at the end!</div>
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
    if (state.status === 'results') {
      this.showResults(state.stats);
      return;
    }

    if (state.status === 'intro' || state.status === 'ready') {
      return;
    }

    const { questionIndex, question, selectedIds, remainingMs } = state as any;
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
            <div class="math-eval-status"></div>
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

    // Update Evaluation Light Status
    const evalStatusEl = this.element.querySelector('.math-eval-status');
    if (evalStatusEl) {
      if (state.status === 'evaluation_feedback') {
        if (state.isCorrect) {
          evalStatusEl.className = 'math-eval-status green-light';
          evalStatusEl.textContent = '✓ Correct';
        } else {
          evalStatusEl.className = 'math-eval-status red-light';
          evalStatusEl.textContent = '✕ Incorrect';
        }
      } else if (state.status === 'question_timeout') {
        evalStatusEl.className = 'math-eval-status red-light';
        evalStatusEl.textContent = '⏰ Time Out';
      } else {
        evalStatusEl.className = 'math-eval-status';
        evalStatusEl.textContent = '';
      }
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

    // Render 3 Bubbles in Organic Arena
    const arena = this.element.querySelector('.math-bubbles-arena');
    if (arena && question && question.bubbles) {
      arena.innerHTML = '';
      question.bubbles.forEach((bubble: any) => {
        const isSelected = selectedIds?.includes(bubble.id);
        const orderIdx = selectedIds ? selectedIds.indexOf(bubble.id) : -1;

        const isEvalCorrect = state.status === 'evaluation_feedback' && state.isCorrect;
        const isEvalIncorrect = state.status === 'evaluation_feedback' && !state.isCorrect;

        const slot = document.createElement('div');
        slot.className = 'bubble-slot';

        const bubbleEl = document.createElement('div');
        bubbleEl.className = `math-bubble ${isSelected ? 'selected' : ''} ${
          isEvalCorrect ? 'eval-correct' : ''
        } ${isEvalIncorrect ? 'eval-incorrect' : ''}`;
        bubbleEl.innerHTML = `<span class="bubble-expression">${bubble.expression}</span>`;

        if (isSelected) {
          const badge = document.createElement('div');
          badge.className = `bubble-sequence-badge ${isEvalCorrect ? 'green' : ''} ${
            isEvalIncorrect ? 'red' : ''
          }`;
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
    const wrongQuestions: MathQuestionReview[] = stats.wrongQuestions || [];

    const results = new ResultScreenComponent({
      title: 'Math Bubble Rush Completed!',
      subtitle: 'Session performance summary',
      score: stats.score,
      metrics: [
        { label: 'Completed Questions', value: `${stats.completedQuestions} / 25`, highlight: true },
        { label: 'Accuracy', value: `${stats.accuracy}%`, highlight: true },
        { label: 'Incorrect Answers', value: stats.incorrectTaps },
        { label: 'Timed Out Questions', value: stats.timedOutQuestions },
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

    const resEl = results.getElement();

    // Append Review of Wrong Questions
    const reviewContainer = document.createElement('div');
    reviewContainer.className = 'wrong-questions-review-container';

    if (wrongQuestions.length === 0) {
      reviewContainer.innerHTML = `
        <div class="perfect-score-banner">
          <span style="font-size: 1.5rem;">🌟</span>
          <strong>Flawless Session!</strong> You answered all 25 questions correctly.
        </div>
      `;
    } else {
      let wrongCardsHtml = '';
      wrongQuestions.forEach((q) => {
        const bubbleMap: Record<string, string> = {};
        q.bubbles.forEach((b) => {
          bubbleMap[b.id] = `${b.expression} = ${b.value.toString()}`;
        });

        const userOrderDisplay =
          q.userOrderIds.length > 0
            ? q.userOrderIds.map((id) => `<span class="tag-wrong">${bubbleMap[id] || id}</span>`).join(' ➔ ')
            : '<span class="tag-timedout">No answers submitted (Timed Out)</span>';

        const correctOrderDisplay = q.correctOrderIds
          .map((id) => `<span class="tag-correct">${bubbleMap[id]}</span>`)
          .join(' ➔ ');

        wrongCardsHtml += `
          <div class="wrong-card">
            <div class="wrong-card-header">
              <span class="q-badge">Question #${q.questionIndex + 1}</span>
              <span class="status-badge ${q.isTimedOut ? 'timeout' : 'wrong'}">
                ${q.isTimedOut ? '⏰ Timed Out' : '✕ Incorrect'}
              </span>
            </div>
            <div class="wrong-card-body">
              <div class="order-row">
                <span class="order-label">Your Order:</span>
                <div class="order-tags">${userOrderDisplay}</div>
              </div>
              <div class="order-row">
                <span class="order-label">Correct Ascending:</span>
                <div class="order-tags">${correctOrderDisplay}</div>
              </div>
            </div>
          </div>
        `;
      });

      reviewContainer.innerHTML = `
        <div class="wrong-review-header">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem;">
            Review Incorrect Questions (${wrongQuestions.length})
          </h3>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Compare your selections with the mathematically verified ascending order:
          </p>
        </div>
        <div class="wrong-cards-scroll">
          ${wrongCardsHtml}
        </div>
      `;
    }

    resEl.appendChild(reviewContainer);
    this.element.appendChild(resEl);
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.engine.destroy();
    this.element.innerHTML = '';
  }
}
