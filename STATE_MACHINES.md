# Practix — Explicit State Machines & Transitions

To ensure predictable behavior, prevent impossible states (such as active and finished simultaneously), and guard against asynchronous race conditions, every game in Practix is governed by a strictly typed state machine modeled as a discriminated union.

---

## 1. Shared State Machine Principles

1. **State as a Discriminated Union**: Every state is a TypeScript type with a unique `status` string literal discriminant. State-specific data is only accessible when in that state.
2. **Explicit Events**: Transitions are driven solely by defined Event types.
3. **Pure Reducer / Transition Function**: State transitions are pure functions of `(currentState, event) => nextState`. If an event is invalid for the current state, it is safely rejected (returning the existing state without mutation).
4. **Race-Condition Immunity**:
   - Rapid double-clicks/taps: Once an input is processed or a state transition is queued (e.g. `QuestionComplete`, `LevelTransition`), subsequent user actions are ignored until the new state is ready.
   - Timeout Races: Once `status === 'timeout'` or `status === 'completed'`, user input events or redundant timer ticks are discarded.
   - Monotonic Clock: Timers calculate remaining milliseconds based on `deadline - performance.now()`. When `performance.now() >= deadline`, an explicit `TIMEOUT` event is dispatched.

---

## 2. Math Bubble Rush State Machine

### States (`MathBubbleState`)
```typescript
type MathBubbleState =
  | { status: 'idle' }
  | { status: 'ready'; countdown: number }
  | { 
      status: 'playing'; 
      questionIndex: number; // 0 to 24
      question: MathQuestion;
      selectedIndices: number[]; // bubble IDs picked so far in current question
      remainingMs: number;
      penaltyCount: number;
    }
  | { 
      status: 'selection_feedback'; 
      questionIndex: number; 
      question: MathQuestion;
      selectedIndices: number[];
      feedbackBubbleId: string;
      feedbackType: 'correct' | 'incorrect';
      remainingMs: number;
    }
  | { 
      status: 'question_complete'; 
      questionIndex: number; 
      timeSpentMs: number; 
    }
  | { 
      status: 'question_timeout'; 
      questionIndex: number; 
    }
  | { 
      status: 'session_complete'; 
      stats: MathSessionStats; 
    }
  | { 
      status: 'results'; 
      stats: MathSessionStats; 
    };
```

### Events (`MathBubbleEvent`)
- `START_GAME`: `idle` → `ready` (or directly `playing`)
- `TICK`: Updates `remainingMs`. Dispatches `TIMEOUT` if `remainingMs <= 0`.
- `TAP_BUBBLE`: (Payload: `bubbleId`)
  - When in `playing`:
    - Checks if `bubbleId` is the next strictly ascending bubble.
    - If correct: Appends to `selectedIndices`.
      - If 3rd bubble selected: Transitions to `question_complete` → advances to next question or `session_complete`.
      - Otherwise: Briefly shows `selection_feedback(correct)` and stays `playing`.
    - If incorrect: Increases `penaltyCount`, triggers `selection_feedback(incorrect)` with shake animation.
- `NEXT_QUESTION`: Advances `questionIndex`. If `questionIndex === 25`, transitions to `session_complete`.
- `TIMEOUT`: Sets `status: 'question_timeout'` → triggers `NEXT_QUESTION`.
- `SHOW_RESULTS`: `session_complete` → `results`.
- `REPLAY`: `results` → `ready` / `playing`.

---

## 3. Rotate the Path State Machine

### States (`RotatePathState`)
```typescript
type RotatePathState =
  | { status: 'idle' }
  | { status: 'ready'; level: number }
  | { 
      status: 'playing'; 
      level: number; // 1 to 5
      grid: PathGrid; // 9x9
      selectedRegionIndex: number | null; // 0 to 8
      remainingMs: number;
      rotations: number;
      flips: number;
      testAttempts: number;
      failedTests: number;
    }
  | { 
      status: 'testing_path'; 
      level: number; 
      grid: PathGrid; 
      runnerStep: number; 
      visitedPath: Coordinate[]; 
    }
  | { 
      status: 'path_failed'; 
      level: number; 
      grid: PathGrid; 
      failurePoint: Coordinate; 
      reason: string; 
    }
  | { 
      status: 'path_succeeded'; 
      level: number; 
      grid: PathGrid; 
      timeSpentMs: number; 
    }
  | { 
      status: 'level_transition'; 
      nextLevel: number; 
    }
  | { 
      status: 'timeout'; 
      level: number; 
    }
  | { 
      status: 'final_results'; 
      stats: RotatePathStats; 
    };
```

