const Table = require('../poker/Table');
const { BlindSchedule } = require('./BlindSchedule');

let nextTableId = 10000;

class Tournament {
  constructor(id, name, options = {}) {
    this.id = id;
    this.name = name;
    this.type = options.type || 'sng'; // sng | mtt
    this.maxPlayers = options.maxPlayers || (options.type === 'mtt' ? 18 : 5);
    this.tableSize = options.tableSize || 5;
    this.buyIn = options.buyIn || 1000;
    this.startingStack = options.startingStack || 5000;
    this.status = 'registering'; // registering | running | finished
    this.registrants = []; // Player refs
    this.tables = {};
    this.blindSchedule = new BlindSchedule(options.blindLevels);
    this.eliminated = [];
    this.prizePool = 0;
    this.winners = [];
    this.onUpdate = options.onUpdate || (() => {});
    this.onFinish = options.onFinish || (() => {});
  }

  lobbyInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      maxPlayers: this.maxPlayers,
      tableSize: this.tableSize,
      buyIn: this.buyIn,
      startingStack: this.startingStack,
      registered: this.registrants.length,
      prizePool: this.prizePool,
      blinds: this.blindSchedule.current(),
      winners: this.winners,
      tables: Object.values(this.tables).map((t) => ({
        id: t.id,
        name: t.name,
        seated: t.activePlayers().length,
        maxPlayers: t.maxPlayers,
      })),
    };
  }

  register(player) {
    if (this.status !== 'registering') return { ok: false, error: 'Not open' };
    if (this.registrants.find((p) => p.id === player.id)) {
      return { ok: false, error: 'Already registered' };
    }
    if (this.registrants.length >= this.maxPlayers) {
      return { ok: false, error: 'Full' };
    }
    if (player.bankroll < this.buyIn) {
      return { ok: false, error: 'Insufficient bankroll' };
    }
    player.bankroll -= this.buyIn;
    this.prizePool += this.buyIn;
    this.registrants.push(player);
    this.onUpdate(this);
    if (this.type === 'sng' && this.registrants.length >= this.maxPlayers) {
      this.start();
    }
    return { ok: true };
  }

  start() {
    if (this.status !== 'registering') return false;
    if (this.registrants.length < 2) return false;
    this.status = 'running';
    this.seatPlayers();
    const blinds = this.blindSchedule.current();
    Object.values(this.tables).forEach((table) => {
      table.setBlindsAmounts(blinds.smallBlind, blinds.bigBlind);
      table.tournamentId = this.id;
    });
    this.blindSchedule.start((level) => {
      Object.values(this.tables).forEach((table) => {
        table.setBlindsAmounts(level.smallBlind, level.bigBlind);
      });
      this.onUpdate(this);
    });
    this.onUpdate(this);
    // Start hands on each table
    Object.values(this.tables).forEach((table) => {
      if (table.activePlayers().length >= 2) {
        table.startHand();
      }
    });
    return true;
  }

  seatPlayers() {
    const players = this.registrants.slice();
    const numTables = Math.max(1, Math.ceil(players.length / this.tableSize));
    for (let t = 0; t < numTables; t++) {
      const id = nextTableId++;
      const table = new Table(
        id,
        `${this.name} T${t + 1}`,
        this.startingStack,
        this.tableSize,
        {
          gameType: 'holdem',
          tournamentId: this.id,
          minBet: this.blindSchedule.current().smallBlind,
          minRaise: this.blindSchedule.current().bigBlind * 2,
        },
      );
      this.tables[id] = table;
    }

    const tableList = Object.values(this.tables);
    players.forEach((player, idx) => {
      const table = tableList[idx % tableList.length];
      table.addPlayer(player);
      const seatId = table.findEmptySeat();
      table.sitPlayer(player, seatId, this.startingStack, {
        tournamentCredits: true,
      });
    });
  }

  getTable(tableId) {
    return this.tables[tableId];
  }

  findTableByPlayerSocket(socketId) {
    return Object.values(this.tables).find((table) =>
      table.players.some((p) => p.socketId === socketId),
    );
  }

  handleBusts(table) {
    for (const seat of Object.values(table.seats)) {
      if (seat && seat.stack <= 0 && !seat.player._eliminated) {
        seat.player._eliminated = true;
        seat.sittingOut = true;
        this.eliminated.push(seat.player);
        table.standPlayer(seat.player.socketId);
        table.players = table.players.filter((p) => p.id !== seat.player.id);
      }
    }
    this.rebalance();
    this.checkFinished();
  }

  rebalance() {
    const tables = Object.values(this.tables).filter(
      (t) => t.activePlayers().length > 0 || t.players.length > 0,
    );
    // Merge: if we can fit remaining players onto fewer tables
    const allPlayers = [];
    tables.forEach((t) => {
      Object.values(t.seats).forEach((seat) => {
        if (seat && seat.stack > 0) {
          allPlayers.push({ player: seat.player, stack: seat.stack, from: t });
        }
      });
    });

    const needed = Math.max(1, Math.ceil(allPlayers.length / this.tableSize));
    if (tables.length <= needed || allPlayers.length <= this.tableSize) {
      if (allPlayers.length <= this.tableSize && tables.length > 1) {
        // Final table merge
        const keep = tables[0];
        tables.slice(1).forEach((t) => {
          delete this.tables[t.id];
        });
        // Clear and reseat
        keep.clearSeats();
        keep.players = [];
        allPlayers.forEach(({ player, stack }) => {
          keep.addPlayer(player);
          // Temporarily reflect tournament stack on a phantom bankroll check bypass
          keep.sitPlayer(player, keep.findEmptySeat(), stack, {
            tournamentCredits: true,
          });
        });
        this.tables = { [keep.id]: keep };
      }
      return;
    }
  }

  checkFinished() {
    const alive = [];
    Object.values(this.tables).forEach((t) => {
      Object.values(t.seats).forEach((seat) => {
        if (seat && seat.stack > 0) alive.push(seat.player);
      });
    });

    if (alive.length === 1 && this.status === 'running') {
      this.finish(alive[0]);
    }
  }

  finish(winnerPlayer) {
    this.status = 'finished';
    this.blindSchedule.clear();
    const payouts =
      this.type === 'mtt'
        ? this.mttPayouts()
        : [{ player: winnerPlayer, amount: this.prizePool }];

    this.winners = payouts.map((p) => ({
      id: p.player.id,
      name: p.player.name,
      amount: p.amount,
    }));

    payouts.forEach((p) => {
      const lobby = p.player._lobbyPlayer || p.player;
      if (lobby) lobby.bankroll += p.amount;
    });

    this.onFinish(this);
    this.onUpdate(this);
  }

  mttPayouts() {
    // Top 3: 50% / 30% / 20% of prize pool among last eliminated + winner
    const order = [];
    Object.values(this.tables).forEach((t) => {
      Object.values(t.seats).forEach((seat) => {
        if (seat && seat.stack > 0) order.push(seat.player);
      });
    });
    // eliminated is earliest first; reverse for place
    const places = order.concat(this.eliminated.slice().reverse());
    const unique = [];
    const seen = new Set();
    for (const p of places) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    }
    const shares = [0.5, 0.3, 0.2];
    const result = [];
    for (let i = 0; i < Math.min(3, unique.length); i++) {
      result.push({
        player: unique[i],
        amount: Math.floor(this.prizePool * shares[i]),
      });
    }
    // leftover to winner
    const paid = result.reduce((s, r) => s + r.amount, 0);
    if (result[0]) result[0].amount += this.prizePool - paid;
    return result;
  }
}

module.exports = Tournament;
