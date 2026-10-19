import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { sortMembers } from '../domain/memberFilter';

/** Toàn bộ danh bạ, đã xếp (chủ app ghim đầu, còn lại A-Z). `undefined` khi đang tải. */
export function useMembers() {
  return useLiveQuery(async () => sortMembers(await db.members.toArray()), []);
}
