const Table = require('./poker/Table');
const BlackjackTable = require('./blackjack/BlackjackTable');
const Tournament = require('./tournament/Tournament');
const Player = require('./core/Player');
const { decidePokerAction, decideBlackjackAction } = require('./bots/BotAI');
const config = require('../config');

class TableManager {
  constructor(options = {}) {
    this.tables = {};
    this.tournaments = {};
    this.botCounter = 1;
    this.turnTimers = {};
    this.botTimers = {};
    this.onTableUpdate = options.onTableUpdate || (() => {});
    this.onLobbyUpdate = options.onLobbyUpdate || (() => {});
    this.turnTimeoutMs = options.turnTimeoutMs || config.TURN_TIMEOUT_MS || 15000;
    this.botDelayMs = options.botDelayMs || config.BOT_THINK_MS || 800;
    this.initCashTables();
    this.initBlackjackTables();
    this.initTournaments();
  }

  initCashTables() {
    const presets = config.CASH_TABLES || [
      { id: 1, name: 'Hold’em Micro', limit: 10000, maxPlayers: 5, minBet: 25 },
      { id: 2, name: 'Hold’em Mid', limit: 50000, maxPlayers: 5, minBet: 100 },
      { id: 3, name: 'Hold’em High', limit: 100000, maxPlayers: 5, minBet: 250 },
    ];
    presets.forEach((p) => {
      this.tables[p.id] = new Table(p.id, p.name, p.limit, p.maxPlayers, {
        gameType: 'holdem',
        minBet: p.minBet,
        minRaise: p.minBet * 2,
      });
    });
  }

  initBlackjackTables() {
    const presets = config.BLACKJACK_TABLES || [
      { id: 101, name: 'Blackjack 1', minBet: 10, maxBet: 500 },
      { id: 102, name: 'Blackjack 2', minBet: 50, maxBet: 2000 },
    ];
    presets.forEach((p) => {
      this.tables[p.id] = new BlackjackTable(p.id, p.name, {
        minBet: p.minBet,
        maxBet: p.maxBet,
        shoeDecks: config.BJ_SHOE_DECKS || 6,
      });
    });
  }

  initTournaments() {
    const sng = new Tournament(1, 'Spotlight Sit & Go', {
      type: 'sng',
      maxPlayers: 5,
      tableSize: 5,
      buyIn: config.SNG_BUYIN || 1000,
      startingStack: config.SNG_STACK || 5000,
      onUpdate: (t) => this.onLobbyUpdate(),
      onFinish: () => this.onLobbyUpdate(),
    });
    const mtt = new Tournament(2, 'Grand Arena MTT', {
      type: 'mtt',
      maxPlayers: 12,
      tableSize: 4,
      buyIn: config.MTT_BUYIN || 1000,
      startingStack: config.MTT_STACK || 5000,
      onUpdate: (t) => this.onLobbyUpdate(),
      onFinish: () => this.onLobbyUpdate(),
    });
    this.tournaments[1] = sng;
    this.tournaments[2] = mtt;
  }

  getTable(tableId) {
    if (this.tables[tableId]) return this.tables[tableId];
    for (const tourney of Object.values(this.tournaments)) {
      const t = tourney.getTable && tourney.getTable(tableId);
      if (t) return t;
    }
    return null;
  }

  getLobbyTables() {
    return Object.values(this.tables).map((table) => {
      if (table.gameType === 'blackjack') {
        return {
          id: table.id,
          name: table.name,
          gameType: 'blackjack',
          limit: table.maxBet,
          maxPlayers: table.maxPlayers,
          currentNumberPlayers: table.players.length,
          smallBlind: table.minBet,
          bigBlind: table.maxBet,
          minBet: table.minBet,
          maxBet: table.maxBet,
        };
      }
      return {
        id: table.id,
        name: table.name,
        gameType: table.gameType || 'holdem',
        limit: table.limit,
        maxPlayers: table.maxPlayers,
        currentNumberPlayers: table.players.length,
        smallBlind: table.minBet,
        bigBlind: table.minBet * 2,
      };
    });
  }

