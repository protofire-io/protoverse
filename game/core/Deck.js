const lodash = require('lodash');

class Deck {
  constructor(numDecks = 1) {
    this.suits = ['s', 'h', 'd', 'c'];
    this.ranks = [
      'A',
      'K',
      'Q',
      'J',
      '10',
      '9',
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
    ];
    this.numDecks = numDecks;
    this.cards = this.createDeckAndShuffle();
  }

  createDeckAndShuffle() {
    let cards = [];
    for (let d = 0; d < this.numDecks; d++) {
      this.suits.forEach((suit) => {
        this.ranks.forEach((rank) => {
          cards.push({ suit, rank });
        });
      });
    }
    return lodash.shuffle(cards);
  }

  count() {
    return this.cards.length;
  }

  draw() {
    if (this.cards.length === 0) return null;
    return this.cards.shift();
  }

  burn() {
    return this.draw();
  }
}

module.exports = Deck;
