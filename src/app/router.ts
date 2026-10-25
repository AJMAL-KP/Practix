import { InvisibleWallsView } from '../games/invisible-walls/view';
import { MathBubbleView } from '../games/math-bubble/view';
import { RotatePathView } from '../games/rotate-path/view';
import { AppShell } from './app-shell';
import { HistoryView } from './views/history-view';
import { HomeView } from './views/home-view';
import { SettingsView } from './views/settings-view';

interface Destroyable {
  destroy(): void;
  getElement(): HTMLElement;
}

export class AppRouter {
  private currentView: Destroyable | null = null;

  constructor(private shell: AppShell) {
    window.addEventListener('hashchange', () => {
      this.route();
    });
  }

  navigate(route: string): void {
    if (window.location.hash !== route) {
      window.location.hash = route;
    } else {
      this.route();
    }
  }

  route(): void {
    const hash = window.location.hash || '#home';
    const contentSlot = this.shell.getContentSlot();

    // Cleanup active view
    if (this.currentView) {
      this.currentView.destroy();
      this.currentView = null;
    }
    contentSlot.innerHTML = '';

    const backToHome = () => this.navigate('#home');

    switch (hash) {
      case '#math-bubble':
        this.currentView = new MathBubbleView(backToHome);
        break;
      case '#rotate-path':
        this.currentView = new RotatePathView(backToHome);
        break;
      case '#invisible-walls':
        this.currentView = new InvisibleWallsView(backToHome);
        break;
      case '#settings':
        this.currentView = new SettingsView(backToHome);
        break;
      case '#history':
        this.currentView = new HistoryView(backToHome);
        break;
      case '#home':
      default:
        this.currentView = new HomeView((r) => this.navigate(r));
        break;
    }

    if (this.currentView) {
      contentSlot.appendChild(this.currentView.getElement());
    }

    this.shell.updateSoundButton();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