  getLobbyTournaments() {
    return Object.values(this.tournaments).map((t) => t.lobbyInfo());
  }

  createBot(namePrefix = 'Bot', chips = config.INITIAL_CHIPS_AMOUNT) {
    const id = `bot-${this.botCounter++}`;
    return new Player(`bot-socket-${id}`, id, `${namePrefix} ${this.botCounter - 1}`, chips, {
      isBot: true,
    });
  }

  fillWithBots(tableId, count) {
    const table = this.getTable(tableId);
    if (!table) return false;

    const hasHumanSeated = Object.values(table.seats).some(
      (s) => s && s.player && !s.player.isBot,
    );
    // Only keep a free seat open when no human is seated yet
    const reserveOpenSeat = !hasHumanSeated;
    const emptyNow = Object.values(table.seats).filter((s) => !s).length;
    const maxAdd = reserveOpenSeat ? Math.max(0, emptyNow - 1) : emptyNow;
    const target =
      count == null || count === undefined
        ? maxAdd
        : Math.min(Number(count) || 0, maxAdd);

    let added = 0;
    while (added < target) {
      const emptySeats = Object.values(table.seats).filter((s) => !s).length;
      if (reserveOpenSeat ? emptySeats <= 1 : emptySeats <= 0) break;

      const seatId = table.findEmptySeat();
      if (!seatId) break;
      const buyin =
        table.gameType === 'blackjack'
          ? 0
          : Math.min(table.limit || 5000, config.INITIAL_CHIPS_AMOUNT);
      const bot = this.createBot('Bot', Math.max(buyin, config.INITIAL_CHIPS_AMOUNT));
      table.addPlayer(bot);
      if (table.gameType === 'blackjack') {
        table.sitPlayer(bot, seatId);
      } else {
        table.sitPlayer(bot, seatId, buyin);
        bot.bankroll -= buyin;
      }
      added += 1;
    }
    if (
      table.gameType !== 'blackjack' &&
      table.handOver &&
      table.activePlayers().length >= 2
    ) {
      this.startHand(table);
    }
    this.onTableUpdate(table);
    this.onLobbyUpdate();
    return added > 0;
  }

  /**
   * Replace a bot at seatId with a human player.
   * Returns { ok, wasTurn, message } or { ok: false }.
   */
  takeBotSeat(tableId, player, seatId, amount) {
    const table = this.getTable(tableId);
    if (!table || !player) return { ok: false, error: 'Table not found' };
    const seat = table.seats[seatId];
    if (!seat || !seat.player || !seat.player.isBot) {
      return { ok: false, error: 'Seat has no bot' };
    }
    if (Object.values(table.seats).some((s) => s && s.player.id === player.id)) {
      return { ok: false, error: 'Already seated' };
    }

    const wasTurn = table.turn === seatId;
    const bot = seat.player;

    // Free the seat and drop the bot from the table roster
    table.seats[seatId] = null;
    table.players = table.players.filter((p) => p && p.id !== bot.id);

    if (table.gameType === 'blackjack') {
      if (!table.sitPlayer(player, seatId)) {
        return { ok: false, error: 'Could not sit' };
      }
      return { ok: true, wasTurn: false, message: `${player.name} took Seat ${seatId}` };
    }

    const buyin = Number(amount);
    if (!table.sitPlayer(player, seatId, buyin)) {
      return { ok: false, error: 'Could not sit' };
    }

    // Mid-hand: new seat stays folded (Seat defaults folded=true)
    const waiting = !table.handOver;
    if (wasTurn && waiting) {
      // Bot's turn was interrupted — move action to the next live player
      if (table.unfoldedPlayers().length === 1) {
        table.endWithoutShowdown();
      } else {
        const next =
          table.nextActor(seatId) || table.nextUnfoldedPlayer(seatId, 1);
        if (next == null) {
          table.collectBetsToPot();
          table.runOutBoard();
        } else {
          table.turn = next;
          table.markTurnFlags();
        }
      }
    }

    return {
      ok: true,
      wasTurn,
      message: waiting
        ? `${player.name} took Seat ${seatId} (waits for next hand)`
        : `${player.name} took Seat ${seatId}`,
    };
  }

