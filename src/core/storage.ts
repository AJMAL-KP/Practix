/**
 * Type-safe browser storage service with validation, memory fallback, and graceful error handling.
 */
export interface GameSettings {
  mathQuestionDurationSec: number;
  rotateLevelDurationSec: number;
  invisibleLevelDurationSec: number;
  soundEnabled: boolean;
}

export interface GameSessionRecord {
  id: string;
  gameId: 'math-bubble' | 'rotate-path' | 'invisible-walls';
  timestamp: number;
  score: number;
  completed: boolean;
  timeUsedSec: number;
  details: Record<string, string | number>;
}

export interface PersonalBests {
  mathBubbleHighScore: number;
  rotatePathHighScore: number;
  invisibleWallsHighScore: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  mathQuestionDurationSec: 15,
  rotateLevelDurationSec: 240,
  invisibleLevelDurationSec: 240,
  soundEnabled: true,
};

const DEFAULT_BESTS: PersonalBests = {
  mathBubbleHighScore: 0,
  rotatePathHighScore: 0,
  invisibleWallsHighScore: 0,
};

const SETTINGS_KEY = 'practix_settings_v1';
const BESTS_KEY = 'practix_bests_v1';
const HISTORY_KEY = 'practix_history_v1';

export class StorageService {
  private static memoryStore = new Map<string, string>();

  private static getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {}
    }
    return this.memoryStore.get(key) ?? null;
  }

  private static setItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
    this.memoryStore.set(key, value);
  }

  static getSettings(): GameSettings {
    try {
      const data = this.getItem(SETTINGS_KEY);
      if (!data) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(data);
      return {
        mathQuestionDurationSec:
          typeof parsed.mathQuestionDurationSec === 'number' && parsed.mathQuestionDurationSec >= 5
            ? parsed.mathQuestionDurationSec
            : DEFAULT_SETTINGS.mathQuestionDurationSec,
        rotateLevelDurationSec:
          typeof parsed.rotateLevelDurationSec === 'number' && parsed.rotateLevelDurationSec >= 30
            ? parsed.rotateLevelDurationSec
            : DEFAULT_SETTINGS.rotateLevelDurationSec,
        invisibleLevelDurationSec:
          typeof parsed.invisibleLevelDurationSec === 'number' && parsed.invisibleLevelDurationSec >= 30
            ? parsed.invisibleLevelDurationSec
            : DEFAULT_SETTINGS.invisibleLevelDurationSec,
        soundEnabled:
          typeof parsed.soundEnabled === 'boolean'
            ? parsed.soundEnabled
            : DEFAULT_SETTINGS.soundEnabled,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings: Partial<GameSettings>): GameSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      this.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
    return updated;
  }

  static getPersonalBests(): PersonalBests {
    try {
      const data = this.getItem(BESTS_KEY);
      if (!data) return { ...DEFAULT_BESTS };
      return { ...DEFAULT_BESTS, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_BESTS };
    }
  }

  static recordScore(
    gameId: 'math-bubble' | 'rotate-path' | 'invisible-walls',
    score: number
  ): void {
    const bests = this.getPersonalBests();
    let updated = false;

    if (gameId === 'math-bubble' && score > bests.mathBubbleHighScore) {
      bests.mathBubbleHighScore = score;
      updated = true;
    } else if (gameId === 'rotate-path' && score > bests.rotatePathHighScore) {
      bests.rotatePathHighScore = score;
      updated = true;
    } else if (gameId === 'invisible-walls' && score > bests.invisibleWallsHighScore) {
      bests.invisibleWallsHighScore = score;
      updated = true;
    }

    if (updated) {
      try {
        this.setItem(BESTS_KEY, JSON.stringify(bests));
      } catch (e) {
        console.warn('Failed to save high scores:', e);
      }
    }
  }

  static getHistory(): GameSessionRecord[] {
    try {
      const data = this.getItem(HISTORY_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static addHistoryRecord(record: Omit<GameSessionRecord, 'id' | 'timestamp'>): void {
    try {
      const history = this.getHistory();
      const newRecord: GameSessionRecord = {
        ...record,
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        timestamp: Date.now(),
      };
      history.unshift(newRecord);
      // Keep recent 30 sessions
      const trimmed = history.slice(0, 30);
      this.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      this.recordScore(record.gameId, record.score);
    } catch (e) {
      console.warn('Failed to add session record:', e);
    }
  }

  static clearMemoryStore(): void {
    this.memoryStore.clear();
  }
}
