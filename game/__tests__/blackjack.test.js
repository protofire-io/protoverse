const BlackjackTable = require('../blackjack/BlackjackTable');
const Player = require('../core/Player');

describe('BlackjackTable', () => {
  test('places bet and deals a round', () => {
    const table = new BlackjackTable(101, 'BJ Test', { minBet: 10, maxBet: 100 });
    const p1 = new Player('s1', 'p1', 'Alice', 1000);
    table.addPlayer(p1);
    table.sitPlayer(p1, 1);
    expect(table.placeBet('s1', 10)).toBeTruthy();
    expect(p1.bankroll).toBe(990);
    expect(table.tryStartRound()).toBe(true);
    expect(table.seats[1].hand.length).toBeGreaterThanOrEqual(2);
    expect(table.dealer.hand.length).toBeGreaterThanOrEqual(2);
  });

  test('rejects illegal hit out of turn', () => {
    const table = new BlackjackTable(101, 'BJ Test', { minBet: 10, maxBet: 100 });
    const p1 = new Player('s1', 'p1', 'Alice', 1000);
    table.addPlayer(p1);
    table.sitPlayer(p1, 1);
    expect(table.hit('s1')).toBeNull();
  });
});
