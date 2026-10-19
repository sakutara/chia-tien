import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { ensureDefaultData } from './seed';
import { normalizeName } from './normalize';

async function clearAll() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

describe('ensureDefaultData', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('creates the default host once and is idempotent', async () => {
    await ensureDefaultData();
    await ensureDefaultData();

    const settings = await db.settings.get('default');
    expect(settings).toBeDefined();
    expect(settings!.currencySymbol).toBe('₫');

    const members = await db.members.toArray();
    expect(members).toHaveLength(1);
    const host = members[0];
    expect(host.id).toBe(settings!.defaultHostMemberId);
    expect(host.isDefaultHost).toBe(true);
    expect(host.name).toBe('Tôi');
    expect(host.normalizedName).toBe('toi');
    expect(host.avatarColor).toBe('#2D6A4F');
  });

  it('persists data across close and reopen', async () => {
    await ensureDefaultData();
    const before = await db.members.toArray();

    db.close();
    await db.open();

    const settings = await db.settings.get('default');
    expect(settings).toBeDefined();
    const after = await db.members.toArray();
    expect(after).toEqual(before);
  });
});

describe('normalizeName', () => {
  it('lowercases, strips Vietnamese diacritics and maps đ to d', () => {
    expect(normalizeName('Đặng Thị Ánh')).toBe('dang thi anh');
    expect(normalizeName('An Nguyễn')).toBe('an nguyen');
  });
});
