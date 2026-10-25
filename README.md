# Practix — Timed Practice Game Suite

Practix is a mobile-first, high-performance web application containing three timed practice games inspired by cognitive assessments used in corporate recruitment assessments (such as Accenture recruitment tests).

---

## 🎮 Included Games

1. **Math Bubble Rush**:
   - 25-question rapid-fire numerical assessment.
   - Exact decimal arithmetic across floating neon bubbles.
   - Strict ascending numerical order selection.
   - Monotonic 15-second per-question countdown.

2. **Rotate the Path**:
   - 9×9 puzzle grid divided into nine selectable 3×3 regions.
   - Rotate regions 90° clockwise and flip/reverse arrow directions.
   - Continuous directed path verification from Mouse to Cheese.
   - 5 levels with progressive complexity and 4-minute timers.

3. **Invisible Walls**:
   - 10×10 grid with hidden wall boundaries.
   - Collect all keys (1 key for L1–3, 2 keys for L4–5) and navigate to the exit.
   - Bumping an invisible wall flashes the barrier, clears collected keys, and resets player to the start cell while preserving maze layout and timer.
   - 5 levels with 4-minute timers.

---

## 🛠️ Technology Stack

- **Core**: Vanilla TypeScript (Strict Mode)
- **Bundler & Dev Server**: Vite
- **Styling**: Modern Vanilla CSS (Design tokens, glassmorphism, responsive mobile-first)
- **Sound**: Synthesized Web Audio API (Zero external audio assets)
- **Persistence**: Safe browser `localStorage` for high scores, session history, and custom timer preferences
- **Testing**: Vitest automated unit & state-machine tests
- **Deployment**: Cloudflare Pages ready

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 18` (Node 20+ or 24 LTS recommended)
- npm `>= 9`

### Installation
```bash
# Clone the repository
git clone https://github.com/AJMAL-KP/Practix.git
cd Practix

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Automated Tests
```bash
npm run test
```

### Production Build
```bash
npm run build
```
The optimized bundle is output to `dist/`.
