import { generateId } from '../lib/id'
import { db } from '../db/db';
import { MEMBER_NAME_MAX, cleanName, formatMemberName, normalizeName } from '../db/normalize';
import { allocateKey, findExactMatch } from '../domain/memberFilter';
import type { BankAccount, Member } from '../types';
import { PeopleError } from './peopleErrors';

/** Dải màu xanh USD; màu được băm từ khoá để cùng một người luôn cùng màu. */
const AVATAR_PALETTE = ['#1B4332', '#2D6A4F', '#40916C', '#52796F', '#3A5A40', '#386641'];

export function avatarColorFor(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/** R-1: chuẩn hoá và kiểm độ dài; ném INVALID_NAME nếu rỗng hoặc quá dài. */
export function validateMemberName(raw: string): string {
  const name = formatMemberName(raw);
  if (!name) throw new PeopleError('INVALID_NAME', 'Tên không được để trống.');
  if ([...name].length > MEMBER_NAME_MAX) {
    throw new PeopleError('INVALID_NAME', `Tên tối đa ${MEMBER_NAME_MAX} ký tự.`);
  }
  return name;
}

/**
 * Tìm người có tên hiển thị giống hệt (R-2a).
 * Không mở transaction: caller phải đang trong transaction có `db.members`.
 */
export async function findMemberByName(name: string): Promise<Member | undefined> {
  return findExactMatch(await db.members.toArray(), name);
}

/**
 * Lấy hoặc tạo người theo tên (R-2a, R-2b). Không ghi đè tên đã có.
 * Không mở transaction: caller phải đang trong transaction có `db.members`.
 */
export async function getOrCreateMember(
  rawName: string,
  now: string,
): Promise<{ member: Member; created: boolean }> {
  const name = validateMemberName(rawName);
  const all = await db.members.toArray();
  const existing = findExactMatch(all, name);
  if (existing) return { member: existing, created: false };

  const key = allocateKey(all, name);
  const member: Member = {
    id: generateId(),
    name,
    normalizedName: key,
    avatarColor: avatarColorFor(key),
    createdAt: now,
    lastUsedAt: now,
  };
  await db.members.add(member);
  return { member, created: true };
}

/**
 * Đổi tên hồ sơ (R-1, R-2a). Khoá chỉ cấp lại khi dạng không dấu của tên đổi;
 * nếu chỉ đổi dấu/hoa-thường thì giữ khoá cũ (R-2b: hậu tố cố định sau khi gán).
 */
export async function renameMember(id: string, rawName: string): Promise<Member> {
  return db.transaction('rw', db.members, async () => {
    const member = await db.members.get(id);
    if (!member) throw new PeopleError('MEMBER_NOT_FOUND', 'Không tìm thấy người này.', { memberId: id });

    const name = validateMemberName(rawName);
    const all = await db.members.toArray();
    const clash = findExactMatch(
      all.filter((m) => m.id !== id),
      name,
    );
    if (clash) {
      throw new PeopleError('DUPLICATE_NAME', `Đã có người tên "${clash.name}".`, {
        existingMemberId: clash.id,
      });
    }

    const keepKey = normalizeName(member.name) === normalizeName(name);
    const normalizedName = keepKey ? member.normalizedName : allocateKey(all, name, id);
    const updated: Member = { ...member, name, normalizedName };
    await db.members.put(updated);
    return updated;
  });
}

/** Số tài khoản: chỉ chữ số/chữ cái (bỏ khoảng trắng, dấu gạch), 6–19 ký tự. */
export function validateAccountNumber(raw: string): string {
  const number = raw.replace(/[\s.-]+/g, '');
  if (!/^[A-Za-z0-9]{6,19}$/.test(number)) {
    throw new PeopleError('INVALID_BANK', 'Số tài khoản gồm 6–19 chữ số.');
  }
  return number;
}

/** Lưu hoặc xoá (`null`) tài khoản ngân hàng của một người. */
export async function updateMemberBank(id: string, bank: BankAccount | null): Promise<Member> {
  return db.transaction('rw', db.members, async () => {
    const member = await db.members.get(id);
    if (!member) throw new PeopleError('MEMBER_NOT_FOUND', 'Không tìm thấy người này.', { memberId: id });
    if (bank === null) {
      const { bank: _removed, ...rest } = member;
      await db.members.put(rest);
      return rest;
    }
    if (!/^\d{6}$/.test(bank.bankBin) || !bank.bankName.trim()) {
      throw new PeopleError('INVALID_BANK', 'Hãy chọn ngân hàng.');
    }
    const accountName = cleanName(bank.accountName);
    if (!accountName) throw new PeopleError('INVALID_BANK', 'Tên chủ tài khoản không được để trống.');
    const updated: Member = {
      ...member,
      bank: {
        bankBin: bank.bankBin,
        bankName: bank.bankName.trim(),
        accountName,
        accountNumber: validateAccountNumber(bank.accountNumber),
      },
    };
    await db.members.put(updated);
    return updated;
  });
}
