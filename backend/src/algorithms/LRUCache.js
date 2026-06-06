class LRUNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity = 50) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new LRUNode(null, null); // Dummy head
    this.tail = new LRUNode(null, null); // Dummy tail
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    const prevNode = node.prev;
    const nextNode = node.next;
    prevNode.next = nextNode;
    nextNode.prev = prevNode;
  }

  _insertToHead(node) {
    const firstNode = this.head.next;
    this.head.next = node;
    node.prev = this.head;
    node.next = firstNode;
    firstNode.prev = node;
  }

  get(key) {
    if (!this.map.has(key)) {
      return null;
    }
    const node = this.map.get(key);
    this._remove(node);
    this._insertToHead(node);
    return node.value;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.value = value;
      this._remove(node);
      this._insertToHead(node);
      return;
    }

    if (this.map.size >= this.capacity) {
      const lruNode = this.tail.prev;
      this._remove(lruNode);
      this.map.delete(lruNode.key);
    }

    const newNode = new LRUNode(key, value);
    this._insertToHead(newNode);
    this.map.set(key, newNode);
  }

  delete(key) {
    if (!this.map.has(key)) return false;
    const node = this.map.get(key);
    this._remove(node);
    this.map.delete(key);
    return true;
  }

  clear() {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
}

module.exports = LRUCache;
