import { AppShell } from './app/app-shell';
import { AppRouter } from './app/router';
import './styles/main.css';
import './styles/math-bubble.css';
import './styles/rotate-path.css';
import './styles/invisible-walls.css';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (!root) return;

  const shell = new AppShell((route) => {
    router.navigate(route);
  });

  root.appendChild(shell.getElement());

  const router = new AppRouter(shell);
  router.route();
});
