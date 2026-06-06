class MinHeap {
  constructor(compareFn = (a, b) => a - b) {
    this.heap = [];
    this.compare = compareFn;
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  insert(val) {
    this.heap.push(val);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this._bubbleDown(0);
    }
    return min;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.compare(this.heap[idx], this.heap[parentIdx]) >= 0) break;
      this._swap(idx, parentIdx);
      idx = parentIdx;
    }
  }

  _bubbleDown(idx) {
    const len = this.heap.length;
    while (true) {
      const leftIdx = idx * 2 + 1;
      const rightIdx = idx * 2 + 2;
      let smallestIdx = idx;

      if (leftIdx < len && this.compare(this.heap[leftIdx], this.heap[smallestIdx]) < 0) {
        smallestIdx = leftIdx;
      }
      if (rightIdx < len && this.compare(this.heap[rightIdx], this.heap[smallestIdx]) < 0) {
        smallestIdx = rightIdx;
      }

      if (smallestIdx === idx) break;
      this._swap(idx, smallestIdx);
      idx = smallestIdx;
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

module.exports = MinHeap;
