const _abc = require('underscore');
const lodash = require('lodash');
const Hand = require('pokersolver').Hand;
const Seat = require('./Seat');
const Deck = require('../core/Deck');
const SidePot = require('./SidePot');

class Table {
  constructor(id, name, limit, maxPlayers = 5, options = {}) {
    this.id = id;
    this.name = name;
    this.limit = limit;
    this.maxPlayers = maxPlayers;
    this.gameType = options.gameType || 'holdem';
    this.tournamentId = options.tournamentId || null;
    this.players = [];
    this.seats = this.initSeats(maxPlayers);
    this.board = [];
    this.deck = null;
    this.button = null;
    this.turn = null;
    this.pot = 0;
    this.mainPot = 0;
    this.callAmount = null;
    this.minBet = options.minBet != null ? options.minBet : limit / 40;
    this.minRaise = options.minRaise != null ? options.minRaise : limit / 20;
    this.smallBlind = null;
    this.bigBlind = null;
    this.handOver = true;
    this.winMessages = [];
    this.wentToShowdown = false;
    this.sidePots = [];
    this.history = [];
    this.turnTimer = null;
  }

  setBlindsAmounts(smallBlind, bigBlind) {
    this.minBet = smallBlind;
    this.minRaise = bigBlind * 2;
  }

  initSeats(maxPlayers) {
    const seats = {};
    for (let i = 1; i <= maxPlayers; i++) {
      seats[i] = null;
    }
    return seats;
  }

  addPlayer(player) {
    if (!player) return false;
    if (this.players.find((p) => p && p.id === player.id)) return false;
    this.players.push(player);
    return true;
  }

  removePlayer(socketId) {
    this.players = this.players.filter(
      (player) => player && player.socketId !== socketId,
    );
    this.standPlayer(socketId);
  }

  removePlayerById(playerId) {
    const player = this.players.find((p) => p && p.id === playerId);
    if (player) {
      this.removePlayer(player.socketId);
    }
  }

