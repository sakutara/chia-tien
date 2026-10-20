import type { PaymentGroup } from '../types';
import { PeopleError } from '../services/peopleErrors';
import { t } from '../i18n';

/** R-9: tên mặc định là các tên thành viên nối bằng " + ". */
export function defaultGroupName(memberNames: string[]): string {
  return memberNames.join(' + ');
}

interface GroupDraft {
  memberIds: string[];
  participantIds: string[];
  existingGroups: PaymentGroup[];
  /** Nhóm đang được sửa (không tính là trùng với chính nó). */
  ignoreGroupId?: string;
  names: Record<string, string>;
}

/**
 * R-9: ≥ 2 thành viên, đều thuộc bữa, không trùng, mỗi người tối đa một nhóm.
 * Ném PeopleError nếu không hợp lệ.
 */
export function validateGroupDraft({
  memberIds,
  participantIds,
  existingGroups,
  ignoreGroupId,
  names,
}: GroupDraft): void {
  const unique = new Set(memberIds);
  if (unique.size < 2 || unique.size !== memberIds.length) {
    throw new PeopleError('GROUP_TOO_SMALL', t('Nhóm cần ít nhất 2 thành viên khác nhau.'));
  }

  for (const id of memberIds) {
    if (!participantIds.includes(id)) {
      throw new PeopleError('NOT_PARTICIPANT', t('Thành viên chưa tham gia bữa này.'), { memberId: id });
    }
  }

  for (const group of existingGroups) {
    if (group.id === ignoreGroupId) continue;
    const clash = memberIds.find((id) => group.memberIds.includes(id));
    if (clash) {
      throw new PeopleError(
        'MEMBER_ALREADY_GROUPED',
        t('{v} đã thuộc nhóm "{name}".', { v: names[clash] ?? t('Thành viên'), name: group.name }),
        { groupId: group.id, groupName: group.name, memberId: clash },
      );
    }
  }
}

/**
 * R-10, R-11: gỡ các thành viên khỏi nhóm.
 * Đại diện chuyển sang người đầu tiên còn lại; nhóm còn dưới 2 người thì giải tán.
 * Trả mảng mới và danh sách id nhóm đã bị giải tán (để dọn khoá R-13).
 */
export function shrinkGroups(
  groups: PaymentGroup[],
  removedMemberIds: string[],
): { groups: PaymentGroup[]; dissolvedGroupIds: string[] } {
  const removed = new Set(removedMemberIds);
  const dissolvedGroupIds: string[] = [];
  const next: PaymentGroup[] = [];

  for (const g of groups) {
    if (!g.memberIds.some((id) => removed.has(id))) {
      next.push(g);
      continue;
    }
    const remaining = g.memberIds.filter((id) => !removed.has(id));
    if (remaining.length < 2) {
      dissolvedGroupIds.push(g.id);
      continue;
    }
    const repStillIn = g.representativeId !== undefined && remaining.includes(g.representativeId);
    next.push({
      ...g,
      memberIds: remaining,
      representativeId: repStillIn ? g.representativeId : remaining[0],
    });
  }

  return { groups: next, dissolvedGroupIds };
}
