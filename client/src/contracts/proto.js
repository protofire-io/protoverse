import { ethers } from 'ethers'
import abis from './abis.json'
import addresses from './addresses.json'

export const CHIPS_PER_PROTO = 1000
export const USDC_DECIMALS = 6
export const USDT_DECIMALS = 6

export function contractsConfigured() {
  return Boolean(addresses.ProtoToken && addresses.ProtoTreasury)
}

function isHexAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
}

export async function getSigner() {
  if (!window.ethereum) {
    throw new Error('No wallet found. Install MetaMask.')
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' })
  // 'any' avoids ENS lookups on Hardhat / unrecognized local networks
  const provider = new ethers.providers.Web3Provider(window.ethereum, 'any')
  return provider.getSigner()
}

export async function getContracts() {
  if (!contractsConfigured()) {
    throw new Error('PROTO contracts not deployed. Run npm run deploy:local')
  }
  const required = [
    addresses.ProtoToken,
    addresses.ProtoTreasury,
    addresses.USDC,
    addresses.USDT,
    addresses.ProtoShop,
    addresses.ProtoItems,
  ]
  for (const addr of required) {
    if (addr && !isHexAddress(addr)) {
      throw new Error(`Invalid contract address: ${addr}`)
    }
  }
  const signer = await getSigner()
  const token = new ethers.Contract(addresses.ProtoToken, abis.ProtoToken, signer)
  const treasury = new ethers.Contract(
    addresses.ProtoTreasury,
    abis.ProtoTreasury,
    signer,
  )
  const usdcAddress = isHexAddress(addresses.USDC)
    ? addresses.USDC
    : await treasury.usdc()
  const usdtAddress = isHexAddress(addresses.USDT)
    ? addresses.USDT
    : await treasury.usdt()
  const usdc = isHexAddress(usdcAddress)
    ? new ethers.Contract(usdcAddress, abis.USDC, signer)
    : null
  const usdt = isHexAddress(usdtAddress)
    ? new ethers.Contract(usdtAddress, abis.USDT, signer)
    : null
  const shop =
    isHexAddress(addresses.ProtoShop) && abis.ProtoShop
      ? new ethers.Contract(addresses.ProtoShop, abis.ProtoShop, signer)
      : null
  const items =
    isHexAddress(addresses.ProtoItems) && abis.ProtoItems
      ? new ethers.Contract(addresses.ProtoItems, abis.ProtoItems, signer)
      : null
  return {
    token,
    treasury,
    usdc,
    usdt,
    shop,
    items,
    signer,
    addresses,
    usdcAddress,
    usdtAddress,
  }
}

export function protoToChips(protoAmount) {
  return Math.floor(Number(protoAmount) * CHIPS_PER_PROTO)
}

export function chipsToProto(chips) {
  return (Number(chips) / CHIPS_PER_PROTO).toString()
}

export async function buyProto(amountEth) {
  const { treasury } = await getContracts()
  const tx = await treasury.buyProto({
    value: ethers.utils.parseEther(String(amountEth)),
  })
  return tx.wait()
}

export async function depositProto(amountProto) {
  const { token, treasury, addresses } = await getContracts()
  const amount = ethers.utils.parseEther(String(amountProto))
  const approveTx = await token.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.deposit(amount)
  return tx.wait()
}

export async function withdrawProto(amountProto) {
  const { treasury } = await getContracts()
  const amount = ethers.utils.parseEther(String(amountProto))
  const tx = await treasury.withdrawPlayCredits(amount)
  return tx.wait()
}

export async function stakeProto(amountProto) {
  const { token, treasury, addresses } = await getContracts()
  const amount = ethers.utils.parseEther(String(amountProto))
  const approveTx = await token.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.stake(amount)
  return tx.wait()
}

export async function unstakeProto(amountProto) {
  const { treasury } = await getContracts()
  const amount = ethers.utils.parseEther(String(amountProto))
  const tx = await treasury.unstake(amount)
  return tx.wait()
}

export async function swapProto(amountProto) {
  const { token, treasury, addresses } = await getContracts()
  const amount = ethers.utils.parseEther(String(amountProto))
  const approveTx = await token.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.swapProtoForNative(amount)
  return tx.wait()
}

export async function swapProtoToUsdc(amountProto) {
  const { token, treasury, addresses } = await getContracts()
  const amount = ethers.utils.parseEther(String(amountProto))
  const approveTx = await token.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.swapProtoForUsdc(amount)
  return tx.wait()
}

export async function swapUsdcToProto(amountUsdc) {
  const { usdc, treasury, addresses } = await getContracts()
  if (!usdc) throw new Error('USDC not configured')
  const amount = ethers.utils.parseUnits(String(amountUsdc), USDC_DECIMALS)
  const approveTx = await usdc.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.swapUsdcForProto(amount)
  return tx.wait()
}

export async function buyProtoWithUsdc(amountUsdc) {
  const { usdc, treasury, addresses } = await getContracts()
  if (!usdc) throw new Error('USDC not configured')
  const amount = ethers.utils.parseUnits(String(amountUsdc), USDC_DECIMALS)
  const approveTx = await usdc.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.buyProtoWithUsdc(amount)
  return tx.wait()
}

export async function swapProtoToUsdt(amountProto) {
  const { token, treasury, addresses } = await getContracts()
  const amount = ethers.utils.parseEther(String(amountProto))
  const approveTx = await token.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.swapProtoForUsdt(amount)
  return tx.wait()
}

export async function swapUsdtToProto(amountUsdt) {
  const { usdt, treasury, addresses } = await getContracts()
  if (!usdt) throw new Error('USDT not configured')
  const amount = ethers.utils.parseUnits(String(amountUsdt), USDT_DECIMALS)
  const approveTx = await usdt.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.swapUsdtForProto(amount)
  return tx.wait()
}

export async function buyProtoWithUsdt(amountUsdt) {
  const { usdt, treasury, addresses } = await getContracts()
  if (!usdt) throw new Error('USDT not configured')
  const amount = ethers.utils.parseUnits(String(amountUsdt), USDT_DECIMALS)
  const approveTx = await usdt.approve(addresses.ProtoTreasury, amount)
  await approveTx.wait()
  const tx = await treasury.buyProtoWithUsdt(amount)
  return tx.wait()
}

export async function claimReward(amountProto = '1') {
  const { treasury } = await getContracts()
  const tx = await treasury.claimPlayReward(
    ethers.utils.parseEther(String(amountProto)),
  )
  return tx.wait()
}

export async function mintMockUsdc(amountUsdc = '1000') {
  const { usdc, signer } = await getContracts()
  if (!usdc) throw new Error('USDC not configured')
  const address = await signer.getAddress()
  const tx = await usdc.mint(
    address,
    ethers.utils.parseUnits(String(amountUsdc), USDC_DECIMALS),
  )
  return tx.wait()
}

export async function mintMockUsdt(amountUsdt = '1000') {
  const { usdt, signer } = await getContracts()
  if (!usdt) throw new Error('USDT not configured')
  const address = await signer.getAddress()
  const tx = await usdt.mint(
    address,
    ethers.utils.parseUnits(String(amountUsdt), USDT_DECIMALS),
  )
  return tx.wait()
}

/** Fetch active shop listings (PROTO-priced), including parent video game. */
export async function fetchShopListings() {
  const { shop } = await getContracts()
  if (!shop) return []
  const nextId = Number(await shop.nextItemId())
  const listings = []
  for (let id = 1; id < nextId; id++) {
    const listing = await shop.getListing(id)
    const priceProto = listing.priceProto ?? listing[0]
    const active = listing.active ?? listing[1]
    const name = listing.name_ ?? listing.name ?? listing[2]
    const metadataURI = listing.metadataURI ?? listing[3]
    const game = listing.game_ ?? listing.game ?? listing[4] ?? 'Other'
    if (!active) continue
    listings.push({
      id,
      name,
      game,
      metadataURI,
      priceProto: ethers.utils.formatEther(priceProto),
      priceRaw: priceProto,
    })
  }
  return listings
}

/** Buy shop item with PROTO only. */
export async function buyShopItem(itemId, quantity = 1) {
  const { token, shop, addresses } = await getContracts()
  if (!shop) throw new Error('Shop not deployed')
  const listing = await shop.getListing(itemId)
  const priceProto = listing.priceProto ?? listing[0]
  const total = priceProto.mul
    ? priceProto.mul(quantity)
    : priceProto * window.BigInt(quantity)
  const approveTx = await token.approve(addresses.ProtoShop, total)
  await approveTx.wait()
  const tx = await shop.buy(itemId, quantity)
  return tx.wait()
}

/** Owned balances for known shop item ids. */
export async function fetchOwnedItems(userAddress) {
  const { shop, items } = await getContracts()
  if (!shop || !items) return []
  const nextId = Number(await shop.nextItemId())
  const owned = []
  for (let id = 1; id < nextId; id++) {
    const balance = await items.balanceOf(userAddress, id)
    const qty = Number(balance.toString())
    if (qty <= 0) continue
    const listing = await shop.getListing(id)
    owned.push({
      id,
      quantity: qty,
      name: listing.name_ ?? listing.name ?? listing[2],
      game: listing.game_ ?? listing.game ?? listing[4] ?? 'Other',
    })
  }
  return owned
}

export async function readBalances(userAddress) {
  const { token, treasury, usdc, usdt } = await getContracts()
  const [
    wallet,
    credits,
    stakedBal,
    usdcLiq,
    usdtLiq,
    usdcRate,
    usdtRate,
  ] = await Promise.all([
    token.balanceOf(userAddress),
    treasury.playCredits(userAddress),
    treasury.staked(userAddress),
    treasury.usdcLiquidity(),
    treasury.usdtLiquidity(),
    treasury.usdcPerProto(),
    treasury.usdtPerProto(),
  ])
  let walletUsdc = '0'
  let walletUsdt = '0'
  if (usdc) {
    walletUsdc = ethers.utils.formatUnits(
      await usdc.balanceOf(userAddress),
      USDC_DECIMALS,
    )
  }
  if (usdt) {
    walletUsdt = ethers.utils.formatUnits(
      await usdt.balanceOf(userAddress),
      USDT_DECIMALS,
    )
  }
  return {
    walletProto: ethers.utils.formatEther(wallet),
    playCreditsProto: ethers.utils.formatEther(credits),
    stakedProto: ethers.utils.formatEther(stakedBal),
    walletUsdc,
    walletUsdt,
    treasuryUsdc: ethers.utils.formatUnits(usdcLiq, USDC_DECIMALS),
    treasuryUsdt: ethers.utils.formatUnits(usdtLiq, USDT_DECIMALS),
    usdcPerProto: ethers.utils.formatUnits(usdcRate, USDC_DECIMALS),
    usdtPerProto: ethers.utils.formatUnits(usdtRate, USDT_DECIMALS),
  }
}

export { addresses, abis }