  findEmptySeat() {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (!this.seats[i]) return i;
    }
    return null;
  }

  sitPlayer(player, seatId, amount, options = {}) {
    if (!player || this.seats[seatId]) return false;
    if (amount <= 0) return false;
    if (!options.tournamentCredits && amount > player.bankroll) return false;
    if (Object.values(this.seats).some((s) => s && s.player.id === player.id)) {
      return false;
    }

    this.seats[seatId] = new Seat(seatId, player, amount, amount);
    const firstPlayer =
      Object.values(this.seats).filter((seat) => seat != null).length === 1;
    this.button = firstPlayer ? seatId : this.button;
    return true;
  }

  rebuyPlayer(seatId, amount, player) {
    const seat = this.seats[seatId];
    if (!seat) throw new Error('No seated player to rebuy');
    if (player && seat.player.id !== player.id) {
      throw new Error('Not your seat');
    }
    if (amount <= 0 || amount > seat.player.bankroll) {
      throw new Error('Invalid rebuy amount');
    }
    seat.stack += amount;
    seat.sittingOut = false;
    return true;
  }

  standPlayer(socketId) {
    for (let i of Object.keys(this.seats)) {
      if (this.seats[i] && this.seats[i].player.socketId === socketId) {
        this.seats[i] = null;
      }
    }

    const satPlayers = Object.values(this.seats).filter((seat) => seat != null);

    if (satPlayers.length === 1) {
      this.endWithoutShowdown();
    }

    if (satPlayers.length === 0) {
      this.resetEmptyTable();
    }
  }

  findPlayerBySocketId(socketId) {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (this.seats[i] && this.seats[i].player.socketId === socketId) {
        return this.seats[i];
      }
    }
    return null;
  }

  getTurnSeat() {
    return this.turn ? this.seats[this.turn] : null;
  }

  canAct(socketId) {
    const seat = this.findPlayerBySocketId(socketId);
    if (!seat || this.handOver) return false;
    return seat.id === this.turn && !seat.folded && seat.stack >= 0;
  }

  getLegalActions(seat) {
    if (!seat || seat.id !== this.turn || seat.folded) return [];
    const actions = ['fold'];
    const facingBet =
      this.callAmount != null && seat.bet < this.callAmount;

    if (!facingBet) {
      actions.push('check');
      if (seat.stack > 0) actions.push('raise');
    } else {
      if (seat.stack > 0) actions.push('call');
      const maxTo = seat.stack + seat.bet;
      if (maxTo > this.callAmount) actions.push('raise');
    }
    return actions;
  }

  unfoldedPlayers() {
    return Object.values(this.seats).filter(
      (seat) => seat != null && !seat.folded,
    );
  }

  activePlayers() {
    return Object.values(this.seats).filter(
      (seat) => seat != null && !seat.sittingOut,
    );
  }

  nextUnfoldedPlayer(player, places) {
    let i = 0;
    let current = player;
    let guard = 0;
    while (i < places && guard < this.maxPlayers * 2) {
      current = current === this.maxPlayers ? 1 : current + 1;
      const seat = this.seats[current];
      if (seat && !seat.folded && seat.stack >= 0) i++;
      guard++;
    }
    return current;
  }

  nextActivePlayer(player, places) {
    let i = 0;
    let current = player;
    let guard = 0;
    while (i < places && guard < this.maxPlayers * 2) {
      current = current === this.maxPlayers ? 1 : current + 1;
      const seat = this.seats[current];
      if (seat && !seat.sittingOut) i++;
      guard++;
    }
    return current;
  }

  nextActor(fromSeatId) {
    let current = fromSeatId;
    for (let i = 0; i < this.maxPlayers; i++) {
      current = current === this.maxPlayers ? 1 : current + 1;
      const seat = this.seats[current];
      if (seat && !seat.folded && seat.stack > 0) {
        return current;
      }
    }
    return null;
  }

  startHand() {
    this.deck = new Deck();
    this.wentToShowdown = false;
    this.resetBoardAndPot();
    this.clearSeatHands();
    this.resetBetsAndActions();
    this.unfoldPlayers();
    this.history = [];

    if (this.activePlayers().length > 1) {
      this.button = this.nextActivePlayer(this.button, 1);
      this.setTurn();
      this.dealPreflop();
      this.setBlinds();
      this.handOver = false;
      this.markTurnFlags();
    }

    this.updateHistory();
  }

  unfoldPlayers() {
    for (let i = 1; i <= this.maxPlayers; i++) {
      const seat = this.seats[i];
      if (seat) {
        seat.resetHandFlags();
        seat.folded = !!seat.sittingOut;
      }
    }
  }

  setTurn() {
    this.turn =
      this.activePlayers().length <= 3
        ? this.button
        : this.nextActivePlayer(this.button, 3);
  }

  setBlinds() {
    const isHeadsUp = this.activePlayers().length === 2;

    this.smallBlind = isHeadsUp
      ? this.button
      : this.nextActivePlayer(this.button, 1);
    this.bigBlind = isHeadsUp
      ? this.nextActivePlayer(this.button, 1)
      : this.nextActivePlayer(this.button, 2);

    const sbPosted = this.seats[this.smallBlind].placeBlind(this.minBet);
    const bbPosted = this.seats[this.bigBlind].placeBlind(this.minBet * 2);

    this.pot += sbPosted + bbPosted;
    this.callAmount = Math.max(sbPosted, bbPosted, this.minBet * 2);
    if (bbPosted < this.minBet * 2) {
      this.callAmount = Math.max(sbPosted, bbPosted);
    }
    this.minRaise = this.callAmount + this.minBet * 2;
  }

  clearSeats() {
    for (let i of Object.keys(this.seats)) {
      this.seats[i] = null;
    }
  }

  clearSeatHands() {
    for (let i of Object.keys(this.seats)) {
      if (this.seats[i]) {
        this.seats[i].hand = [];
      }
    }
  }

  clearSeatTurns() {
    for (let i of Object.keys(this.seats)) {
      if (this.seats[i]) {
        this.seats[i].turn = false;
      }
    }
  }

  clearWinMessages() {
    this.winMessages = [];
  }

  endHand() {
    this.clearSeatTurns();
    this.handOver = true;
    this.turn = null;
    this.sitOutFeltedPlayers();
  }

  sitOutFeltedPlayers() {
    for (let i of Object.keys(this.seats)) {
      const seat = this.seats[i];
      if (seat && seat.stack <= 0) {
        seat.sittingOut = true;
      }
    }
  }

  endWithoutShowdown() {
    const winner = this.unfoldedPlayers()[0];
    if (winner) {
      winner.winHand(this.pot);
      this.winMessages.push(
        `${winner.player.name} wins $${this.pot.toFixed(2)}`,
      );
      this.pot = 0;
    }
    this.endHand();
  }

  resetEmptyTable() {
    this.button = null;
    this.turn = null;
    this.handOver = true;
    this.deck = null;
    this.wentToShowdown = false;
    this.resetBoardAndPot();
    this.clearWinMessages();
    this.clearSeats();
  }

  resetBoardAndPot() {
    this.board = [];
    this.pot = 0;
    this.mainPot = 0;
    this.sidePots = [];
  }

  updateHistory() {
    this.history.push({
      pot: +this.pot.toFixed(2),
      mainPot: +this.mainPot.toFixed(2),
      sidePots: this.sidePots.slice(),
      board: this.board.slice(),
      seats: this.cleanSeatsForHistory(),
      button: this.button,
      turn: this.turn,
      winMessages: this.winMessages.slice(),
    });
  }

  cleanSeatsForHistory() {
    const cleanSeats = {};
    for (let i = 1; i <= this.maxPlayers; i++) {
      const seat = this.seats[i];
      if (!seat) {
        cleanSeats[i] = null;
        continue;
      }
      cleanSeats[i] = {
        id: seat.id,
        buyin: seat.buyin,
        stack: +seat.stack.toFixed(2),
        bet: +seat.bet.toFixed(2),
        committed: seat.committed,
        hand: seat.hand.slice(),
        turn: seat.turn,
        checked: seat.checked,
        folded: seat.folded,
        lastAction: seat.lastAction,
        sittingOut: seat.sittingOut,
        player: {
          id: seat.player.id,
          username: seat.player.name,
          isBot: !!seat.player.isBot,
        },
      };
    }
    return cleanSeats;
  }

  markTurnFlags() {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (this.seats[i]) {
        this.seats[i].turn = i === this.turn;
      }
    }
  }

  changeTurn(lastTurn) {
    this.updateHistory();

    if (this.unfoldedPlayers().length === 1) {
      this.endWithoutShowdown();
      return;
    }

    if (this.actionIsComplete()) {
      this.collectBetsToPot();
      this.runOutBoard();
      return;
    }

    if (this.allCheckedOrCalled()) {
      this.collectBetsToPot();
      this.dealNextStreet();
      if (this.handOver) {
        this.turn = null;
      } else if (this.actionIsComplete()) {
        this.runOutBoard();
        return;
      } else {
        this.turn = this.nextActor(this.button) || this.nextUnfoldedPlayer(this.button, 1);
      }
    } else {
      this.turn = this.nextActor(lastTurn);
      if (this.turn == null) {
        this.collectBetsToPot();
        this.runOutBoard();
        return;
      }
    }

    this.markTurnFlags();
  }

  runOutBoard() {
    while (this.board.length < 5 && !this.handOver) {
      this.dealNextStreet();
    }
    this.turn = null;
    this.markTurnFlags();
  }

  collectBetsToPot() {
    // Bets already added to pot on each action; rebuild side pots from committed amounts
    this.sidePots = this.buildSidePotsFromCommitted();
    if (this.sidePots.length > 0) {
      this.mainPot = this.sidePots[0].amount;
      this.pot = this.sidePots.reduce((sum, p) => sum + p.amount, 0);
    }
  }

  buildSidePotsFromCommitted() {
    const seated = Object.values(this.seats).filter((s) => s && s.committed > 0);
    if (seated.length === 0) return [];

    const levels = [...new Set(seated.map((s) => s.committed))].sort(
      (a, b) => a - b,
    );
    let prev = 0;
    const pots = [];

    for (const level of levels) {
      const contributors = seated.filter((s) => s.committed >= level);
      const amount = (level - prev) * contributors.length;
      const eligible = this.unfoldedPlayers()
        .filter((s) => s.committed >= level)
        .map((s) => s.id);
      if (amount > 0 && eligible.length > 0) {
        pots.push(new SidePot(amount, eligible));
      } else if (amount > 0 && eligible.length === 0) {
        // folded contributors still created chips; give to remaining unfolded
        const fallback = this.unfoldedPlayers().map((s) => s.id);
        if (fallback.length) pots.push(new SidePot(amount, fallback));
      }
      prev = level;
    }
    return pots;
  }

  allCheckedOrCalled() {
    // Preflop: BB still has option if nobody raised
    if (this.board.length === 0 && this.bigBlind && this.seats[this.bigBlind]) {
      const bb = this.seats[this.bigBlind];
      const bbAmount = this.minBet * 2;
      if (
        !bb.folded &&
        bb.stack > 0 &&
        !bb.checked &&
        bb.lastAction == null &&
        this.callAmount <= bbAmount + 0.0001
      ) {
        // BB posted blind but has not acted yet — only wait if turn would reach them
        // If everyone else matched BB and BB hasn't acted, round not complete until BB acts
        const othersActed = this.unfoldedPlayers()
          .filter((s) => s.id !== this.bigBlind && s.stack > 0)
          .every(
            (s) =>
              s.lastAction != null ||
              s.bet >= this.callAmount ||
              s.stack === 0,
          );
        if (othersActed && bb.bet <= bbAmount && !bb.checked) {
          return false;
        }
      }
    }

    for (let i of Object.keys(this.seats)) {
      const seat = this.seats[i];
      if (seat && !seat.folded && seat.stack > 0) {
        if (
          (this.callAmount &&
            Math.abs(seat.bet - this.callAmount) > 0.001) ||
          (!this.callAmount && !seat.checked)
        ) {
          return false;
        }
      }
    }
    return true;
  }

  actionIsComplete() {
    const seatsToAct = Object.values(this.seats).filter(
      (seat) => seat && !seat.folded && seat.stack > 0,
    );
    return seatsToAct.length <= 1 && this.unfoldedPlayers().length > 1
      ? seatsToAct.length === 0 ||
          (seatsToAct.length === 1 &&
            (this.callAmount == null ||
              seatsToAct[0].bet >= this.callAmount ||
              seatsToAct[0].lastAction === 'CS_CALL' ||
              seatsToAct[0].lastAction === 'CS_CHECK' ||
              seatsToAct[0].lastAction === 'CS_RAISE'))
      : seatsToAct.length === 0;
  }

  dealNextStreet() {
    const length = this.board.length;
    this.resetBetsAndActions();
    if (length === 0) {
      this.dealFlop();
    } else if (length === 3 || length === 4) {
      this.dealTurnOrRiver();
    } else if (length === 5) {
      this.determineWinners();
    }

    if (this.board.length === 5 && !this.handOver) {
      this.determineWinners();
    }
  }

  determineWinners() {
    const pots =
      this.sidePots.length > 0
        ? this.sidePots
        : this.buildSidePotsFromCommitted();

    if (pots.length === 0) {
      // fallback single pot
      this.determineWinner(this.pot, Object.values(this.seats));
    } else {
      pots.forEach((sidePot) => {
        const seats = sidePot.players
          .map((id) => this.seats[id])
          .filter(Boolean);
        this.determineWinner(sidePot.amount, seats);
      });
    }

    this.wentToShowdown = true;
    this.pot = 0;
    this.sidePots = [];
    this.endHand();
  }

  determineWinner(amount, seats) {
    const participants = seats
      .filter((seat) => seat && !seat.folded)
      .map((seat) => {
        const cards = seat.hand.slice().concat(this.board.slice());
        const solverCards = this.mapCardsForPokerSolver(cards);
        return {
          seatId: seat.id,
          solverCards,
        };
      });

    if (participants.length === 0 || amount <= 0) return;

    if (participants.length === 1) {
      const seat = this.seats[participants[0].seatId];
      seat.winHand(amount);
      this.winMessages.push(
        `${seat.player.name} wins $${amount.toFixed(2)}`,
      );
      this.updateHistory();
      return;
    }

    const findHandOwner = (cards) => {
      const sorted = cards.slice().sort();
      const participant = participants.find((participant) =>
        lodash.isEqual(participant.solverCards.slice().sort(), sorted),
      );
      return participant ? participant.seatId : participants[0].seatId;
    };

    const solverWinners = Hand.winners(
      participants.map((p) => Hand.solve(p.solverCards)),
    );

    const winners = solverWinners.map((winner) => {
      const winningCards = winner.cardPool
        .map((card) => card.value + card.suit)
        .sort();
      const seatId = findHandOwner(winningCards);
      return [seatId, winner.descr];
    });

    // unique seat winners (solver can duplicate)
    const unique = [];
    const seen = new Set();
    for (const w of winners) {
      if (!seen.has(w[0])) {
        seen.add(w[0]);
        unique.push(w);
      }
    }

    for (let i = 0; i < unique.length; i++) {
      const seat = this.seats[unique[i][0]];
      const handDesc = unique[i][1];
      const winAmount = amount / unique.length;
      seat.winHand(winAmount);
      if (winAmount > 0) {
        this.winMessages.push(
          `${seat.player.name} wins $${winAmount.toFixed(2)} with ${handDesc}`,
        );
      }
    }

    this.updateHistory();
  }

  mapCardsForPokerSolver(cards) {
    return cards.map((card) => {
      const suit = card.suit.slice(0, 1);
      let rank;
      if (card.rank === '10') {
        rank = 'T';
      } else {
        rank =
          card.rank.length > 1
            ? card.rank.slice(0, 1).toUpperCase()
            : card.rank;
      }
      return rank + suit;
    });
  }

  resetBetsAndActions() {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (this.seats[i]) {
        this.seats[i].resetStreet();
      }
    }
    this.callAmount = null;
    this.minRaise = this.minBet * 2;
  }

  dealPreflop() {
    const arr = _abc.range(1, this.maxPlayers + 1);
    const order = arr.slice(this.button).concat(arr.slice(0, this.button));

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < order.length; j++) {
        const seat = this.seats[order[j]];
        if (seat && !seat.sittingOut) {
          seat.hand.push(this.deck.draw());
        }
      }
    }
  }

  dealFlop() {
    this.deck.burn();
    for (let i = 0; i < 3; i++) {
      this.board.push(this.deck.draw());
    }
  }

  dealTurnOrRiver() {
    this.deck.burn();
    this.board.push(this.deck.draw());
  }

  handleFold(socketId) {
    if (!this.canAct(socketId)) return null;
    const seat = this.findPlayerBySocketId(socketId);
    const legal = this.getLegalActions(seat);
    if (!legal.includes('fold')) return null;

    seat.fold();
    return {
      seatId: seat.id,
      message: `${seat.player.name} folds`,
    };
  }

  handleCall(socketId) {
    if (!this.canAct(socketId)) return null;
    const seat = this.findPlayerBySocketId(socketId);
    const legal = this.getLegalActions(seat);
    if (!legal.includes('call')) return null;

    const addedToPot = seat.callRaise(this.callAmount);
    this.pot += addedToPot;

    return {
      seatId: seat.id,
      message: `${seat.player.name} calls $${addedToPot.toFixed(2)}`,
    };
  }

  handleCheck(socketId) {
    if (!this.canAct(socketId)) return null;
    const seat = this.findPlayerBySocketId(socketId);
    const legal = this.getLegalActions(seat);
    if (!legal.includes('check')) return null;

    seat.check();
    return {
      seatId: seat.id,
      message: `${seat.player.name} checks`,
    };
  }

  handleRaise(socketId, amount) {
    if (!this.canAct(socketId)) return null;
    const seat = this.findPlayerBySocketId(socketId);
    const legal = this.getLegalActions(seat);
    if (!legal.includes('raise')) return null;

    const maxTo = seat.stack + seat.bet;
    let toAmount = Number(amount);
    if (Number.isNaN(toAmount)) return null;

    // All-in below min raise is allowed
    const isAllIn = toAmount >= maxTo;
    if (isAllIn) toAmount = maxTo;

    if (!isAllIn) {
      if (this.callAmount != null && toAmount < this.minRaise) return null;
      if (this.callAmount == null && toAmount < this.minBet) return null;
    }
    if (toAmount <= seat.bet) return null;

    const prevBet = seat.bet;
    const ok = seat.raise(toAmount);
    if (!ok) return null;

    const addedToPot = toAmount - prevBet;
    this.pot += addedToPot;

    const raiseBy = toAmount - (this.callAmount || 0);
    this.callAmount = toAmount;
    this.minRaise = toAmount + Math.max(raiseBy, this.minBet);

    return {
      seatId: seat.id,
      message: `${seat.player.name} raises to $${toAmount.toFixed(2)}`,
    };
  }

  // Bot / timer helpers: act by seat id without socket
  handleActionBySeatId(seatId, action, amount) {
    const seat = this.seats[seatId];
    if (!seat || seat.id !== this.turn) return null;
    const socketId = seat.player.socketId;
    if (action === 'fold') return this.handleFold(socketId);
    if (action === 'check') return this.handleCheck(socketId);
    if (action === 'call') return this.handleCall(socketId);
    if (action === 'raise') return this.handleRaise(socketId, amount);
    return null;
  }

  autoActForTurn() {
    const seat = this.getTurnSeat();
    if (!seat) return null;
    const legal = this.getLegalActions(seat);
    if (legal.includes('check')) return this.handleCheck(seat.player.socketId);
    return this.handleFold(seat.player.socketId);
  }
}

module.exports = Table;
