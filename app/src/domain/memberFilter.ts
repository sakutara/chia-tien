import type { Member } from '../types';
import { formatMemberName, hasDiacritics, normalizeName } from '../db/normalize';

const collator = new Intl.Collator('vi');

/** So sánh tên hiển thị: giữ nguyên dấu, không phân biệt hoa/thường (I-7). */
function sameDisplayName(a: string, b: string): boolean {
  return a.normalize('NFC').toLocaleLowerCase('vi') === b.normalize('NFC').toLocaleLowerCase('vi');
}

/**
 * R-3: hồ sơ chủ app "Tôi" (isDefaultHost) đứng đầu; còn lại A-Z theo tiếng Việt.
 * Hoà thì theo createdAt. Trả mảng mới.
 */
export function sortMembers(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    if (!!a.isDefaultHost !== !!b.isDefaultHost) return a.isDefaultHost ? -1 : 1;
    return collator.compare(a.name, b.name) || a.createdAt.localeCompare(b.createdAt);
  });
}

/** R-4: khớp khi normalizedName của thành viên chứa normalizeName(query). Query rỗng -> tất cả. */
export function filterMembers(members: Member[], query: string): Member[] {
  const q = normalizeName(query);
  const matched = q ? members.filter((m) => m.normalizedName.includes(q)) : members;
  return sortMembers(matched);
}

/** R-2a: người có tên hiển thị giống hệt (cùng dấu, khác hoa/thường). */
export function findExactMatch(members: Member[], query: string): Member | undefined {
  return members.find((m) => sameDisplayName(m.name, query));
}

/**
 * R-2b / R-6c: người có cùng dạng không dấu với query nhưng khác dấu
 * (VD query "Binh" với người tên "Bình"). Không tính người khớp chính xác.
 */
export function findDiacriticVariants(members: Member[], query: string): Member[] {
  const base = normalizeName(query);
  if (!base) return [];
  return sortMembers(
    members.filter((m) => normalizeName(m.name) === base && !sameDisplayName(m.name, query)),
  );
}

/**
 * R-2b: cấp khoá normalizedName không trùng.
 * Trả `base` nếu chưa ai dùng, nếu không trả base2, base3... nhỏ nhất còn trống.
 * `selfId` là người đang đổi tên (bỏ qua khoá của chính họ).
 */
export function allocateKey(members: Member[], rawName: string, selfId?: string): string {
  const base = normalizeName(rawName);
  const used = new Set(members.filter((m) => m.id !== selfId).map((m) => m.normalizedName));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

export type EnterAction =
  | { type: 'pick'; member: Member }
  | { type: 'already'; member: Member }
  | { type: 'create'; name: string }
  | { type: 'noop' };

interface EnterInput {
  /** Đã qua formatMemberName (hoặc chuỗi rỗng). */
  query: string;
  members: Member[];
  /** Id dòng đang được chọn bằng mũi tên, nếu có. */
  highlightedId?: string;
  participantIds: string[];
}

/** R-6: quyết định hành vi khi nhấn Enter trong ô lọc. */
export function decideEnter({ query, members, highlightedId, participantIds }: EnterInput): EnterAction {
  const inMeal = (m: Member): EnterAction =>
    participantIds.includes(m.id) ? { type: 'already', member: m } : { type: 'pick', member: m };

  // (a) dòng đang được chọn bằng mũi tên
  if (highlightedId) {
    const hl = members.find((m) => m.id === highlightedId);
    if (hl) return inMeal(hl);
  }

  // R-1: mọi tên đưa vào so khớp hoặc tạo mới đều đã capitalized
  const q = formatMemberName(query);
  if (!q) return { type: 'noop' };

  // (b) khớp chính xác (R-2a)
  const exact = findExactMatch(members, q);
  if (exact) return inMeal(exact);

  // (c) từ khoá không dấu và đã có người có dấu cùng dạng -> chọn người đó, không tạo mới
  if (!hasDiacritics(q)) {
    const [variant] = findDiacriticVariants(members, q);
    if (variant) return inMeal(variant);
  }

  // (d) còn lại: tạo mới
  return { type: 'create', name: q };
}
