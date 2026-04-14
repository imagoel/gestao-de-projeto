import { insertIntoList, reorderWithinList } from './reorder.util';

describe('reorder util', () => {
  it('reorders an item inside the same list', () => {
    expect(reorderWithinList(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
  });

  it('inserts an item into a target list respecting the target position', () => {
    expect(insertIntoList(['b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c']);
  });
});
