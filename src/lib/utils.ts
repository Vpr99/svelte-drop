interface NextIndexInput {
  currentIndex: number;
  itemCount: number;
  moveAmount: number;
}

export function getNextIndex({
  currentIndex,
  itemCount,
  moveAmount,
}: NextIndexInput) {
  // Return early if there are no items.
  if (itemCount === 0) {
    return 0;
  }
  // Compute the index of the last item in the list.
  const lastItemIndex = itemCount - 1;
  // Compute the next index by adding the move amount to the current index.
  const nextIndex = currentIndex + moveAmount;
  // Wrap from the top of the list back to the bottom.
  if (nextIndex < 0) {
    return lastItemIndex;
  }
  // Wrap from the bottom of the list back to the top.
  if (nextIndex > lastItemIndex) {
    return 0;
  }
  return nextIndex;
}
