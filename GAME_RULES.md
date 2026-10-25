# Practix — Game Rules and Mechanics Specification

Practix is a mobile-first timed practice game suite inspired by cognitive assessments used in corporate recruitment (such as Accenture recruitment assessments). It features three independent, self-contained timed games.

---

## 1. Math Bubble Rush

### Objective
Identify the mathematical value of expressions inside three floating bubbles and select all three bubbles in strictly ascending numerical order (from lowest value to highest value).

### Core Mechanics & Rules
1. **Bubbles per Question**: Exactly 3 bubbles per question.
2. **Operations Supported**:
   - Addition (`+`)
   - Subtraction (`-`)
   - Multiplication (`×`)
   - Decimals (e.g. `1.5 × 4`, `3.2 + 4.8`)
   - Division integer floored `floor(a / b)`
3. **Ascending Order Selection**:
   - The bubble with the strictly lowest numerical value must be tapped first (Index 1).
   - The bubble with the middle numerical value must be tapped second (Index 2).
   - The bubble with the strictly highest numerical value must be tapped third (Index 3).
4. **Duplicate Values**:
   - Question generation strictly rejects expressions that evaluate to identical numerical values. Every question has an unambiguous, unique ascending solution.
5. **Exact Arithmetic**:
   - All expressions are parsed and evaluated using exact decimal arithmetic (or scaled integer math) to prevent standard IEEE-754 floating-point inaccuracies (e.g., `0.1 + 0.2 != 0.3`).
6. **Penalties & Feedback**:
   - Correct tap: Bubble locks into selected state with animated feedback and index badge.
   - Incorrect tap: Bubble triggers a shake animation and error sound. Question remains active. An incorrect tap penalty is recorded.
   - Once selected, a bubble cannot be tapped again or deselected.
7. **Question Lifecycle & Timers**:
   - Default: 25 questions per session.
   - Default timer: 15 seconds per question.
   - Monotonic deadline: Derived from `performance.now()`.
   - On question completion: Immediate brief celebration transition (~400ms) followed by next question.
   - On timeout: Marks question as timed out, records 0 points for remaining bubbles, and immediately advances to next question.
   - Unused time on a question does NOT carry over to subsequent questions.
8. **Difficulty Progression (25 Questions)**:
   - **Questions 1–5 (Novice)**: Single-digit and small double-digit addition/subtraction (`a + b`, `a - b`).
   - **Questions 6–10 (Intermediate)**: Mixed addition, subtraction, and single-digit multiplication (`a × b`, `a + b × c`).
   - **Questions 11–17 (Advanced)**: Decimal operands (`x.y + z.w`, `x.y × z`), negative results (`a - b < 0`).
   - **Questions 18–25 (Master)**: Multi-step expressions, mixed decimals and negatives, close numerical margins.

---

## 2. Rotate the Path

### Objective
Guide a mouse from its designated entry position on the grid perimeter to the cheese destination on the opposing perimeter by rotating and transforming 3×3 grid regions until a continuous, valid directed path is formed.

### Board Geometry
1. **Board Dimensions**: 9×9 grid of path tiles.
2. **Sub-Regions**: Nine non-overlapping 3×3 regions (arranged in 3 rows and 3 columns).
3. **Region Selection**: Tapping any 3×3 region highlights it with an active boundary. Transformations apply strictly to the currently selected region.
4. **Starting & Ending Points**:
   - Mouse: Fixed entry point (e.g. middle of west edge, facing east).
   - Cheese: Fixed exit point (e.g. middle of east edge).

### Tile & Directional Mechanics
- Path tiles represent corridors with directional guidance arrows:
  - Orthogonal: `↑` (North), `↓` (South), `←` (West), `→` (East).
  - Diagonal / Corner Turners: `↗` (NE), `↘` (SE), `↙` (SW), `↖` (NW).
- Directional arrows are semantically active:
  - A path is only valid if connected corridor tiles have arrows pointing in the direction of traversal.
  - An L-turn corridor tile with `↘` guides movement entering from the left and turning downwards.
  - If an arrow points in the opposite direction of the incoming path, movement is blocked.

### Region Transformations
1. **Rotate 90° Clockwise**:
   - Transforms tile coordinates within the 3×3 region: `(r, c) → (c, 2 - r)`.
   - Rotates all arrow orientations within the region clockwise by 90°:
     - `→` → `↓` → `←` → `↑` → `→`
     - `↘` → `↙` → `↖` → `↗` → `↘`
