import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { localizeMember } from '../db/localize';
import { sortMembers } from '../domain/memberFilter';
import { useLang } from '../i18n';

/** Toàn bộ danh bạ, đã xếp (chủ app ghim đầu, còn lại A-Z). `undefined` khi đang tải. */
export function useMembers() {
  const lang = useLang();
  return useLiveQuery(async () => sortMembers((await db.members.toArray()).map(localizeMember)), [lang]);
}
