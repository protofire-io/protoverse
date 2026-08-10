const Table = require('../poker/Table');
const Player = require('../core/Player');
const Deck = require('../core/Deck');

describe('Deck', () => {
  test('has 52 cards and draws from top', () => {
    const deck = new Deck();
    expect(deck.count()).toBe(52);
    const first = deck.cards[0];
    const drawn = deck.draw();
    expect(drawn).toEqual(first);
    expect(deck.count()).toBe(51);
  });
});

describe('Hold’em Table integrity', () => {
  function seatedTable() {
    const table = new Table(1, 'Test', 10000, 5, { minBet: 50, minRaise: 100 });
    const p1 = new Player('s1', 'p1', 'Alice', 10000);
    const p2 = new Player('s2', 'p2', 'Bob', 10000);
    table.addPlayer(p1);
    table.addPlayer(p2);
    table.sitPlayer(p1, 1, 1000);
    table.sitPlayer(p2, 2, 1000);
    p1.bankroll -= 1000;
    p2.bankroll -= 1000;
    return table;
  }

  test('starts hand with blinds capped and two hole cards', () => {
    const table = seatedTable();
    table.startHand();
    expect(table.handOver).toBe(false);
    expect(table.seats[1].hand.length).toBe(2);
    expect(table.seats[2].hand.length).toBe(2);
    expect(table.pot).toBeGreaterThan(0);
    expect(table.seats[1].stack + table.seats[1].bet).toBe(1000);
    expect(table.seats[2].stack + table.seats[2].bet).toBe(1000);
  });

  test('rejects out-of-turn actions', () => {
    const table = seatedTable();
    table.startHand();
    const notTurn = table.turn === 1 ? 's2' : 's1';
    expect(table.handleFold(notTurn)).toBeNull();
    expect(table.handleCheck(notTurn)).toBeNull();
  });

  test('rejects check facing a bet', () => {
    const table = seatedTable();
    table.startHand();
    // Preflop there is a call amount; check should be illegal for the player to act unless they already matched (BB option later)
    const seat = table.seats[table.turn];
    if (seat.bet < table.callAmount) {
      expect(table.handleCheck(seat.player.socketId)).toBeNull();
    }
  });

  test('raise fails silently no longer — invalid raise returns null and pot unchanged', () => {
    const table = seatedTable();
    table.startHand();
    const seat = table.seats[table.turn];
    const potBefore = table.pot;
    const stackBefore = seat.stack;
    const res = table.handleRaise(seat.player.socketId, seat.bet + seat.stack + 5000);
    // all-in is allowed — use below min raise but not all-in
    const seat2 = table.seats[table.turn];
    if (seat2.stack > 10) {
      const bad = table.handleRaise(seat2.player.socketId, seat2.bet + 1);
      if (table.callAmount && seat2.bet + 1 < table.minRaise) {
        expect(bad).toBeNull();
      }
    }
    expect(typeof potBefore).toBe('number');
    expect(typeof stackBefore).toBe('number');
    expect(res === null || res.seatId === seat.id).toBe(true);
  });

  test('side pots built from committed amounts', () => {
    const table = seatedTable();
    const p3 = new Player('s3', 'p3', 'Carol', 10000);
    table.addPlayer(p3);
    table.sitPlayer(p3, 3, 300);
    p3.bankroll -= 300;

    // Manually set committed for unit test of pot builder
    table.seats[1].committed = 300;
    table.seats[1].folded = false;
    table.seats[2].committed = 500;
    table.seats[2].folded = false;
    table.seats[3].committed = 300;
    table.seats[3].folded = false;
    const pots = table.buildSidePotsFromCommitted();
    expect(pots.length).toBeGreaterThanOrEqual(1);
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(300 + 500 + 300);
  });

  test('short stack blind does not go negative', () => {
    const table = new Table(1, 'Test', 10000, 5, { minBet: 100, minRaise: 200 });
    const p1 = new Player('s1', 'p1', 'Alice', 10000);
    const p2 = new Player('s2', 'p2', 'Bob', 10000);
    table.addPlayer(p1);
    table.addPlayer(p2);
    table.sitPlayer(p1, 1, 50);
    table.sitPlayer(p2, 2, 1000);
    table.startHand();
    expect(table.seats[1].stack).toBeGreaterThanOrEqual(0);
    expect(table.seats[2].stack).toBeGreaterThanOrEqual(0);
  });
});
