import React, { useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import {
  buyProto,
  depositProto,
  withdrawProto,
  stakeProto,
  unstakeProto,
  swapProto,
  swapProtoToUsdc,
  swapUsdcToProto,
  swapProtoToUsdt,
  swapUsdtToProto,
  mintMockUsdc,
  mintMockUsdt,
  claimReward,
  readBalances,
  contractsConfigured,
  CHIPS_PER_PROTO,
  addresses,
} from '../contracts/proto'
import {
  CS_PROTO_DEPOSIT,
  CS_PROTO_WITHDRAW,
  SC_PROTO_BANKROLL,
} from '../game/actions'
import { showVerseAlert } from '../utils/verseAlert'
import styled, { keyframes, createGlobalStyle } from 'styled-components'
import universeBg from '../assets/img/proto-universe-bg.png'
import protofireLogo from '../assets/img/protofire-logo.svg'
import PokerChip from '../components/icons/PokerChip'

const isGuestWallet = (address) =>
  typeof address === 'string' && address.toLowerCase().startsWith('0xguest')

const Profile = () => {
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
  const { walletAddress, chipsAmount, setChipsAmount, userName } =
    useContext(globalContext)
  const [amount, setAmount] = useState('1')
  const [busy, setBusy] = useState(false)
  const [balances, setBalances] = useState(null)
  const [status, setStatus] = useState('')
  const isGuest = isGuestWallet(walletAddress)

  useEffect(() => {
    if (!socket) {
      navigate('/')
      return undefined
    }
    if (!walletAddress || isGuest) {
      navigate('/lobby', { replace: true })
    }
  }, [socket, navigate, walletAddress, isGuest])

  useEffect(() => {
    if (!socket) return undefined
    const onBankroll = (payload) => {
      if (payload.error) {
        setStatus(payload.error)
        return
      }
      if (payload.bankroll != null && setChipsAmount) {
        setChipsAmount(payload.bankroll)
      }
      setStatus(
        payload.action === 'deposit'
          ? `Deposited ${payload.amountProto} PROTO → chips`
          : `Withdrew ${payload.amountProto} PROTO from chips`,
      )
    }
    socket.on(SC_PROTO_BANKROLL, onBankroll)
    return () => socket.off(SC_PROTO_BANKROLL, onBankroll)
  }, [socket, setChipsAmount])

  useEffect(() => {
    if (walletAddress && contractsConfigured() && !isGuest) {
      refreshBalances()
    }
    // eslint-disable-next-line
  }, [walletAddress])

  const refreshBalances = async () => {
    try {
      if (!walletAddress || !contractsConfigured() || isGuest) return
      const b = await readBalances(walletAddress)
      setBalances(b)
    } catch (e) {
      setStatus(e.message || 'Could not read balances')
    }
  }

  const run = async (fn, label) => {
    setBusy(true)
    setStatus(`${label}…`)
    try {
      const receipt = await fn()
      setStatus(`${label} confirmed`)
      await refreshBalances()
      return receipt
    } catch (e) {
      console.error(e)
      setStatus(e.message || `${label} failed`)
      showVerseAlert('Finance', e.message || `${label} failed`, 'error')
      return null
    } finally {
      setBusy(false)
    }
  }

  const onBuy = () => run(() => buyProto(amount), 'Buy PROTO')
  const onDeposit = async () => {
    const receipt = await run(() => depositProto(amount), 'Deposit PROTO')
    if (receipt && socket) {
      socket.emit(CS_PROTO_DEPOSIT, {
        amountProto: Number(amount),
        txHash: receipt.transactionHash,
      })
    }
  }
  const onWithdraw = async () => {
    if (!socket) return
    socket.emit(CS_PROTO_WITHDRAW, { amountProto: Number(amount) })
    await run(() => withdrawProto(amount), 'Withdraw PROTO')
  }
  const onStake = () => run(() => stakeProto(amount), 'Stake PROTO')
  const onUnstake = () => run(() => unstakeProto(amount), 'Unstake PROTO')
  const onSwapNative = () => run(() => swapProto(amount), 'Swap PROTO→native')
  const onSwapToUsdc = () => run(() => swapProtoToUsdc(amount), 'Swap PROTO→USDC')
  const onSwapFromUsdc = () => run(() => swapUsdcToProto(amount), 'Swap USDC→PROTO')
  const onSwapToUsdt = () => run(() => swapProtoToUsdt(amount), 'Swap PROTO→USDT')
  const onSwapFromUsdt = () => run(() => swapUsdtToProto(amount), 'Swap USDT→PROTO')
  const onMintUsdc = () => run(() => mintMockUsdc(amount), 'Mint mock USDC')
  const onMintUsdt = () => run(() => mintMockUsdt(amount), 'Mint mock USDT')
  const onClaim = () => run(() => claimReward(amount), 'Claim reward')

  if (!walletAddress || isGuest) {
    return null
  }

  return (
    <Page>
      <SwalTheme />
      <Backdrop aria-hidden="true" />
      <Overlay aria-hidden="true" />

      <Shell>
        <TopBar>
          <Brand to="/">
            <img src={protofireLogo} alt="Protofire" />
            <BrandText>
              Proto<span>Verse</span>
            </BrandText>
          </Brand>
          <NavLinks>
            <NavLink to="/lobby">Lobby</NavLink>
          </NavLinks>
          <PlayerMeta>
            <ChipBalance title="Chips">
              <ChipIconWrap aria-hidden="true">
                <PokerChip width="22" height="22" />
              </ChipIconWrap>
              <MetaValue>
                {new Intl.NumberFormat().format(chipsAmount || 0)}
              </MetaValue>
            </ChipBalance>
          </PlayerMeta>
        </TopBar>

        <Panel>
          <PanelTitle>Profile</PanelTitle>
          <ProfileRow>
            <MetaChip>
              <MetaLabel>Player</MetaLabel>
              <MetaValue>{userName || 'Player'}</MetaValue>
            </MetaChip>
            <MetaChip>
              <MetaLabel>Wallet</MetaLabel>
              <MetaValue>
                {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
              </MetaValue>
            </MetaChip>
          </ProfileRow>
        </Panel>

        <Panel style={{ marginTop: '1rem' }}>
          <PanelTitle as="h2">Finance</PanelTitle>
          <PanelSub>
            1 PROTO = {CHIPS_PER_PROTO} chips · Shop uses PROTO · Tables use
            chips
          </PanelSub>

          {!contractsConfigured() ? (
            <Hint>
              Contracts not deployed yet. Run <code>npx hardhat node</code> and{' '}
              <code>npm run deploy:local</code>
            </Hint>
          ) : (
            <>
              <Hint>
                Token {addresses.ProtoToken?.slice(0, 10)}… · Treasury{' '}
                {addresses.ProtoTreasury?.slice(0, 10)}…
                {addresses.USDC
                  ? ` · USDC ${addresses.USDC.slice(0, 10)}…`
                  : ''}
                {addresses.USDT
                  ? ` · USDT ${addresses.USDT.slice(0, 10)}…`
                  : ''}
              </Hint>

              {balances && (
                <BalanceGrid>
                  <BalanceItem>
                    <MetaLabel>Wallet PROTO</MetaLabel>
                    <MetaValue>
                      {Number(balances.walletProto).toFixed(4)}
                    </MetaValue>
                  </BalanceItem>
                  <BalanceItem>
                    <MetaLabel>Escrow</MetaLabel>
                    <MetaValue>
                      {Number(balances.playCreditsProto).toFixed(4)}
                    </MetaValue>
                  </BalanceItem>
                  <BalanceItem>
                    <MetaLabel>Staked</MetaLabel>
                    <MetaValue>
                      {Number(balances.stakedProto).toFixed(4)}
                    </MetaValue>
                  </BalanceItem>
                  <BalanceItem>
                    <MetaLabel>USDC / USDT</MetaLabel>
                    <MetaValue>
                      {Number(balances.walletUsdc).toFixed(2)} /{' '}
                      {Number(balances.walletUsdt).toFixed(2)}
                    </MetaValue>
                  </BalanceItem>
                </BalanceGrid>
              )}

              <ActionRow>
                <AmountInput
                  type="number"
                  min="0.01"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Amount"
                />
                <PrimaryBtn type="button" disabled={busy} onClick={onBuy}>
                  Buy (POL)
                </PrimaryBtn>
                <GhostBtn type="button" disabled={busy} onClick={onDeposit}>
                  Deposit → Chips
                </GhostBtn>
                <GhostBtn type="button" disabled={busy} onClick={onWithdraw}>
                  Withdraw
                </GhostBtn>
                <GhostBtn type="button" disabled={busy} onClick={onStake}>
                  Stake
                </GhostBtn>
                <GhostBtn type="button" disabled={busy} onClick={onUnstake}>
                  Unstake
                </GhostBtn>
              </ActionRow>
              <ActionRow>
                <PrimaryBtn
                  type="button"
                  disabled={busy}
                  onClick={onSwapFromUsdc}
                >
                  USDC→PROTO
                </PrimaryBtn>
                <PrimaryBtn type="button" disabled={busy} onClick={onSwapToUsdc}>
                  PROTO→USDC
                </PrimaryBtn>
                <PrimaryBtn
                  type="button"
                  disabled={busy}
                  onClick={onSwapFromUsdt}
                >
                  USDT→PROTO
                </PrimaryBtn>
                <PrimaryBtn type="button" disabled={busy} onClick={onSwapToUsdt}>
                  PROTO→USDT
                </PrimaryBtn>
                <GhostBtn type="button" disabled={busy} onClick={onSwapNative}>
                  PROTO→POL
                </GhostBtn>
              </ActionRow>
              <ActionRow>
                <GhostBtn type="button" disabled={busy} onClick={onMintUsdc}>
                  Faucet USDC
                </GhostBtn>
                <GhostBtn type="button" disabled={busy} onClick={onMintUsdt}>
                  Faucet USDT
                </GhostBtn>
                <GhostBtn type="button" disabled={busy} onClick={onClaim}>
                  Claim
                </GhostBtn>
                <GhostBtn type="button" disabled={busy} onClick={refreshBalances}>
                  Refresh
                </GhostBtn>
              </ActionRow>
            </>
          )}

          {status && (
            <StatusLine $error={/fail|error|could not/i.test(status)}>
              {status}
            </StatusLine>
          )}
        </Panel>
      </Shell>
    </Page>
  )
}

const drift = keyframes`
  0% { transform: scale(1.06) translate3d(0, 0, 0); }
  50% { transform: scale(1.12) translate3d(-1.5%, -0.8%, 0); }
  100% { transform: scale(1.06) translate3d(0, 0, 0); }
`

const SwalTheme = createGlobalStyle`
  .proto-swal-popup {
    border: 1px solid rgba(128, 234, 255, 0.35) !important;
    border-radius: 0 !important;
    font-family: 'Chakra Petch', 'Segoe UI', sans-serif !important;
  }
  .proto-swal-title {
    color: #f4f0ff !important;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .proto-swal-text { color: rgba(220, 210, 245, 0.88) !important; }
  .proto-swal-confirm {
    border: 1px solid rgba(128, 234, 255, 0.65) !important;
    background: linear-gradient(
      135deg,
      rgba(255, 110, 199, 0.55),
      rgba(88, 40, 160, 0.9),
      rgba(20, 70, 140, 0.95)
    ) !important;
    text-transform: uppercase;
    font-weight: 600 !important;
  }
`

const Page = styled.div`
  --ink: #f4f0ff;
  --muted: rgba(220, 210, 245, 0.78);
  --line: rgba(128, 234, 255, 0.28);
  --pink: #ff6ec7;
  --cyan: #80eaff;
  --panel: rgba(12, 6, 28, 0.72);

  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--ink);
  font-family: 'Chakra Petch', 'Segoe UI', sans-serif;
  overflow-x: hidden;
`

const Backdrop = styled.div`
  position: fixed;
  inset: -6%;
  z-index: 0;
  background:
    url(${universeBg}) center 40% / cover no-repeat,
    #05010f;
  animation: ${drift} 40s ease-in-out infinite;
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    180deg,
    rgba(4, 1, 14, 0.82) 0%,
    rgba(4, 1, 14, 0.62) 40%,
    rgba(4, 1, 14, 0.9) 100%
  );
  pointer-events: none;
`

const Shell = styled.div`
  position: relative;
  z-index: 1;
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.25rem 0 3.5rem;
`

const TopBar = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0 1.25rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 1.25rem;
`

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none !important;
  color: inherit !important;

  img {
    width: 108px;
    height: auto;
    display: block;
  }
`

const BrandText = styled.span`
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  span {
    color: var(--pink);
  }
`

const NavLinks = styled.nav`
  display: flex;
  gap: 0.75rem;
`

const NavLink = styled(Link)`
  color: ${(p) => (p.$active ? '#fff' : 'var(--muted)')} !important;
  text-decoration: none !important;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.85rem;
  padding-bottom: 0.2rem;
  border-bottom: 2px solid
    ${(p) => (p.$active ? 'var(--cyan)' : 'transparent')};

  &:hover {
    color: #fff !important;
  }
`

const PlayerMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
`

const MetaChip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(128, 234, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
  min-width: 96px;
`

const ChipBalance = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid rgba(128, 234, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);
`

const ChipIconWrap = styled.span`
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex-shrink: 0;

  svg {
    width: 22px;
    height: 22px;
  }

  path {
    fill: #80eaff;
  }
`

const MetaLabel = styled.span`
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
`

const MetaValue = styled.span`
  font-size: 0.92rem;
  font-weight: 600;
  color: #fff;
`

const Panel = styled.section`
  border: 1px solid var(--line);
  background: var(--panel);
  backdrop-filter: blur(10px);
  padding: 1.25rem 1.2rem 1.4rem;
`

const PanelTitle = styled.h1`
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const ProfileRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.85rem;
`

const PanelSub = styled.p`
  margin: 0.4rem 0 1rem;
  color: var(--muted);
  font-size: 0.9rem;
`

const Hint = styled.p`
  margin: 0.35rem 0;
  color: var(--muted);
  font-size: 0.9rem;

  code {
    color: var(--cyan);
    font-size: 0.85em;
  }
`

const BalanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.55rem;
  margin: 0.85rem 0 0.35rem;
`

const BalanceItem = styled.div`
  padding: 0.55rem 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.75rem;
`

const AmountInput = styled.input`
  width: 110px;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.35);
  color: var(--ink);
  font: inherit;
`

const btnBase = `
  appearance: none;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.55rem 0.85rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const PrimaryBtn = styled.button`
  ${btnBase}
  border: 1px solid rgba(128, 234, 255, 0.7);
  color: #f8f4ff;
  background: linear-gradient(
    135deg,
    rgba(255, 110, 199, 0.5),
    rgba(88, 40, 160, 0.85),
    rgba(20, 70, 140, 0.9)
  );
`

const GhostBtn = styled.button`
  ${btnBase}
  border: 1px solid rgba(128, 234, 255, 0.28);
  color: var(--ink);
  background: rgba(255, 255, 255, 0.04);

  &:hover:not(:disabled) {
    border-color: var(--cyan);
  }
`

const StatusLine = styled.p`
  margin: 0.85rem 0 0;
  padding: 0.65rem 0.85rem;
  border: 1px solid
    ${(p) =>
      p.$error ? 'rgba(255, 110, 199, 0.55)' : 'rgba(128, 234, 255, 0.4)'};
  background: ${(p) =>
    p.$error ? 'rgba(255, 110, 199, 0.12)' : 'rgba(128, 234, 255, 0.1)'};
  color: ${(p) => (p.$error ? '#ffb3e0' : 'var(--cyan)')};
  font-size: 0.88rem;
`

export default Profile