  fillTournamentWithBots(tournamentId, count = 3) {
    const tourney = this.tournaments[tournamentId];
    if (!tourney || tourney.status !== 'registering') return false;
    let added = 0;
    while (
      added < count &&
      tourney.registrants.length < tourney.maxPlayers
    ) {
      const bot = this.createBot('TBot', Math.max(tourney.buyIn, 5000));
      const result = tourney.register(bot);
      if (!result.ok) break;
      added += 1;
    }
    this.onLobbyUpdate();
    return added > 0;
  }

  clearTurnTimer(tableId) {
    if (this.turnTimers[tableId]) {
      clearTimeout(this.turnTimers[tableId]);
      delete this.turnTimers[tableId];
    }
  }

  clearBotTimer(tableId) {
    if (this.botTimers[tableId]) {
      clearTimeout(this.botTimers[tableId]);
      delete this.botTimers[tableId];
    }
  }

  scheduleTurnTimer(table) {
    this.clearTurnTimer(table.id);
    if (table.gameType === 'blackjack') {
      if (table.phase !== 'player' || table.turn == null) return;
      this.turnTimers[table.id] = setTimeout(() => {
        const seat = table.seats[table.turn];
        if (!seat) return;
        if (seat.player.isBot) return;
        table.stand(seat.player.socketId);
        this.afterAction(table);
      }, this.turnTimeoutMs);
      return;
    }

    if (table.handOver || table.turn == null) return;
    const seat = table.seats[table.turn];
    if (!seat || seat.player.isBot) return;

    this.turnTimers[table.id] = setTimeout(() => {
      const res = table.autoActForTurn();
      if (res) {
        this.changeTurn(table, res.seatId, res.message);
      }
    }, this.turnTimeoutMs);
  }

  scheduleBotAction(table) {
    this.clearBotTimer(table.id);
    if (table.gameType === 'blackjack') {
      if (table.phase !== 'player' || table.turn == null) return;
      const seat = table.seats[table.turn];
      if (!seat || !seat.player.isBot) return;
      this.botTimers[table.id] = setTimeout(() => {
        const decision = decideBlackjackAction(table, seat);
        let res = null;
        if (decision.action === 'hit') res = table.hit(seat.player.socketId);
        else if (decision.action === 'double') {
          res = table.double(seat.player.socketId);
          if (!res) res = table.hit(seat.player.socketId);
        } else res = table.stand(seat.player.socketId);
        if (!res) res = table.stand(seat.player.socketId);
        this.afterAction(table, res && res.message);
      }, this.botDelayMs);
      return;
    }

    if (table.handOver || table.turn == null) return;
    const seat = table.seats[table.turn];
    if (!seat || !seat.player.isBot) return;

    this.botTimers[table.id] = setTimeout(() => {
      // Turn may have changed while waiting
      if (table.handOver || table.turn !== seat.id) {
        this.scheduleTurnTimer(table);
        this.scheduleBotAction(table);
        return;
      }
      let decision = decidePokerAction(table, seat);
      let res = decision
        ? table.handleActionBySeatId(seat.id, decision.action, decision.amount)
        : null;
      // Always advance — invalid bot raises / empty decisions must not stall the hand
      if (!res) res = table.autoActForTurn();
      if (res) this.changeTurn(table, res.seatId, res.message);
      else {
        this.scheduleTurnTimer(table);
        this.scheduleBotAction(table);
      }
    }, this.botDelayMs);
  }

  /** Re-arm turn/bot timers for an ongoing hand (e.g. after a player joins mid-hand). */
  resumeHand(table) {
    if (!table || table.gameType === 'blackjack') {
      if (table) {
        this.scheduleTurnTimer(table);
        this.scheduleBotAction(table);
      }
      return;
    }
    if (table.handOver || table.turn == null) return;
    this.scheduleTurnTimer(table);
    this.scheduleBotAction(table);
  }

