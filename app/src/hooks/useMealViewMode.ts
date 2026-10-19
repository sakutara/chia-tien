import { useCallback, useState } from 'react';
import type { MealViewMode } from '../types';

const STORAGE_KEY = 'usd-split.mealView';
const MODES: readonly MealViewMode[] = ['CALENDAR', 'LIST', 'STATUS'];
export const DEFAULT_VIEW_MODE: MealViewMode = 'LIST';

export function readViewMode(): MealViewMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return MODES.find((m) => m === stored) ?? DEFAULT_VIEW_MODE;
  } catch {
    return DEFAULT_VIEW_MODE;
  }
}

function writeViewMode(mode: MealViewMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Chế độ riêng tư / chặn dữ liệu site: vẫn đổi được trong phiên (R-16).
  }
}

/** Chế độ xem bữa, nhớ theo thiết bị (R-16). */
export function useMealViewMode(): [MealViewMode, (mode: MealViewMode) => void] {
  const [mode, setModeState] = useState<MealViewMode>(readViewMode);
  const setMode = useCallback((next: MealViewMode) => {
    setModeState(next);
    writeViewMode(next);
  }, []);
  return [mode, setMode];
}
