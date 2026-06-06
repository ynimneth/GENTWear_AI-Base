export function quickSort<T>(arr: T[], compareFn: (a: T, b: T) => number): T[] {
  if (arr.length <= 1) return [...arr];

  const pivot = arr[Math.floor(arr.length / 2)];
  const left: T[] = [];
  const middle: T[] = [];
  const right: T[] = [];

  for (const item of arr) {
    const cmp = compareFn(item, pivot);
    if (cmp < 0) {
      left.push(item);
    } else if (cmp > 0) {
      right.push(item);
    } else {
      middle.push(item);
    }
  }

  return [
    ...quickSort(left, compareFn),
    ...middle,
    ...quickSort(right, compareFn)
  ];
}
