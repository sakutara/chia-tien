import { useCallback, useSyncExternalStore } from 'react';

export const SNAPSHOT_QUERY_KEY = 'snapshot';

export type Route =
  | { name: 'home' }
  | { name: 'meal'; id: string }
  /** Chế độ xem Snapshot chỉ đọc; `encoded` là chuỗi nén lz-string, có thể rỗng nếu link bị cắt (BR-8.2, BR-8.4). */
  | { name: 'snapshot'; encoded: string };

const MEAL_PATTERN = /^#\/meal\/([0-9a-fA-F-]{8,64})$/;
const SNAPSHOT_HASH_PATTERN = /^#\/snapshot\/([^/]*)$/;

/** Tham số `?snapshot=`. `URLSearchParams` đổi dấu `+` thành khoảng trắng nên phải khôi phục lại. */
function snapshotFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  if (!params.has(SNAPSHOT_QUERY_KEY)) return null;
  return (params.get(SNAPSHOT_QUERY_KEY) ?? '').replace(/ /g, '+');
}

/** R-17: `#/` hoặc rỗng → danh sách; `#/meal/<id>` → chi tiết; snapshot ưu tiên trên mọi route khác (R-6). */
export function parseRoute(hash: string, search = ''): Route {
  const fromSearch = snapshotFromSearch(search);
  if (fromSearch !== null) return { name: 'snapshot', encoded: fromSearch };
  const snapshot = SNAPSHOT_HASH_PATTERN.exec(hash);
  if (snapshot) return { name: 'snapshot', encoded: snapshot[1] };
  const match = MEAL_PATTERN.exec(hash);
  return match ? { name: 'meal', id: match[1] } : { name: 'home' };
}

export function mealPath(id: string): string {
  return `/meal/${id}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

const getHash = () => window.location.hash;
const getSearch = () => window.location.search;

export function useHashRoute(): { route: Route; navigate: (path: string) => void } {
  const hash = useSyncExternalStore(subscribe, getHash);
  const search = useSyncExternalStore(subscribe, getSearch);
  const navigate = useCallback((path: string) => {
    window.location.hash = `#${path}`;
  }, []);
  return { route: parseRoute(hash, search), navigate };
}

/**
 * Thoát chế độ Snapshot: xoá `?snapshot` khỏi thanh địa chỉ rồi về danh sách bữa cá nhân (R-6, Risk 2).
 * `replaceState` không tự phát `hashchange`, nên phát thủ công để các hook đọc lại vị trí.
 */
export function exitSnapshot(): void {
  window.history.replaceState(null, '', `${window.location.pathname}#/`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
