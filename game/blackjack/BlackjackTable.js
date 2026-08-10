const Deck = require('../core/Deck');
const Player = require('../core/Player');

const RANK_VALUES = {
  A: 11,
  K: 10,
  Q: 10,
  J: 10,
  '10': 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
};

function handStats(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += RANK_VALUES[card.rank] || 0;
    if (card.rank === 'A') aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  const soft = aces > 0 && total <= 21;
  return { total, soft };
}

function handValue(cards) {
  return handStats(cards).total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

function isSoft(cards) {
  return handStats(cards).soft;
}

class BlackjackSeat {
  constructor(id, player) {
    this.id = id;
    this.player = player;
    this.hand = [];
    this.bet = 0;
    this.done = false;
    this.bust = false;
    this.stood = false;
    this.doubled = false;
    this.result = null;
    this.payout = 0;
  }
}

class BlackjackTable {
  constructor(id, name, options = {}) {
    this.id = id;
    this.name = name;
    this.gameType = 'blackjack';
    this.maxPlayers = options.maxPlayers || 5;
    this.minBet = options.minBet || 10;
    this.maxBet = options.maxBet || 1000;
    this.shoeDecks = options.shoeDecks || 6;
    this.hitSoft17 = options.hitSoft17 !== false;
    this.players = [];
    this.seats = this.initSeats(this.maxPlayers);
    this.dealer = { hand: [], hideHole: true };
    this.deck = new Deck(this.shoeDecks);
    this.phase = 'betting'; // betting | player | dealer | settle
    this.turn = null;
    this.messages = [];
    this.handOver = true;
  }

  initSeats(maxPlayers) {
    const seats = {};
    for (let i = 1; i <= maxPlayers; i++) seats[i] = null;
    return seats;
  }

  addPlayer(player) {
    if (!player) return false;
    if (this.players.find((p) => p.id === player.id)) return false;
    this.players.push(player);
    return true;
  }

  removePlayer(socketId) {
    this.players = this.players.filter((p) => p && p.socketId !== socketId);
    for (const key of Object.keys(this.seats)) {
      if (this.seats[key] && this.seats[key].player.socketId === socketId) {
        this.seats[key] = null;
      }
    }
  }

  findEmptySeat() {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (!this.seats[i]) return i;
    }
    return null;
  }

  sitPlayer(player, seatId) {
    if (!player || this.seats[seatId]) return false;
    if (Object.values(this.seats).some((s) => s && s.player.id === player.id)) {
      return false;
    }
    this.seats[seatId] = new BlackjackSeat(seatId, player);
    return true;
  }

  findSeatBySocketId(socketId) {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (this.seats[i] && this.seats[i].player.socketId === socketId) {
        return this.seats[i];
      }
    }
    return null;
  }

  activeSeats() {
    return Object.values(this.seats).filter(Boolean);
  }

  reshuffleIfNeeded() {
    if (this.deck.count() < 52) {
      this.deck = new Deck(this.shoeDecks);
    }
  }

  placeBet(socketId, amount) {
    const seat = this.findSeatBySocketId(socketId);
    if (!seat || this.phase !== 'betting') return null;
    const bet = Number(amount);
    if (Number.isNaN(bet) || bet < this.minBet || bet > this.maxBet) return null;
    if (bet > seat.player.bankroll) return null;
    seat.player.bankroll -= bet;
    seat.bet = bet;
    seat.hand = [];
    seat.done = false;
    seat.bust = false;
    seat.stood = false;
    seat.doubled = false;
    seat.result = null;
    seat.payout = 0;
    return { seatId: seat.id, message: `${seat.player.name} bets $${bet}` };
  }

  tryStartRound() {
    const bettors = this.activeSeats().filter((s) => s.bet > 0);
    if (bettors.length === 0) return false;
    if (this.phase !== 'betting') return false;

    this.reshuffleIfNeeded();
    this.dealer = { hand: [], hideHole: true };
    this.handOver = false;
    this.messages = [];

    for (let r = 0; r < 2; r++) {
      for (const seat of bettors) {
        seat.hand.push(this.deck.draw());
      }
      this.dealer.hand.push(this.deck.draw());
    }

    // Check natural blackjacks
    for (const seat of bettors) {
      if (isBlackjack(seat.hand)) {
        seat.done = true;
      }
    }

    if (isBlackjack(this.dealer.hand)) {
      this.dealer.hideHole = false;
      this.settle();
      return true;
    }

    this.phase = 'player';
    this.turn = this.nextPlayerSeat(null);
    if (this.turn == null) {
      this.playDealer();
    }
    return true;
  }

  nextPlayerSeat(fromId) {
    const start = fromId || 0;
    for (let i = 1; i <= this.maxPlayers; i++) {
      const id = ((start + i - 1) % this.maxPlayers) + 1;
      const seat = this.seats[id];
      if (seat && seat.bet > 0 && !seat.done) return id;
    }
    return null;
  }

  canAct(socketId) {
    const seat = this.findSeatBySocketId(socketId);
    return (
      seat &&
      this.phase === 'player' &&
      this.turn === seat.id &&
      !seat.done
    );
  }

  hit(socketId) {
    if (!this.canAct(socketId)) return null;
    const seat = this.findSeatBySocketId(socketId);
    seat.hand.push(this.deck.draw());
    const value = handValue(seat.hand);
    if (value > 21) {
      seat.bust = true;
      seat.done = true;
      this.advanceTurn(seat.id);
      return { seatId: seat.id, message: `${seat.player.name} busts` };
    }
    if (value === 21) {
      seat.done = true;
      this.advanceTurn(seat.id);
    }
    return { seatId: seat.id, message: `${seat.player.name} hits` };
  }

  stand(socketId) {
    if (!this.canAct(socketId)) return null;
    const seat = this.findSeatBySocketId(socketId);
    seat.stood = true;
    seat.done = true;
    this.advanceTurn(seat.id);
    return { seatId: seat.id, message: `${seat.player.name} stands` };
  }

  double(socketId) {
    if (!this.canAct(socketId)) return null;
    const seat = this.findSeatBySocketId(socketId);
    if (seat.hand.length !== 2 || seat.doubled) return null;
    if (seat.player.bankroll < seat.bet) return null;
    seat.player.bankroll -= seat.bet;
    seat.bet *= 2;
    seat.doubled = true;
    seat.hand.push(this.deck.draw());
    const value = handValue(seat.hand);
    if (value > 21) seat.bust = true;
    seat.done = true;
    this.advanceTurn(seat.id);
    return { seatId: seat.id, message: `${seat.player.name} doubles` };
  }

  advanceTurn(fromId) {
    this.turn = this.nextPlayerSeat(fromId);
    if (this.turn == null) {
      this.playDealer();
    }
  }

  playDealer() {
    this.phase = 'dealer';
    this.dealer.hideHole = false;
    // Hit until hard 17+ (or soft 17 if hitSoft17)
    for (;;) {
      const { total, soft } = handStats(this.dealer.hand);
      if (total > 21) break;
      if (total > 17) break;
      if (total === 17 && !(this.hitSoft17 && soft)) break;
      if (total < 17 || (total === 17 && this.hitSoft17 && soft)) {
        this.dealer.hand.push(this.deck.draw());
        continue;
      }
      break;
    }
    this.settle();
  }

  settle() {
    this.phase = 'settle';
    const dealerValue = handValue(this.dealer.hand);
    const dealerBust = dealerValue > 21;
    const dealerBJ = isBlackjack(this.dealer.hand);

    for (const seat of this.activeSeats()) {
      if (!seat.bet) continue;
      const playerValue = handValue(seat.hand);
      const playerBJ = isBlackjack(seat.hand) && !seat.doubled;

      if (seat.bust) {
        seat.result = 'lose';
        seat.payout = 0;
      } else if (playerBJ && !dealerBJ) {
        seat.result = 'blackjack';
        seat.payout = seat.bet + seat.bet * 1.5;
      } else if (dealerBJ && !playerBJ) {
        seat.result = 'lose';
        seat.payout = 0;
      } else if (dealerBJ && playerBJ) {
        seat.result = 'push';
        seat.payout = seat.bet;
      } else if (dealerBust || playerValue > dealerValue) {
        seat.result = 'win';
        seat.payout = seat.bet * 2;
      } else if (playerValue === dealerValue) {
        seat.result = 'push';
        seat.payout = seat.bet;
      } else {
        seat.result = 'lose';
        seat.payout = 0;
      }

      seat.player.bankroll += seat.payout;
      this.messages.push(
        `${seat.player.name} ${seat.result} ($${seat.payout.toFixed(2)})`,
      );
    }

    this.handOver = true;
    this.turn = null;
    this.phase = 'betting';
    // clear bets for next round
    for (const seat of this.activeSeats()) {
      seat.bet = 0;
      seat.done = false;
    }
  }

  publicState(forSocketId) {
    return {
      id: this.id,
      name: this.name,
      gameType: this.gameType,
      maxPlayers: this.maxPlayers,
      minBet: this.minBet,
      maxBet: this.maxBet,
      phase: this.phase,
      turn: this.turn,
      handOver: this.handOver,
      messages: this.messages.slice(),
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        socketId: p.socketId,
        bankroll: p.bankroll,
        isBot: !!p.isBot,
      })),
      dealer: {
        hand:
          this.dealer.hideHole && this.dealer.hand.length > 1
            ? [this.dealer.hand[0], { suit: 'hidden', rank: 'hidden' }]
            : this.dealer.hand.slice(),
        value: this.dealer.hideHole
          ? null
          : handValue(this.dealer.hand),
      },
      seats: Object.fromEntries(
        Object.entries(this.seats).map(([k, seat]) => {
          if (!seat) return [k, null];
          return [
            k,
            {
              id: seat.id,
              player: {
                id: seat.player.id,
                name: seat.player.name,
                socketId: seat.player.socketId,
                bankroll: seat.player.bankroll,
                isBot: !!seat.player.isBot,
              },
              hand: seat.hand.slice(),
              bet: seat.bet,
              done: seat.done,
              bust: seat.bust,
              result: seat.result,
              value: handValue(seat.hand),
              turn: this.turn === seat.id,
            },
          ];
        }),
      ),
    };
  }
}

BlackjackTable.handValue = handValue;
BlackjackTable.isBlackjack = isBlackjack;

module.exports = BlackjackTable;