2. **Direction Effect / Flip**:
   - Toggles or reverses direction modes of arrows along the corridor or mirrors the region geometry as confirmed by reference patterns.
   - Primary mode: Inverts arrow directions (`180°` direction reversal: `→` ↔ `←`, `↑` ↔ `↓`, `↗` ↔ `↙`, `↘` ↔ `↖`).
   - Secondary mode: Flips corridor geometry horizontally (`c → 2 - c`) while reflecting horizontal vector components.

### Path Testing & Validation
- **Test Path Button**: The player manually clicks "Test Path".
- **Path Runner**:
  - Traversal starts at the mouse entry point.
  - Follows corridor connections matching arrow orientations step-by-step.
  - Loop detection prevents infinite recursion.
  - If the path safely reaches the cheese: Level Cleared!
  - If the path reaches a dead-end, mismatched arrow, or loop: Path Fails, highlighting the blockage point with visual feedback. The board state and remaining timer are preserved.
- **Levels & Timer**:
  - 5 levels per run.
  - 240 seconds (4 minutes) per level. Fresh timer per level.

---

## 3. Invisible Walls

### Objective
Navigate an explorer through a 10×10 grid from the starting position to the exit, collecting all required keys while avoiding hidden walls.

### Core Mechanics & Rules
1. **Grid**: 10×10 cells.
2. **Start & Exit**:
   - Start cell: Typically `(0, 0)` (top-left).
   - Exit cell: Typically `(9, 9)` (bottom-right).
3. **Hidden Walls**:
   - Placed on internal cell boundaries.
   - Completely invisible during normal gameplay.
   - The layout of hidden walls is static and unchanged throughout the level.
4. **Collision & Reset**:
   - Attempting to cross a hidden wall triggers a collision:
     - The wall briefly flashes red.
     - A collision sound plays.
     - The player is immediately reset back to `(0, 0)`.
     - All keys collected during this level attempt are respawned.
     - **Crucial**: The timer DOES NOT reset, and the maze layout DOES NOT change.
5. **Key Progression**:
   - Level 1: 1 key
   - Level 2: 1 key
   - Level 3: 1 key
   - Level 4: 2 keys
   - Level 5: 2 keys
6. **Exit Requirement**:
   - The exit is locked until all required keys for the current level are collected.
   - Stepping onto the exit without all keys triggers a "Locked" notice.
   - Stepping onto the exit with all keys immediately completes the level.
7. **Controls**:
   - On-screen touch D-Pad (Up, Down, Left, Right).
   - Keyboard Arrow keys and WASD.
   - Swipe gestures on mobile devices.
8. **Levels & Timer**:
   - 5 levels per run.
   - 240 seconds (4 minutes) per level. Fresh timer per level.

---

## 4. Scoring & Results Metrics

### Math Bubble Rush
- **Questions Completed**: Total correctly resolved (out of 25).
- **Correct Selections**: Total bubbles tapped in correct order (out of 75).
- **Incorrect Taps**: Count of mis-taps.
- **Timed Out Questions**: Count of expired questions.
- **Total Time**: Total elapsed seconds.
- **Accuracy Rate**: `(Correct Selections / (Correct Selections + Incorrect Taps)) × 100%`.
- **Score Calculation**: `(Questions Completed × 100) + (Correct Selections × 20) - (Incorrect Taps × 15) + (Time Bonus)`.

### Rotate the Path
- **Levels Completed**: 0 to 5.
- **Total Rotations & Flips**: Efficiency counter.
- **Path Test Attempts & Failures**: Ratio of attempts to successes.
- **Total Time Elapsed**: Sum of time across completed levels.
- **Score Calculation**: `(Levels Completed × 1000) + (Remaining Time in Seconds × 2) - (Failed Tests × 50)`.

### Invisible Walls
- **Levels Completed**: 0 to 5.
- **Keys Collected**: Total keys picked up.
- **Wall Collisions**: Number of resets.
- **Total Time Elapsed**: Sum of time across completed levels.
- **Score Calculation**: `(Levels Completed × 1000) + (Keys Collected × 150) + (Remaining Time in Seconds × 2) - (Collisions × 40)`.
