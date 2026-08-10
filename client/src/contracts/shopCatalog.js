import tableImg from '../assets/game/table.webp'
import cardBackImg from '../assets/game/card_back.png'
import universeImg from '../assets/img/proto-universe-bg.png'

import marvelWeblaunch from '../assets/shop/marvel-weblaunch.png'
import marvelSeason from '../assets/shop/marvel-season.png'
import cookingCover from '../assets/shop/cooking-cover.jpg'
import cookingChef from '../assets/shop/cooking-chef.jpg'
import cookingGift from '../assets/shop/cooking-gift.jpg'
import holdemCardBack from '../assets/shop/holdem-card-back.png'
import holdemDealer from '../assets/shop/holdem-dealer.png'
import holdemTable from '../assets/shop/holdem-table.webp'
import bjFelt from '../assets/shop/bj-felt.png'
import bjTray from '../assets/shop/bj-tray.png'
import bjSeat from '../assets/shop/bj-seat.png'
import verseFrame from '../assets/shop/verse-frame.png'
import verseBanner from '../assets/shop/verse-banner.png'
import seekersNotes from '../assets/shop/seekers-notes.jpg'
import chefFriends from '../assets/shop/chef-friends.jpg'
import ravenhill from '../assets/shop/ravenhill.jpg'
import gdapShowcase from '../assets/shop/gdap-showcase.jpg'
import dtiEmb from '../assets/shop/dti-emb.jpg'
import mysteryEnergy from '../assets/shop/mystery-energy.jpg'
import hiddenObjectPass from '../assets/shop/hidden-object-pass.jpg'
import kitchenCrew from '../assets/shop/kitchen-crew.jpg'
import friendsFeast from '../assets/shop/friends-feast.jpg'
import caseFile from '../assets/shop/case-file.jpg'
import detectiveKit from '../assets/shop/detective-kit.jpg'
import manilaIndie from '../assets/shop/manila-indie.jpg'
import studioLaunch from '../assets/shop/studio-launch.jpg'
import exportReady from '../assets/shop/export-ready.jpg'
import globalPayments from '../assets/shop/global-payments.jpg'

/** Official / curated covers for shop UI */
export const PROTO_GAME_IMAGES = {
  marvelSnap: marvelWeblaunch,
  cookingDiary: cookingCover,
  seekersNotes,
  chefFriends,
  ravenhill,
  gdapShowcase,
  dtiEmb,
}

/**
 * Canonical video-game order for the Game Shop UI.
 * On-chain listings include a matching `game` string.
 */
export const SHOP_GAMES = [
  {
    id: 'marvel-snap',
    name: 'MARVEL SNAP',
    blurb: 'Protofire Web Shop partner · Second Dinner',
    image: PROTO_GAME_IMAGES.marvelSnap,
  },
  {
    id: 'cooking-diary',
    name: 'Cooking Diary',
    blurb: 'Protofire Web Shop partner · Mytona',
    image: PROTO_GAME_IMAGES.cookingDiary,
  },
  {
    id: 'seekers-notes',
    name: 'Seekers Notes',
    blurb: 'Hidden-object mystery · Mytona × Protofire',
    image: PROTO_GAME_IMAGES.seekersNotes,
  },
  {
    id: 'chef-friends',
    name: 'Chef & Friends',
    blurb: 'Casual cooking co-op · Mytona',
    image: PROTO_GAME_IMAGES.chefFriends,
  },
  {
    id: 'ravenhill',
    name: 'Ravenhill',
    blurb: 'Mystery adventure · Mytona',
    image: PROTO_GAME_IMAGES.ravenhill,
  },
  {
    id: 'gdap-showcase',
    name: 'GDAP Showcase',
    blurb: 'Philippine indie spotlight · GDAP × Protofire',
    image: PROTO_GAME_IMAGES.gdapShowcase,
  },
  {
    id: 'dti-emb',
    name: 'DTI-EMB Export Hits',
    blurb: 'Export-ready PH titles · DTI-EMB × Protofire',
    image: PROTO_GAME_IMAGES.dtiEmb,
  },
  {
    id: 'holdem',
    name: "Texas Hold'em",
    blurb: 'Card backs, table themes, and dealer cosmetics.',
    image: tableImg,
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    blurb: 'Felt themes, chip trays, and seat accents.',
    image: cardBackImg,
  },
  {
    id: 'metaverse',
    name: 'ProtoVerse',
    blurb: 'Avatar frames and hub cosmetics.',
    image: universeImg,
  },
]

/** Item name → unique local product image */
export const SHOP_ITEM_IMAGES = {
  'WEBLAUNCH Bundle': marvelWeblaunch,
  'Season Pass Boost': marvelSeason,
  'Chef Starter Pack': cookingChef,
  'Daily Gift Chest': cookingGift,
  'Neon Card Back': holdemCardBack,
  'Gold Dealer Button': holdemDealer,
  'VIP Table Theme': holdemTable,
  'Emerald Felt': bjFelt,
  'Chrome Chip Tray': bjTray,
  'High-Roller Seat': bjSeat,
  'Avatar Frame: Ember': verseFrame,
  'Lobby Banner: Neon': verseBanner,
  'Mystery Energy Pack': mysteryEnergy,
  'Hidden Object Pass': hiddenObjectPass,
  'Kitchen Crew Bundle': kitchenCrew,
  'Friends Feast Pack': friendsFeast,
  'Ravenhill Case File': caseFile,
  'Noir Detective Kit': detectiveKit,
  'Manila Indie Bundle': manilaIndie,
  'Studio Launch Pack': studioLaunch,
  'Export Ready Pack': exportReady,
  'Global Payments Kit': globalPayments,
}

export function imageForShopItem(item) {
  if (!item) return null
  return SHOP_ITEM_IMAGES[item.name] || null
}

export function groupListingsByGame(listings = []) {
  const byGame = new Map()

  for (const item of listings) {
    const game = (item.game && String(item.game).trim()) || 'Other'
    const withImage = {
      ...item,
      image: imageForShopItem(item),
    }
    if (!byGame.has(game)) byGame.set(game, [])
    byGame.get(game).push(withImage)
  }

  const ordered = []
  const seen = new Set()

  for (const g of SHOP_GAMES) {
    const items = byGame.get(g.name) || []
    ordered.push({ ...g, items })
    seen.add(g.name)
  }

  for (const [name, items] of byGame.entries()) {
    if (seen.has(name)) continue
    ordered.push({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      blurb: '',
      image: null,
      items,
    })
  }

  return ordered
}
