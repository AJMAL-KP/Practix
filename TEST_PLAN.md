# Practix — Comprehensive Automated Test Plan

The Practix test suite covers unit logic, mathematical correctness, state-machine transitions, generator solvability, and browser end-to-end user workflows using **Vitest**.

---

## Test Suites Matrix

| Category | Target Module | Test File | Key Test Cases |
|---|---|---|---|
| **Exact Arithmetic** | `src/core/exact-math.ts` | `tests/core/exact-math.test.ts` | Decimal addition/subtraction, scale preservation, no float drift, strict ascending comparison |
| **Monotonic Timer** | `src/core/timer.ts` | `tests/core/timer.test.ts` | Monotonic deadline calculation, pause/resume, tab background catchup, zero duplicate timeouts |
| **Math Bubble Rush** | `src/games/math-bubble/` | `tests/games/math-bubble.test.ts` | 25-question progression, reject duplicates, ascending tap ordering, penalty on wrong tap, timeout handling, replay reset |
| **Rotate the Path** | `src/games/rotate-path/` | `tests/games/rotate-path.test.ts` | 90° clockwise rotation mapping `(c, 2-r)`, direction vector rotation, flip/direction reversal, directed arrow traversal, loop detection, reachability solver, 5-level flow |
| **Invisible Walls** | `src/games/invisible-walls/` | `tests/games/invisible-walls.test.ts` | 10x10 maze boundaries, hidden wall collision reset, key progression (1, 1, 1, 2, 2), locked exit behavior, timer preservation after reset, solvability validation |
| **State Machines** | `src/core/state-machine.ts` | `tests/core/state-machines.test.ts` | Rejection of illegal transitions (e.g. input after timeout, double completion), rapid input queuing, replay state cleanup |
| **Persistence** | `src/core/storage.ts` | `tests/core/storage.test.ts` | Type-safe save/load, corruption resilience, default timer preferences, high-score tracking |
| **Puzzles & Solvers** | Seeded Generator Tests | `tests/generators/solvability.test.ts` | 50+ seeded runs across all levels to verify 100% solvability without unbounded loops |

---

## Execution Command
```bash
npm run test
```
Or for watch mode:
```bash
npm run test:watch
```
