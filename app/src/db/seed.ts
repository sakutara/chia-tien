import { generateId } from '../lib/id';
import type { AppSettings, Member } from '../types';
import { db } from './db';
import { DEFAULT_HOST_NAME } from './localize';
import { normalizeName } from './normalize';


/**
 * Tạo dữ liệu mặc định (hồ sơ "Tôi" và AppSettings) nếu chưa có.
 * Idempotent: gọi nhiều lần chỉ tạo một lần.
 */
export async function ensureDefaultData(): Promise<void> {
  await db.transaction('rw', db.settings, db.members, async () => {
    const existing = await db.settings.get('default');
    if (existing) return;

    const now = new Date().toISOString();
    const hostId = generateId();

    const host: Member = {
      id: hostId,
      name: DEFAULT_HOST_NAME,
      normalizedName: normalizeName(DEFAULT_HOST_NAME),
      isDefaultHost: true,
      avatarColor: '#2D6A4F',
      createdAt: now,
      lastUsedAt: now,
    };

    const settings: AppSettings = {
      id: 'default',
      defaultHostMemberId: hostId,
      currencySymbol: '₫',
      createdAt: now,
    };

    await db.members.add(host);
    await db.settings.add(settings);
  });
}
