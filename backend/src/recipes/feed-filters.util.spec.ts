import { parseCommaSeparatedFilter } from './feed-filters.util';

describe('parseCommaSeparatedFilter', () => {
  it('returns empty for undefined, empty, whitespace', () => {
    expect(parseCommaSeparatedFilter(undefined)).toEqual([]);
    expect(parseCommaSeparatedFilter('')).toEqual([]);
    expect(parseCommaSeparatedFilter('   ')).toEqual([]);
  });

  it('splits on comma and trims', () => {
    expect(parseCommaSeparatedFilter('a, b ,  c')).toEqual(['a', 'b', 'c']);
  });

  it('drops empty segments', () => {
    expect(parseCommaSeparatedFilter('chicken,, garlic,')).toEqual([
      'chicken',
      'garlic',
    ]);
  });
});
