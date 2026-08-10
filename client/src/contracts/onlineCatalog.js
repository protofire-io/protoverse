import onlineHoldem from '../assets/online/online-holdem.jpg'
import onlineSng from '../assets/online/online-sng.jpg'
import onlineMtt from '../assets/online/online-mtt.jpg'
import onlineBlackjack from '../assets/online/online-blackjack.jpg'

import roomHoldemMicro from '../assets/online/rooms/holdem-micro.jpg'
import roomHoldemMid from '../assets/online/rooms/holdem-mid.jpg'
import roomHoldemHigh from '../assets/online/rooms/holdem-high.jpg'
import roomBj1 from '../assets/online/rooms/bj-1.jpg'
import roomBj2 from '../assets/online/rooms/bj-2.jpg'
import roomSng from '../assets/online/rooms/sng.jpg'
import roomMtt from '../assets/online/rooms/mtt.jpg'

export const ONLINE_GAMES = [
  {
    id: 'cash',
    label: 'Hold’em',
    blurb: 'Cash tables · blinds & seats',
    image: onlineHoldem,
  },
  {
    id: 'sng',
    label: 'Sit & Go',
    blurb: 'Single-table tournaments',
    image: onlineSng,
  },
  {
    id: 'mtt',
    label: 'MTT',
    blurb: 'Multi-table championships',
    image: onlineMtt,
  },
  {
    id: 'bj',
    label: 'Blackjack',
    blurb: 'Casino tables · min–max bets',
    image: onlineBlackjack,
  },
]

/** Cash / blackjack table id → room cover */
const TABLE_ROOM_IMAGES = {
  1: roomHoldemMicro,
  2: roomHoldemMid,
  3: roomHoldemHigh,
  101: roomBj1,
  102: roomBj2,
}

/** Tournament id → room cover */
const TOURNAMENT_ROOM_IMAGES = {
  1: roomSng,
  2: roomMtt,
}

export function imageForTableRoom(table) {
  if (!table) return onlineHoldem
  if (TABLE_ROOM_IMAGES[table.id]) return TABLE_ROOM_IMAGES[table.id]
  if (table.gameType === 'blackjack') return onlineBlackjack
  return onlineHoldem
}

export function imageForTournamentRoom(tournament) {
  if (!tournament) return onlineSng
  if (TOURNAMENT_ROOM_IMAGES[tournament.id]) {
    return TOURNAMENT_ROOM_IMAGES[tournament.id]
  }
  return tournament.type === 'mtt' ? onlineMtt : onlineSng
}
