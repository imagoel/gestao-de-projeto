export function clampPosition(position: number, length: number) {
  return Math.max(0, Math.min(position, length));
}

export function reorderWithinList(
  itemIds: string[],
  movedItemId: string,
  targetPosition: number,
) {
  const remainingIds = itemIds.filter((itemId) => itemId !== movedItemId);
  const nextIds = [...remainingIds];

  nextIds.splice(clampPosition(targetPosition, nextIds.length), 0, movedItemId);

  return nextIds;
}

export function insertIntoList(itemIds: string[], insertedItemId: string, targetPosition: number) {
  const nextIds = [...itemIds];

  nextIds.splice(clampPosition(targetPosition, nextIds.length), 0, insertedItemId);

  return nextIds;
}
