import { describe, expect, it } from 'vitest';
import type { Member } from '../types';
import { allocateKey, decideEnter, filterMembers, findDiacriticVariants, findExactMatch, sortMembers } from './memberFilter';

function m(id: string, name: string, extra: Partial<Member> = {}): Member {
  return {
    id,
    name,
    normalizedName: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'),
    avatarColor: '#2D6A4F',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastUsedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

const host = m('host', 'Chủ app (Tôi)', { isDefaultHost: true });
const people = [
  m('1', 'Đạt'),
  m('2', 'Bình'),
  m('3', 'Ánh'),
  m('4', 'An'),
  m('5', 'Cường'),
  m('6', 'Anh'),
  m('7', 'Văn An'),
  m('8', 'Dung'),
];

describe('sortMembers (R-3)', () => {
  it('pins the default host first and sorts the rest A-Z in Vietnamese', () => {
    const sorted = sortMembers([...people, host]).map((x) => x.name);
    expect(sorted).toEqual([
      'Chủ app (Tôi)',
      'An',
      'Anh',
      'Ánh',
      'Bình',
      'Cường',
      'Dung',
      'Đạt',
      'Văn An',
    ]);
  });

  it('places the host first even when its name would sort later', () => {
    const sorted = sortMembers([m('z', 'Zed'), host, m('a', 'Ai')]);
    expect(sorted[0].id).toBe('host');
    expect(sorted.slice(1).map((x) => x.name)).toEqual(['Ai', 'Zed']);
  });

  it('does not mutate its input', () => {
    const input = [...people];
    sortMembers(input);
    expect(input).toEqual(people);
  });
});

describe('filterMembers (R-4)', () => {
  it('matches without diacritics', () => {
    expect(filterMembers(people, 'binh').map((x) => x.name)).toEqual(['Bình']);
    expect(filterMembers(people, 'dat').map((x) => x.name)).toEqual(['Đạt']);
  });

  it('matches substrings and keeps A-Z order', () => {
    expect(filterMembers(people, 'an').map((x) => x.name)).toEqual(['An', 'Anh', 'Ánh', 'Văn An']);
  });

  it('returns everyone, pinned host first, for an empty query', () => {
    const all = filterMembers([...people, host], '  ');
    expect(all[0].id).toBe('host');
    expect(all).toHaveLength(people.length + 1);
  });
});

describe('findExactMatch (R-2a)', () => {
  it('matches same display name ignoring case', () => {
    expect(findExactMatch(people, 'bình')?.id).toBe('2');
    expect(findExactMatch(people, 'BÌNH')?.id).toBe('2');
  });

  it('does not match a different diacritic', () => {
    expect(findExactMatch(people, 'Binh')).toBeUndefined();
  });
});

describe('findDiacriticVariants (R-2b)', () => {
  it('finds people with the same unaccented form', () => {
    expect(findDiacriticVariants(people, 'Binh')).toEqual([people[1]]);
  });

  it('excludes exact matches', () => {
    expect(findDiacriticVariants(people, 'Bình')).toEqual([]);
  });
});

describe('allocateKey (R-2b)', () => {
  it('uses the plain base when free', () => {
    expect(allocateKey([], 'Ân')).toBe('an');
  });

  it('appends the smallest free numeric suffix', () => {
    const members = [m('1', 'An', { normalizedName: 'an' }), m('2', 'Ân', { normalizedName: 'an2' })];
    expect(allocateKey(members, 'Ấn')).toBe('an3');
  });

  it('does not collide with a real person named "An2"', () => {
    const members = [m('1', 'An'), m('2', 'An2')];
    expect(allocateKey(members, 'Ân')).toBe('an3');
  });

  it('ignores the member being renamed', () => {
    const members = [m('1', 'An', { normalizedName: 'an' })];
    expect(allocateKey(members, 'An', '1')).toBe('an');
  });
});

describe('decideEnter (R-6)', () => {
  const participantIds = ['2'];

  it('is a noop for an empty query with no highlight', () => {
    expect(decideEnter({ query: '', members: people, participantIds: [] })).toEqual({ type: 'noop' });
  });

  it('picks the highlighted row first', () => {
    const r = decideEnter({ query: 'Cường', members: people, highlightedId: '2', participantIds: [] });
    expect(r).toEqual({ type: 'pick', member: people[1] });
  });

  it('reports already-joined people without removing them', () => {
    const r = decideEnter({ query: 'Bình', members: people, participantIds });
    expect(r).toEqual({ type: 'already', member: people[1] });
  });

  it('picks an exact match', () => {
    const r = decideEnter({ query: 'Cường', members: people, participantIds });
    expect(r).toEqual({ type: 'pick', member: people[4] });
  });

  it('picks the accented person for an unaccented query instead of creating a duplicate (R-6c)', () => {
    const r = decideEnter({ query: 'Binh', members: people, participantIds: [] });
    expect(r).toEqual({ type: 'pick', member: people[1] });
  });

  it('creates when nothing matches', () => {
    const r = decideEnter({ query: 'Khánh Linh', members: people, participantIds });
    expect(r).toEqual({ type: 'create', name: 'Khánh Linh' });
  });

  it('creates with the capitalized name even when typed in lowercase (R-1)', () => {
    const r = decideEnter({ query: 'khánh linh', members: people, participantIds });
    expect(r).toEqual({ type: 'create', name: 'Khánh Linh' });
  });

  it('creates an accented name whose unaccented form exists (AC-5c: Ân is separate from An)', () => {
    const r = decideEnter({ query: 'Ân', members: [m('1', 'An')], participantIds: [] });
    expect(r).toEqual({ type: 'create', name: 'Ân' });
  });
});
