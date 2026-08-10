const Hand = require('pokersolver').Hand;

function mapCards(cards) {
  return cards.map((card) => {
    const suit = card.suit.slice(0, 1);
    let rank;
    if (card.rank === '10') rank = 'T';
    else rank = card.rank.length > 1 ? card.rank.slice(0, 1).toUpperCase() : card.rank;
    return rank + suit;
  });
}

function handStrength(hole, board) {
  if (!hole || hole.length < 2) return 0;
  const cards = mapCards(hole.concat(board || []));
  try {
    const solved = Hand.solve(cards);
    // rank is 1 (high card) .. 10 (royal); normalize roughly
    return (solved.rank || 1) / 10;
  } catch (e) {
    return 0.2;
  }
}

/**
 * Simple heuristic poker bot.
 */
function decidePokerAction(table, seat) {
  const legal = table.getLegalActions(seat);
  if (legal.length === 0) return null;

  const strength = handStrength(seat.hand, table.board);
  const pot = table.pot || 0;
  const toCall =
    table.callAmount != null ? Math.max(0, table.callAmount - seat.bet) : 0;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const roll = Math.random();

  if (legal.includes('check') && (strength < 0.45 || roll < 0.5)) {
    return { action: 'check' };
  }

  if (legal.includes('raise') && strength > 0.55 && roll < strength) {
    const minTo = table.minRaise || (table.callAmount || table.minBet) * 2;
    const maxTo = seat.stack + seat.bet;
    const target = Math.min(maxTo, Math.max(minTo, Math.floor(pot * (0.5 + strength))));
    return { action: 'raise', amount: target };
  }

  if (legal.includes('call')) {
    if (strength >= potOdds - 0.05 || toCall <= table.minBet) {
      return { action: 'call' };
    }
    if (strength > 0.7) return { action: 'call' };
    return legal.includes('fold') ? { action: 'fold' } : { action: 'call' };
  }

  if (legal.includes('check')) return { action: 'check' };
  if (legal.includes('fold')) return { action: 'fold' };
  return { action: legal[0] };
}

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

function bjValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += RANK_VALUES[c.rank] || 0;
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function dealerUpValue(dealerHand) {
  if (!dealerHand || !dealerHand[0]) return 10;
  return RANK_VALUES[dealerHand[0].rank] || 10;
}

/**
 * Simplified basic strategy: hit/stand/double.
 */
function decideBlackjackAction(table, seat) {
  const value = bjValue(seat.hand);
  const up = dealerUpValue(table.dealer.hand);
  const canDouble = seat.hand.length === 2 && !seat.doubled && seat.player.bankroll >= seat.bet;

  if (value >= 17) return { action: 'stand' };
  if (value <= 8) return { action: 'hit' };

  if (value === 9 && up >= 3 && up <= 6 && canDouble) return { action: 'double' };
  if (value === 10 && up <= 9 && canDouble) return { action: 'double' };
  if (value === 11 && canDouble) return { action: 'double' };

  if (value === 12 && up >= 4 && up <= 6) return { action: 'stand' };
  if (value >= 13 && value <= 16 && up <= 6) return { action: 'stand' };

  if (value <= 16) return { action: 'hit' };
  return { action: 'stand' };
}

module.exports = {
  decidePokerAction,
  decideBlackjackAction,
  handStrength,
};
