const { CS_FOLD, CS_CHECK, CS_RAISE, WINNER, CS_CALL } = require('../actions');

class Seat {
  constructor(id, player, buyin, stack) {
    this.id = id;
    this.player = player;
    this.buyin = buyin;
    this.stack = stack;
    this.hand = [];
    this.bet = 0;
    this.committed = 0;
    this.turn = false;
    this.checked = false;
    this.folded = true;
    this.lastAction = null;
    this.sittingOut = false;
  }

  fold() {
    this.bet = 0;
    this.folded = true;
    this.lastAction = CS_FOLD;
    this.turn = false;
    return true;
  }

  check() {
    this.checked = true;
    this.lastAction = CS_CHECK;
    this.turn = false;
    return true;
  }

  raise(amount) {
    const reRaiseAmount = amount - this.bet;
    if (reRaiseAmount > this.stack || reRaiseAmount <= 0) return false;

    this.bet = amount;
    this.stack -= reRaiseAmount;
    this.committed += reRaiseAmount;
    this.turn = false;
    this.lastAction = CS_RAISE;
    return true;
  }

  placeBlind(amount) {
    const posted = Math.min(amount, this.stack);
    this.bet = posted;
    this.stack -= posted;
    this.committed += posted;
    if (this.stack === 0) {
      this.lastAction = CS_CALL;
    }
    return posted;
  }

  callRaise(amount) {
    let amountCalled = amount - this.bet;
    if (amountCalled < 0) amountCalled = 0;
    if (amountCalled >= this.stack) amountCalled = this.stack;

    this.bet += amountCalled;
    this.stack -= amountCalled;
    this.committed += amountCalled;
    this.turn = false;
    this.lastAction = CS_CALL;
    return amountCalled;
  }

  winHand(amount) {
    this.bet = 0;
    this.stack += amount;
    this.turn = false;
    this.lastAction = WINNER;
  }

  resetStreet() {
    this.bet = 0;
    this.checked = false;
    this.lastAction = null;
  }

  resetHandFlags() {
    this.committed = 0;
    this.bet = 0;
    this.checked = false;
    this.lastAction = null;
    this.hand = [];
    this.turn = false;
  }
}

module.exports = Seat;
