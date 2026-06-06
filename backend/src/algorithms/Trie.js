class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.word = null; // Storing the original case word at the terminal node
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    if (!word) return;
    let node = this.root;
    const cleanWord = word.trim().toLowerCase();
    for (const char of cleanWord) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
    node.word = word;
  }

  searchPrefix(prefix) {
    if (!prefix) return [];
    let node = this.root;
    const cleanPrefix = prefix.trim().toLowerCase();
    for (const char of cleanPrefix) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }
    
    const results = [];
    this._collectWords(node, results);
    return results;
  }

  _collectWords(node, results, limit = 10) {
    if (results.length >= limit) return;
    if (node.isEndOfWord && node.word) {
      if (!results.includes(node.word)) {
        results.push(node.word);
      }
    }
    for (const char in node.children) {
      this._collectWords(node.children[char], results, limit);
    }
  }
}

module.exports = Trie;
