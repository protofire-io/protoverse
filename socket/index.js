const TableManager = require('../game/TableManager');
const Player = require('../game/Player');
const {
  CS_FETCH_LOBBY_INFO,
  SC_RECEIVE_LOBBY_INFO,
  SC_PLAYERS_UPDATED,
  CS_JOIN_TABLE,
  SC_TABLE_JOINED,
  SC_TABLES_UPDATED,
  CS_LEAVE_TABLE,
  SC_TABLE_LEFT,
  CS_FOLD,
  CS_CHECK,
  CS_CALL,
  CS_RAISE,
  TABLE_MESSAGE,
  CS_SIT_DOWN,
  CS_REBUY,
  CS_STAND_UP,
  SITTING_OUT,
  SITTING_IN,
  CS_DISCONNECT,
  SC_TABLE_UPDATED,
  WINNER,
  CS_LOBBY_CONNECT,
  CS_LOBBY_DISCONNECT,
  SC_LOBBY_CONNECTED,
  SC_LOBBY_DISCONNECTED,
  SC_LOBBY_CHAT,
  CS_LOBBY_CHAT,
  CS_FILL_BOTS,
  CS_FILL_TOURNAMENT_BOTS,
  SC_TOURNAMENTS_UPDATED,
  CS_REGISTER_TOURNAMENT,
  CS_START_TOURNAMENT,
  SC_TOURNAMENT_UPDATED,
  SC_TOURNAMENT_STARTED,
  CS_BJ_BET,
  CS_BJ_HIT,
  CS_BJ_STAND,
  CS_BJ_DOUBLE,
  CS_BJ_DEAL,
  CS_PROTO_DEPOSIT,
  CS_PROTO_WITHDRAW,
  SC_PROTO_BANKROLL,
} = require('../game/actions');
const config = require('../config');

const CHIPS_PER_PROTO = config.CHIPS_PER_PROTO || 1000;

function protoToChips(protoAmount) {
  return Math.floor(Number(protoAmount) * CHIPS_PER_PROTO);
}
const players = {};
let ioRef = null;

const manager = new TableManager({
  onTableUpdate: (table, message) => broadcastToTable(table, message),
  onLobbyUpdate: () => {
    if (!ioRef) return;
    ioRef.emit(SC_TABLES_UPDATED, manager.getLobbyTables());
    ioRef.emit(SC_TOURNAMENTS_UPDATED, manager.getLobbyTournaments());
  },
});

function getCurrentPlayers() {
  return Object.values(players).map((player) => ({
    socketId: player.socketId,
    id: player.id,
    name: player.name,
    bankroll: player.bankroll,
    isBot: !!player.isBot,
  }));
}

function emitLobby(socket) {
  const payload = {
    tables: manager.getLobbyTables(),
    tournaments: manager.getLobbyTournaments(),
    players: getCurrentPlayers(),
    socketId: socket.id,
    amount: players[socket.id] ? players[socket.id].bankroll : config.INITIAL_CHIPS_AMOUNT,
  };
  socket.emit(SC_RECEIVE_LOBBY_INFO, payload);
}

function broadcastToTable(table, message = null, from = null) {
  if (!ioRef || !table) return;
  if (table.gameType === 'blackjack') {
    for (const player of table.players) {
      if (!player || player.isBot) continue;
      ioRef.to(player.socketId).emit(SC_TABLE_UPDATED, {
        table: table.publicState(player.socketId),
        message,
        from,
      });
    }
    return;
  }

  for (let i = 0; i < table.players.length; i++) {
    const player = table.players[i];
    if (!player || player.isBot) continue;
    const tableCopy = hideOpponentCards(table, player.socketId);
    ioRef.to(player.socketId).emit(SC_TABLE_UPDATED, {
      table: tableCopy,
      message,
      from,
    });
  }
}