  afterHandHooks(table) {
    // Tournament bust handling
    if (table.tournamentId && this.tournaments[table.tournamentId]) {
      this.tournaments[table.tournamentId].handleBusts(table);
    }
  }

  startHand(table) {
    if (!table || table.gameType === 'blackjack') return;
    table.clearWinMessages();
    table.startHand();
    this.onTableUpdate(table, '--- New hand started ---');
    this.scheduleTurnTimer(table);
    this.scheduleBotAction(table);
  }

  initNewHand(table) {
    if (!table || table.gameType === 'blackjack') return;
    if (!this._nextHandTimers) this._nextHandTimers = {};
    if (this._nextHandTimers[table.id]) return; // already waiting to deal

    if (table.activePlayers().length > 1) {
      this.onTableUpdate(table, '---New hand starting in 5 seconds---');
    }
    this._nextHandTimers[table.id] = setTimeout(() => {
      delete this._nextHandTimers[table.id];
      if (table.activePlayers().length > 1 && table.handOver) {
        this.startHand(table);
      }
    }, 5000);
  }

  changeTurn(table, seatId, message) {
    this.clearTurnTimer(table.id);
    this.clearBotTimer(table.id);
    setTimeout(() => {
      table.changeTurn(seatId);
      this.onTableUpdate(table, message || null);
      if (table.handOver) {
        this.afterHandHooks(table);
        this.initNewHand(table);
      } else {
        this.scheduleTurnTimer(table);
        this.scheduleBotAction(table);
      }
    }, 400);
  }

  afterAction(table, message) {
    this.clearTurnTimer(table.id);
    this.clearBotTimer(table.id);
    this.onTableUpdate(table, message || null);
    if (table.gameType === 'blackjack') {
      // Auto-bet bots and start round when all humans bet? For simplicity, bots bet when phase is betting
      if (table.phase === 'betting' && table.handOver) {
        this.maybeBlackjackBotBets(table);
      }
      this.scheduleTurnTimer(table);
      this.scheduleBotAction(table);
    }
  }

  maybeBlackjackBotBets(table) {
    for (const seat of table.activeSeats()) {
      if (seat.player.isBot && seat.bet === 0) {
        const bet = Math.min(table.minBet * 2, seat.player.bankroll);
        if (bet >= table.minBet) {
          table.placeBet(seat.player.socketId, bet);
        }
      }
    }
    const humans = table.activeSeats().filter((s) => !s.player.isBot);
    const ready =
      table.activeSeats().filter((s) => s.bet > 0).length >= 1 &&
      humans.every((s) => s.bet > 0 || s.player.isBot);
    // Start if at least one bet and all bot seats that wanted to bet have bet
    if (table.activeSeats().some((s) => s.bet > 0)) {
      // start when every seated player has bet or we explicitly start via socket
    }
  }

  joinTable(tableId, player) {
    const table = this.getTable(tableId);
    if (!table || !player) return { ok: false, error: 'Table not found' };
    table.addPlayer(player);
    this.onLobbyUpdate();
    return { ok: true, table };
  }

  leaveTable(tableId, socketId, creditBankroll) {
    const table = this.getTable(tableId);
    if (!table) return { ok: false };
    if (table.gameType === 'blackjack') {
      table.removePlayer(socketId);
    } else {
      const seat = Object.values(table.seats).find(
        (s) => s && s.player.socketId === socketId,
      );
      if (seat && creditBankroll) creditBankroll(seat.player, seat.stack);
      table.removePlayer(socketId);
      if (table.activePlayers().length === 1) {
        setTimeout(() => {
          table.clearSeatHands();
          table.resetBoardAndPot();
          table.clearWinMessages();
          this.onTableUpdate(table, 'Waiting for more players');
        }, 2000);
      } else if (!table.handOver && table.activePlayers().length >= 2) {
        this.resumeHand(table);
      } else if (table.handOver && table.activePlayers().length >= 2) {
        this.initNewHand(table);
      }
    }
    this.onLobbyUpdate();
    return { ok: true, table };
  }
}

module.exports = TableManager;
