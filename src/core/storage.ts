/**
 * Type-safe browser storage service with validation and graceful fallbacks.
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
  private static isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const test = '__practix_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  static getSettings(): GameSettings {
    if (!this.isAvailable()) return { ...DEFAULT_SETTINGS };
    try {
      const data = window.localStorage.getItem(SETTINGS_KEY);
      if (!data) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(data);
      return {
        mathQuestionDurationSec: typeof parsed.mathQuestionDurationSec === 'number' && parsed.mathQuestionDurationSec >= 5 ? parsed.mathQuestionDurationSec : DEFAULT_SETTINGS.mathQuestionDurationSec,
        rotateLevelDurationSec: typeof parsed.rotateLevelDurationSec === 'number' && parsed.rotateLevelDurationSec >= 30 ? parsed.rotateLevelDurationSec : DEFAULT_SETTINGS.rotateLevelDurationSec,
        invisibleLevelDurationSec: typeof parsed.invisibleLevelDurationSec === 'number' && parsed.invisibleLevelDurationSec >= 30 ? parsed.invisibleLevelDurationSec : DEFAULT_SETTINGS.invisibleLevelDurationSec,
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings: Partial<GameSettings>): GameSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save settings to localStorage:', e);
      }
    }
    return updated;
  }

  static getPersonalBests(): PersonalBests {
    if (!this.isAvailable()) return { ...DEFAULT_BESTS };
    try {
      const data = window.localStorage.getItem(BESTS_KEY);
      if (!data) return { ...DEFAULT_BESTS };
      return { ...DEFAULT_BESTS, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_BESTS };
    }
  }

  static recordScore(gameId: 'math-bubble' | 'rotate-path' | 'invisible-walls', score: number): void {
    if (!this.isAvailable()) return;
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
        window.localStorage.setItem(BESTS_KEY, JSON.stringify(bests));
      } catch (e) {
        console.warn('Failed to save high scores:', e);
      }
    }
  }

  static getHistory(): GameSessionRecord[] {
    if (!this.isAvailable()) return [];
    try {
      const data = window.localStorage.getItem(HISTORY_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static addHistoryRecord(record: Omit<GameSessionRecord, 'id' | 'timestamp'>): void {
    if (!this.isAvailable()) return;
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
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      this.recordScore(record.gameId, record.score);
    } catch (e) {
      console.warn('Failed to add session record:', e);
    }
  }
}
