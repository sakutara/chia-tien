import { describe, expect, it } from 'vitest';
import type { PaymentGroup } from '../types';
import { PeopleError } from '../services/peopleErrors';
import { defaultGroupName, shrinkGroups, validateGroupDraft } from './paymentGroupRules';

const group = (id: string, name: string, memberIds: string[], representativeId?: string): PaymentGroup => ({
  id,
  mealId: 'meal',
  name,
  memberIds,
  representativeId,
});

const names = { a: 'An', b: 'Bình', c: 'Cường', d: 'Dung', e: 'Em' };
const participants = ['a', 'b', 'c', 'd', 'e'];

describe('defaultGroupName (R-9)', () => {
  it('joins member names with " + "', () => {
    expect(defaultGroupName(['Cường', 'Dung'])).toBe('Cường + Dung');
  });
});

describe('validateGroupDraft (R-9)', () => {
  it('accepts a valid draft', () => {
    expect(() =>
      validateGroupDraft({ memberIds: ['c', 'd'], participantIds: participants, existingGroups: [], names }),
    ).not.toThrow();
  });

  it('rejects fewer than two distinct members', () => {
    try {
      validateGroupDraft({ memberIds: ['c'], participantIds: participants, existingGroups: [], names });
      expect.unreachable();
    } catch (e) {
      expect((e as PeopleError).code).toBe('GROUP_TOO_SMALL');
    }
    try {
      validateGroupDraft({ memberIds: ['c', 'c'], participantIds: participants, existingGroups: [], names });
      expect.unreachable();
    } catch (e) {
      expect((e as PeopleError).code).toBe('GROUP_TOO_SMALL');
    }
  });

  it('rejects members who are not in the meal', () => {
    try {
      validateGroupDraft({ memberIds: ['c', 'z'], participantIds: participants, existingGroups: [], names });
      expect.unreachable();
    } catch (e) {
      expect((e as PeopleError).code).toBe('NOT_PARTICIPANT');
    }
  });

  it('rejects a member already in another group and names that group (AC-3)', () => {
    const existing = [group('g1', 'Cặp đôi', ['c', 'd'])];
    try {
      validateGroupDraft({ memberIds: ['d', 'e'], participantIds: participants, existingGroups: existing, names });
      expect.unreachable();
    } catch (e) {
      const err = e as PeopleError;
      expect(err.code).toBe('MEMBER_ALREADY_GROUPED');
      expect(err.detail).toMatchObject({ groupId: 'g1', groupName: 'Cặp đôi', memberId: 'd' });
    }
  });

  it('ignores the group being edited', () => {
    const existing = [group('g1', 'Cặp đôi', ['c', 'd'])];
    expect(() =>
      validateGroupDraft({
        memberIds: ['c', 'd', 'e'],
        participantIds: participants,
        existingGroups: existing,
        ignoreGroupId: 'g1',
        names,
      }),
    ).not.toThrow();
  });
});

describe('shrinkGroups (R-10, R-11)', () => {
  it('keeps untouched groups as they are', () => {
    const g = group('g1', 'X', ['a', 'b']);
    const res = shrinkGroups([g], ['e']);
    expect(res.groups).toEqual([g]);
    expect(res.dissolvedGroupIds).toEqual([]);
  });

  it('removes a member and keeps the group when two or more remain', () => {
    const res = shrinkGroups([group('g1', 'X', ['a', 'b', 'c'], 'a')], ['b']);
    expect(res.groups[0].memberIds).toEqual(['a', 'c']);
    expect(res.groups[0].representativeId).toBe('a');
  });

  it('moves the representative to the first remaining member (R-10)', () => {
    const res = shrinkGroups([group('g1', 'X', ['a', 'b', 'c'], 'a')], ['a']);
    expect(res.groups[0].representativeId).toBe('b');
  });

  it('dissolves a group that drops below two members (R-11)', () => {
    const res = shrinkGroups([group('g1', 'X', ['a', 'b'])], ['b']);
    expect(res.groups).toEqual([]);
    expect(res.dissolvedGroupIds).toEqual(['g1']);
  });
});