function hideOpponentCards(table, socketId) {
  const tableCopy = {
    id: table.id,
    name: table.name,
    limit: table.limit,
    maxPlayers: table.maxPlayers,
    gameType: table.gameType,
    tournamentId: table.tournamentId,
    players: table.players.map((p) => ({
      id: p.id,
      name: p.name,
      socketId: p.socketId,
      bankroll: p.bankroll,
      isBot: !!p.isBot,
    })),
    board: table.board.slice(),
    button: table.button,
    turn: table.turn,
    pot: table.pot,
    mainPot: table.mainPot,
    callAmount: table.callAmount,
    minBet: table.minBet,
    minRaise: table.minRaise,
    smallBlind: table.smallBlind,
    bigBlind: table.bigBlind,
    handOver: table.handOver,
    winMessages: table.winMessages.slice(),
    wentToShowdown: table.wentToShowdown,
    sidePots: table.sidePots.map((sp) => ({
      amount: sp.amount,
      players: sp.players.slice(),
    })),
    seats: {},
  };

  const hiddenCard = { suit: 'hidden', rank: 'hidden' };
  const hiddenHand = [hiddenCard, hiddenCard];

  for (let i = 1; i <= table.maxPlayers; i++) {
    const seat = table.seats[i];
    if (!seat) {
      tableCopy.seats[i] = null;
      continue;
    }
    let hand = seat.hand.slice();
    if (
      hand.length > 0 &&
      seat.player.socketId !== socketId &&
      !(seat.lastAction === WINNER && table.wentToShowdown)
    ) {
      hand = hiddenHand;
    }
    tableCopy.seats[i] = {
      id: seat.id,
      buyin: seat.buyin,
      stack: seat.stack,
      bet: seat.bet,
      committed: seat.committed,
      hand,
      turn: seat.turn,
      checked: seat.checked,
      folded: seat.folded,
      lastAction: seat.lastAction,
      sittingOut: seat.sittingOut,
      player: {
        id: seat.player.id,
        name: seat.player.name,
        socketId: seat.player.socketId,
        isBot: !!seat.player.isBot,
      },
    };
  }
  return tableCopy;
}

function updatePlayerBankroll(player, amount) {
  if (!player || player.isBot) return;
  player.bankroll += amount;
  if (ioRef) {
    ioRef.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  }
}

function removeFromAllTables(socketId) {
  for (const table of Object.values(manager.tables)) {
    const seat =
      table.gameType === 'blackjack'
        ? null
        : Object.values(table.seats || {}).find(
            (s) => s && s.player && s.player.socketId === socketId,
          );
    if (seat) {
      const lobbyPlayer = players[socketId];
      if (lobbyPlayer) updatePlayerBankroll(lobbyPlayer, seat.stack);
    }
    table.removePlayer(socketId);
  }
  for (const tourney of Object.values(manager.tournaments)) {
    for (const table of Object.values(tourney.tables || {})) {
      table.removePlayer(socketId);
    }
  }
}

function findSeatBySocketId(socketId) {
  for (const table of Object.values(manager.tables)) {
    if (table.gameType === 'blackjack') continue;
    for (const seat of Object.values(table.seats || {})) {
      if (seat && seat.player && seat.player.socketId === socketId) {
        return seat;
      }
    }
  }
  for (const tourney of Object.values(manager.tournaments)) {
    for (const table of Object.values(tourney.tables || {})) {
      for (const seat of Object.values(table.seats || {})) {
        if (seat && seat.player && seat.player.socketId === socketId) {
          return seat;
        }
      }
    }
  }
  return null;
}

