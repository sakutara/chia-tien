import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { ensureDefaultData } from '../db/seed';
import { getOrCreateMember, renameMember, updateMemberBank, validateMemberName } from './memberService';
import { PeopleError } from './peopleErrors';

const NOW = '2026-10-19T00:00:00.000Z';

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
  await expect(p).rejects.toBeInstanceOf(PeopleError);
}

describe('memberService', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((t) => t.clear()));
    });
    await ensureDefaultData();
  });

  it('stores names capitalized (R-1, AC-5b)', async () => {
    const { member } = await getOrCreateMember('bình', NOW);
    expect(member.name).toBe('Bình');
    expect(member.normalizedName).toBe('binh');
  });

  it('returns the existing person for the same name, any case (AC-5)', async () => {
    const first = await getOrCreateMember('Bình', NOW);
    const again = await getOrCreateMember('BÌNH', NOW);
    expect(again.created).toBe(false);
    expect(again.member.id).toBe(first.member.id);
    expect(again.member.name).toBe('Bình');
    expect((await db.members.toArray()).filter((m) => m.name === 'Bình')).toHaveLength(1);
  });

  it('keeps accented and unaccented names as separate people with suffixed keys (AC-5c)', async () => {
    const an = await getOrCreateMember('An', NOW);
    const ân = await getOrCreateMember('Ân', NOW);
    const ấn = await getOrCreateMember('Ấn', NOW);
    expect(an.member.normalizedName).toBe('an');
    expect(ân.member.normalizedName).toBe('an2');
    expect(ấn.member.normalizedName).toBe('an3');
    expect(new Set([an.member.id, ân.member.id, ấn.member.id]).size).toBe(3);
  });

  it('does not collide with a real person named "An2"', async () => {
    await getOrCreateMember('An', NOW);
    await getOrCreateMember('An2', NOW);
    const ân = await getOrCreateMember('Ân', NOW);
    expect(ân.member.normalizedName).toBe('an3');
  });

  it('rejects empty and overlong names (R-1)', async () => {
    expect(() => validateMemberName('   ')).toThrow(PeopleError);
    expect(() => validateMemberName('a'.repeat(51))).toThrow(PeopleError);
    expect(validateMemberName('a'.repeat(50))).toHaveLength(50);
  });

  it('renames while keeping the key when only case or accents change', async () => {
    await getOrCreateMember('An', NOW);
    const { member } = await getOrCreateMember('Ân', NOW);
    expect(member.normalizedName).toBe('an2');
    const renamed = await renameMember(member.id, 'ân');
    expect(renamed.name).toBe('Ân');
    expect(renamed.normalizedName).toBe('an2');
  });

  it('keeps the default host flag when the owner renames the profile (BR-2.7)', async () => {
    const host = (await db.members.toArray()).find((m) => m.isDefaultHost)!;
    const renamed = await renameMember(host.id, 'tôi');
    expect(renamed.isDefaultHost).toBe(true);
    expect(renamed.name).toBe('Tôi');
    const settings = await db.settings.get('default');
    expect(settings!.defaultHostMemberId).toBe(host.id);
  });

  it('recomputes the key when the unaccented form changes', async () => {
    const { member } = await getOrCreateMember('Bình', NOW);
    const renamed = await renameMember(member.id, 'Dũng');
    expect(renamed.normalizedName).toBe('dung');
  });

  it('refuses to rename to a name the same person already has elsewhere (R-2a)', async () => {
    await getOrCreateMember('Bình', NOW);
    const { member } = await getOrCreateMember('Cường', NOW);
    await expectCode(renameMember(member.id, 'bình'), 'DUPLICATE_NAME');
  });

  it('persists across reopen (AC-4)', async () => {
    await getOrCreateMember('Đạt', NOW);
    db.close();
    await db.open();
    const names = (await db.members.toArray()).map((m) => m.name);
    expect(names).toContain('Đạt');
  });

  describe('updateMemberBank', () => {
    const bank = { bankBin: '970436', bankName: 'Vietcombank', accountName: ' nguyen   van an ', accountNumber: '0123 456-789' };

    it('saves a normalized bank account and removes it again', async () => {
      const { member } = await getOrCreateMember('An', NOW);
      const saved = await updateMemberBank(member.id, bank);
      expect(saved.bank).toEqual({ bankBin: '970436', bankName: 'Vietcombank', accountName: 'nguyen van an', accountNumber: '0123456789' });
      expect((await db.members.get(member.id))?.bank?.accountNumber).toBe('0123456789');

      await updateMemberBank(member.id, null);
      expect((await db.members.get(member.id))?.bank).toBeUndefined();
    });

    it('rejects a missing bank, empty holder name or malformed account number', async () => {
      const { member } = await getOrCreateMember('An', NOW);
      await expectCode(updateMemberBank(member.id, { ...bank, bankBin: '' }), 'INVALID_BANK');
      await expectCode(updateMemberBank(member.id, { ...bank, accountName: '  ' }), 'INVALID_BANK');
      await expectCode(updateMemberBank(member.id, { ...bank, accountNumber: '12ab' }), 'INVALID_BANK');
      await expectCode(updateMemberBank('nope', bank), 'MEMBER_NOT_FOUND');
    });
  });
});
