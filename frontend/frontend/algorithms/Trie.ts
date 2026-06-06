class TrieNode {
  children: { [key: string]: TrieNode } = {};
  isEndOfWord: boolean = false;
  word: string | null = null;
}

export class Trie {
  root: TrieNode = new TrieNode();

  insert(word: string): void {
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

  searchPrefix(prefix: string): string[] {
    if (!prefix) return [];
    let node = this.root;
    const cleanPrefix = prefix.trim().toLowerCase();
    for (const char of cleanPrefix) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }

    const results: string[] = [];
    this._collectWords(node, results);
    return results;
  }

  private _collectWords(node: TrieNode, results: string[], limit: number = 5): void {
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