const init = (socket, io) => {
  ioRef = io;

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });

  socket.on(CS_LOBBY_CONNECT, ({ gameId, address, userInfo }) => {
    socket.join(gameId);
    io.to(gameId).emit(SC_LOBBY_CONNECTED, { address, userInfo });
  });

  socket.on(CS_LOBBY_DISCONNECT, ({ gameId, address, userInfo }) => {
    io.to(gameId).emit(SC_LOBBY_DISCONNECTED, { address, userInfo });
  });

  socket.on(CS_LOBBY_CHAT, ({ gameId, text, userInfo }) => {
    io.to(gameId).emit(SC_LOBBY_CHAT, { text, userInfo });
  });

  socket.on(CS_FETCH_LOBBY_INFO, ({ walletAddress, socketId, username }) => {
    const found = Object.values(players).find((player) => player.id == walletAddress);
    if (found) {
      delete players[found.socketId];
      removeFromAllTables(found.socketId);
    }

    players[socket.id] = new Player(
      socket.id,
      walletAddress,
      username || 'Player',
      config.INITIAL_CHIPS_AMOUNT,
    );
    emitLobby(socket);
    socket.broadcast.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
    socket.emit(SC_TOURNAMENTS_UPDATED, manager.getLobbyTournaments());
  });

  socket.on(CS_JOIN_TABLE, (tableId) => {
    const table = manager.getTable(tableId);
    const player = players[socket.id];
    if (!table || !player) return;

    manager.joinTable(tableId, player);

    const tableState =
      table.gameType === 'blackjack'
        ? table.publicState(socket.id)
        : hideOpponentCards(table, socket.id);

    socket.emit(SC_TABLE_JOINED, {
      tables: manager.getLobbyTables(),
      tableId,
      gameType: table.gameType || 'holdem',
      table: tableState,
    });
    io.emit(SC_TABLES_UPDATED, manager.getLobbyTables());
    broadcastToTable(table, `${player.name} joined the table.`);
    // Keep an already-running hand moving after someone joins
    manager.resumeHand(table);
  });

  socket.on(CS_LEAVE_TABLE, (tableId) => {
    const table = manager.getTable(tableId);
    const player = players[socket.id];
    if (!table || !player) return;

    manager.leaveTable(tableId, socket.id, (seatPlayer, stack) => {
      updatePlayerBankroll(player, stack);
    });
    socket.emit(SC_TABLE_LEFT, {
      tables: manager.getLobbyTables(),
      tableId,
    });
    io.emit(SC_TABLES_UPDATED, manager.getLobbyTables());
    broadcastToTable(table, `${player.name} left the table.`);
  });

  socket.on(CS_SIT_DOWN, ({ tableId, seatId, amount }) => {
    const table = manager.getTable(tableId);
    const player = players[socket.id];
    if (!table || !player) return;

    const existing = table.seats[seatId];

    // Taking a bot's seat when the table is full
    if (existing && existing.player && existing.player.isBot) {
      const buyin =
        table.gameType === 'blackjack' ? 0 : Number(amount);
      if (table.gameType !== 'blackjack') {
        if (!(buyin > 0) || buyin > player.bankroll) return;
      }
      const result = manager.takeBotSeat(tableId, player, seatId, buyin);
      if (!result.ok) return;
      if (table.gameType !== 'blackjack') {
        updatePlayerBankroll(player, -buyin);
      }
      broadcastToTable(table, result.message);
      io.emit(SC_TABLES_UPDATED, manager.getLobbyTables());
      if (table.gameType !== 'blackjack') {
        if (table.handOver && table.activePlayers().length >= 2) {
          manager.initNewHand(table);
        } else if (!table.handOver) {
          manager.resumeHand(table);
        }
      }
      return;
    }

    if (existing) return; // occupied by a human

    if (table.gameType === 'blackjack') {
      if (!table.sitPlayer(player, seatId)) return;
      broadcastToTable(table, `${player.name} sat down in Seat ${seatId}`);
      io.emit(SC_TABLES_UPDATED, manager.getLobbyTables());
      return;
    }

    const buyin = Number(amount);
    if (!table.sitPlayer(player, seatId, buyin)) return;
    updatePlayerBankroll(player, -buyin);

    // Mid-hand sitters wait for the next deal (Seat starts folded=true)
    const waiting = !table.handOver;
    const msg = waiting
      ? `${player.name} sat down in Seat ${seatId} (waits for next hand)`
      : `${player.name} sat down in Seat ${seatId}`;
    broadcastToTable(table, msg);
    io.emit(SC_TABLES_UPDATED, manager.getLobbyTables());

    if (table.handOver && table.activePlayers().length >= 2) {
      manager.initNewHand(table);
    } else if (!table.handOver) {
      manager.resumeHand(table);
    }
  });

  socket.on(CS_REBUY, ({ tableId, seatId, amount }) => {
    const table = manager.getTable(tableId);
    const player = players[socket.id];
    if (!table || !player || table.gameType === 'blackjack') return;
    try {
      const seat = table.seats[seatId];
      if (!seat || seat.player.socketId !== socket.id) return;
      const amt = Number(amount);
      if (amt <= 0 || amt > player.bankroll) return;
      table.rebuyPlayer(seatId, amt, player);
      updatePlayerBankroll(player, -amt);
      broadcastToTable(table);
    } catch (e) {
      // ignore invalid rebuy
    }
  });

  socket.on(CS_STAND_UP, (tableId) => {
    const table = manager.getTable(tableId);
    const player = players[socket.id];
    if (!table || !player) return;

    if (table.gameType === 'blackjack') {
      table.removePlayer(socket.id);
      table.addPlayer(player);
      broadcastToTable(table, `${player.name} stood up`);
      return;
    }

    const seat = Object.values(table.seats).find(
      (s) => s && s.player.socketId === socket.id,
    );
    if (seat) updatePlayerBankroll(player, seat.stack);
    table.standPlayer(socket.id);
    broadcastToTable(table, `${player.name} stood up`);
    if (table.activePlayers().length === 1) {
      setTimeout(() => {
        table.clearSeatHands();
        table.resetBoardAndPot();
        broadcastToTable(table, 'Waiting for more players');
      }, 2000);
    } else if (!table.handOver && table.activePlayers().length >= 2) {
      manager.resumeHand(table);
    } else if (table.handOver && table.activePlayers().length >= 2) {
      manager.initNewHand(table);
    }
  });

  socket.on(SITTING_OUT, ({ tableId, seatId }) => {
    const table = manager.getTable(tableId);
    if (!table || !table.seats[seatId]) return;
    if (table.seats[seatId].player.socketId !== socket.id) return;
    table.seats[seatId].sittingOut = true;
    broadcastToTable(table);
  });

  socket.on(SITTING_IN, ({ tableId, seatId }) => {
    const table = manager.getTable(tableId);
    if (!table || !table.seats[seatId]) return;
    if (table.seats[seatId].player.socketId !== socket.id) return;
    table.seats[seatId].sittingOut = false;
    broadcastToTable(table);
    if (table.handOver && table.activePlayers().length >= 2) {
      manager.initNewHand(table);
    }
  });

  socket.on(CS_FOLD, (tableId) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType === 'blackjack') return;
    const res = table.handleFold(socket.id);
    if (res) manager.changeTurn(table, res.seatId, res.message);
  });

  socket.on(CS_CHECK, (tableId) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType === 'blackjack') return;
    const res = table.handleCheck(socket.id);
    if (res) manager.changeTurn(table, res.seatId, res.message);
  });

  socket.on(CS_CALL, (tableId) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType === 'blackjack') return;
    const res = table.handleCall(socket.id);
    if (res) manager.changeTurn(table, res.seatId, res.message);
  });

  socket.on(CS_RAISE, ({ tableId, amount }) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType === 'blackjack') return;
    const res = table.handleRaise(socket.id, amount);
    if (res) manager.changeTurn(table, res.seatId, res.message);
  });

  socket.on(TABLE_MESSAGE, ({ message, from, tableId }) => {
    const table = manager.getTable(tableId);
    if (table) broadcastToTable(table, message, from);
  });

  socket.on(CS_FILL_BOTS, ({ tableId, count }) => {
    // omit count → fill all seats allowed (all empty if human seated)
    manager.fillWithBots(tableId, count);
    const table = manager.getTable(tableId);
    if (table) broadcastToTable(table, 'Bots joined the table');
    io.emit(SC_TABLES_UPDATED, manager.getLobbyTables());
  });

  socket.on(CS_FILL_TOURNAMENT_BOTS, ({ tournamentId, count }) => {
    manager.fillTournamentWithBots(tournamentId, count || 3);
    io.emit(SC_TOURNAMENTS_UPDATED, manager.getLobbyTournaments());
    const tourney = manager.tournaments[tournamentId];
    if (tourney && tourney.status === 'running') {
      io.emit(SC_TOURNAMENT_STARTED, tourney.lobbyInfo());
      Object.values(tourney.tables).forEach((t) => {
        broadcastToTable(t, 'Tournament started');
        manager.scheduleTurnTimer(t);
        manager.scheduleBotAction(t);
      });
    }
  });

  socket.on(CS_REGISTER_TOURNAMENT, (tournamentId) => {
    const player = players[socket.id];
    const tourney = manager.tournaments[tournamentId];
    if (!player || !tourney) return;
    const result = tourney.register(player);
    socket.emit(SC_TOURNAMENT_UPDATED, tourney.lobbyInfo());
    io.emit(SC_TOURNAMENTS_UPDATED, manager.getLobbyTournaments());
    if (result.ok && tourney.status === 'running') {
      io.emit(SC_TOURNAMENT_STARTED, tourney.lobbyInfo());
      Object.values(tourney.tables).forEach((t) => {
        broadcastToTable(t, 'Tournament started');
        manager.scheduleTurnTimer(t);
        manager.scheduleBotAction(t);
      });
    }
  });

  socket.on(CS_START_TOURNAMENT, (tournamentId) => {
    const tourney = manager.tournaments[tournamentId];
    if (!tourney) return;
    if (tourney.start()) {
      io.emit(SC_TOURNAMENT_STARTED, tourney.lobbyInfo());
      io.emit(SC_TOURNAMENTS_UPDATED, manager.getLobbyTournaments());
      Object.values(tourney.tables).forEach((t) => {
        broadcastToTable(t, 'Tournament hand starting');
        manager.scheduleTurnTimer(t);
        manager.scheduleBotAction(t);
      });
    }
  });

  // Blackjack
  socket.on(CS_BJ_BET, ({ tableId, amount }) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType !== 'blackjack') return;
    const res = table.placeBet(socket.id, amount);
    if (res) manager.afterAction(table, res.message);
  });

  socket.on(CS_BJ_DEAL, (tableId) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType !== 'blackjack') return;
    // bots auto-bet
    for (const seat of table.activeSeats()) {
      if (seat.player.isBot && seat.bet === 0 && seat.player.bankroll >= table.minBet) {
        table.placeBet(seat.player.socketId, table.minBet);
      }
    }
    if (table.tryStartRound()) {
      manager.afterAction(table, 'Cards dealt');
    }
  });

  socket.on(CS_BJ_HIT, (tableId) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType !== 'blackjack') return;
    const res = table.hit(socket.id);
    if (res) manager.afterAction(table, res.message);
  });

  socket.on(CS_BJ_STAND, (tableId) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType !== 'blackjack') return;
    const res = table.stand(socket.id);
    if (res) manager.afterAction(table, res.message);
  });

  socket.on(CS_BJ_DOUBLE, (tableId) => {
    const table = manager.getTable(tableId);
    if (!table || table.gameType !== 'blackjack') return;
    const res = table.double(socket.id);
    if (res) manager.afterAction(table, res.message);
  });

  // After on-chain deposit tx succeeds, credit in-game bankroll
  socket.on(CS_PROTO_DEPOSIT, ({ amountProto, txHash }) => {
    const player = players[socket.id];
    if (!player) return;
    const chips = protoToChips(amountProto);
    if (!chips || chips <= 0) return;
    player.bankroll += chips;
    socket.emit(SC_PROTO_BANKROLL, {
      bankroll: player.bankroll,
      amountProto: Number(amountProto),
      txHash: txHash || null,
      action: 'deposit',
    });
    io.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  });

  // Debit bankroll before/after on-chain withdrawPlayCredits
  socket.on(CS_PROTO_WITHDRAW, ({ amountProto, txHash }) => {
    const player = players[socket.id];
    if (!player) return;
    const chips = protoToChips(amountProto);
    if (!chips || chips <= 0) return;
    if (player.bankroll < chips) {
      socket.emit(SC_PROTO_BANKROLL, {
        bankroll: player.bankroll,
        error: 'Insufficient bankroll',
        action: 'withdraw',
      });
      return;
    }
    // Ensure player is not seated with chips in play
    const seated = findSeatBySocketId(socket.id);
    if (seated) {
      socket.emit(SC_PROTO_BANKROLL, {
        bankroll: player.bankroll,
        error: 'Stand up before withdrawing',
        action: 'withdraw',
      });
      return;
    }
    player.bankroll -= chips;
    socket.emit(SC_PROTO_BANKROLL, {
      bankroll: player.bankroll,
      amountProto: Number(amountProto),
      txHash: txHash || null,
      action: 'withdraw',
    });
    io.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  });

  socket.on(CS_DISCONNECT, () => handleDisconnect(socket));

  function handleDisconnect(sock) {
    const player = players[sock.id];
    if (player) {
      removeFromAllTables(sock.id);
      delete players[sock.id];
      sock.broadcast.emit(SC_TABLES_UPDATED, manager.getLobbyTables());
      sock.broadcast.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
    }
  }
};

module.exports = { init, manager };