### Events (`RotatePathEvent`)
- `START_GAME`: `idle` → `playing` (Level 1)
- `SELECT_REGION`: (Payload: `regionIndex: 0..8`)
  - Only valid in `playing`. Updates `selectedRegionIndex`.
- `ROTATE_SELECTED`:
  - Only valid in `playing` when `selectedRegionIndex !== null`.
  - Rotates selected 3×3 region 90° clockwise. Increments `rotations`.
- `FLIP_SELECTED`:
  - Only valid in `playing` when `selectedRegionIndex !== null`.
  - Reverses / flips directions of selected 3×3 region. Increments `flips`.
- `START_PATH_TEST`:
  - `playing` → `testing_path`. Traverses tile by tile.
- `PATH_STEP`:
  - Traversal step event for smooth animated movement of the mouse.
- `PATH_TEST_RESULT`:
  - If reaches cheese: `path_succeeded`.
    - If level < 5: Advances to `level_transition` → Level `N+1`.
    - If level === 5: Advances to `final_results`.
  - If fails: `path_failed` (shows failure feedback; user can dismiss or tap to return to `playing` with board preserved).
- `TIMEOUT`: Level expires → `final_results`.
- `REPLAY`: `final_results` → `playing` (Level 1).

---

## 4. Invisible Walls State Machine

### States (`InvisibleWallsState`)
```typescript
type InvisibleWallsState =
  | { status: 'idle' }
  | { status: 'ready'; level: number }
  | { 
      status: 'playing'; 
      level: number; // 1 to 5
      playerPos: Coordinate; // (row, col)
      keysRequired: number; // 1 for L1-3, 2 for L4-5
      keysCollected: number;
      keyPositions: Coordinate[];
      exitPos: Coordinate;
      remainingMs: number;
      collisions: number;
      resets: number;
    }
  | { 
      status: 'wall_collision'; 
      level: number; 
      hitWallCoordinate: WallCoordinate; 
      remainingMs: number; 
    }
  | { 
      status: 'resetting'; 
      level: number; 
    }
  | { 
      status: 'level_complete'; 
      level: number; 
      timeSpentMs: number; 
    }
  | { 
      status: 'timeout'; 
      level: number; 
    }
  | { 
      status: 'final_results'; 
      stats: InvisibleWallsStats; 
    };
```

### Events (`InvisibleWallsEvent`)
- `START_GAME`: `idle` → `playing` (Level 1)
- `MOVE_PLAYER`: (Payload: `direction: 'up' | 'down' | 'left' | 'right'`)
  - Valid only in `playing`.
  - Calculates target coordinate.
  - If target is out of bounds or blocked by a hidden wall:
    - Increments `collisions` and `resets`.
    - Transitions to `wall_collision`.
    - Resets `playerPos` back to start `(0, 0)` and resets `keysCollected` back to 0.
    - Automatically returns to `playing` after collision animation (~400ms).
  - If target is valid:
    - Moves `playerPos` to target.
    - If target cell contains an uncollected key:
      - Increments `keysCollected`, removes key from active board.
    - If target cell is `exitPos`:
      - If `keysCollected === keysRequired`:
        - Completes level → `level_complete`.
        - If Level < 5: Advances to Level `N+1`.
        - If Level === 5: Advances to `final_results`.
      - If keys are missing: Player stays on exit, shows brief "Locked" feedback.
- `TIMEOUT`: Timer expires → `final_results`.
- `REPLAY`: `final_results` → `playing` (Level 1).
