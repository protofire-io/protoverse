import React, { useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import gameContext from '../context/game/gameContext'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import {
  fetchShopListings,
  buyShopItem,
  fetchOwnedItems,
  contractsConfigured,
  addresses,
} from '../contracts/proto'
import { groupListingsByGame } from '../contracts/shopCatalog'
import {
  ONLINE_GAMES,
  imageForTableRoom,
  imageForTournamentRoom,
} from '../contracts/onlineCatalog'
import { CS_FETCH_LOBBY_INFO } from '../game/actions'
import { connectMetamask } from '../utils/interact'
import { showVerseAlert } from '../utils/verseAlert'
import styled, { keyframes, createGlobalStyle } from 'styled-components'
import universeBg from '../assets/img/proto-universe-bg.png'
import protofireLogo from '../assets/img/protofire-logo.svg'
import PokerChip from '../components/icons/PokerChip'
import AcademyPanel from '../components/academy/AcademyPanel'

const isGuestWallet = (address) =>
  typeof address === 'string' && address.toLowerCase().startsWith('0xguest')

const Lobby = () => {
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
  const {
    walletAddress,
    chipsAmount,
    setWalletAddress,
    setUserName,
    userName,
  } = useContext(globalContext)
  const {
    lobbyTables,
    tournaments,
    joinTable,
    fillBots,
    fillTournamentBots,
    registerTournament,
    startTournament,
  } = useContext(gameContext)
  const [mainTab, setMainTab] = useState('shop')
  const [playTab, setPlayTab] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)
  const [shopItems, setShopItems] = useState([])
  const [ownedItems, setOwnedItems] = useState([])
  const [selectedShopGame, setSelectedShopGame] = useState(null)
  const [status, setStatus] = useState('')
  const isGuest = isGuestWallet(walletAddress)

  useEffect(() => {
    if (walletAddress && contractsConfigured()) {
      refreshShop()
    }
    // eslint-disable-next-line
  }, [walletAddress])

  useEffect(() => {
    if (!socket) navigate('/')
  }, [socket, navigate])

  const refreshShop = async () => {
    try {
      if (!contractsConfigured() || !addresses.ProtoShop) {
        setShopItems([])
        setOwnedItems([])
        return
      }
      const listings = await fetchShopListings()
      setShopItems(listings)
      if (walletAddress) {
        const owned = await fetchOwnedItems(walletAddress)
        setOwnedItems(owned)
      }
    } catch (e) {
      setStatus(e.message || 'Could not load shop')
    }
  }

  const onBuyItem = async (itemId) => {
    setBusy(true)
    setStatus(`Buying item #${itemId}…`)
    try {
      await buyShopItem(itemId, 1)
      setStatus('Purchase confirmed')
      await refreshShop()
    } catch (e) {
      console.error(e)
      setStatus(e.message || 'Purchase failed')
      showVerseAlert('Shop', e.message || 'Purchase failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onConnectWallet = async () => {
    if (!socket || loginBusy) return
    setLoginBusy(true)
    try {
      const result = await connectMetamask()
      if (!(result && result.event === 'connected' && result.response)) {
        throw new Error(
          (result && result.response) || 'Wallet connection failed',
        )
      }
      const address = result.response
      const username = `${address.slice(0, 6)}…${address.slice(-4)}`
      setWalletAddress(address)
      setUserName(username)
      socket.emit(CS_FETCH_LOBBY_INFO, {
        walletAddress: address,
        socketId: socket.id,
        gameId: 'local',
        username,
      })
    } catch (e) {
      showVerseAlert('Login', e.message || 'Wallet connection failed', 'error')
    } finally {
      setLoginBusy(false)
    }
  }

  const cashTables = (lobbyTables || []).filter(
    (t) => (t.gameType || 'holdem') === 'holdem',
  )
  const bjTables = (lobbyTables || []).filter((t) => t.gameType === 'blackjack')
  const sng = (tournaments || []).filter((t) => t.type === 'sng')
  const mtt = (tournaments || []).filter((t) => t.type === 'mtt')
  const shopGames = groupListingsByGame(shopItems)
  const activeShopGame =
    selectedShopGame && shopGames.find((g) => g.name === selectedShopGame)

  const renderActions = (children) => <ActionRow>{children}</ActionRow>

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

          <PlayerMeta>
            <ChipBalance title="Chips">
              <ChipIconWrap aria-hidden="true">
                <PokerChip width="22" height="22" />
              </ChipIconWrap>
              <MetaValue>
                {new Intl.NumberFormat().format(chipsAmount || 0)}
              </MetaValue>
            </ChipBalance>
            {isGuest ? (
              <PrimaryBtn
                type="button"
                disabled={loginBusy}
                onClick={onConnectWallet}
              >
                {loginBusy ? 'Connecting…' : 'Connect Wallet'}
              </PrimaryBtn>
            ) : (
              <ProfileLink to="/profile" title="Profile">
                <MetaLabel>Profile</MetaLabel>
                <MetaValue>
                  {userName ||
                    (walletAddress
                      ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
                      : 'Player')}
                </MetaValue>
              </ProfileLink>
            )}
          </PlayerMeta>
        </TopBar>

        <Tabs role="tablist">
          <Tab
            type="button"
            role="tab"
            aria-selected={mainTab === 'shop'}
            $active={mainTab === 'shop'}
            onClick={() => {
              setMainTab('shop')
              setSelectedShopGame(null)
              refreshShop()
            }}
          >
            Game Shop
          </Tab>
          <Tab
            type="button"
            role="tab"
            aria-selected={mainTab === 'play'}
            $active={mainTab === 'play'}
            onClick={() => {
              setMainTab('play')
              setPlayTab(null)
            }}
          >
            Online Games
          </Tab>
          <Tab
            type="button"
            role="tab"
            aria-selected={mainTab === 'academy'}
            $active={mainTab === 'academy'}
            onClick={() => setMainTab('academy')}
          >
            Academy
          </Tab>
        </Tabs>

        {mainTab === 'shop' && (
          <AnimatedPanel key="main-shop">
          <SectionBlock>
            {!addresses.ProtoShop ? (
              <Hint>Shop not deployed. Run npm run deploy:local</Hint>
            ) : (
              <>
                {ownedItems.length > 0 && (
                  <Hint>
                    Owned:{' '}
                    {ownedItems
                      .map(
                        (i) =>
                          `${i.game ? `${i.game} · ` : ''}${i.name} ×${i.quantity}`,
                      )
                      .join(' · ')}
                  </Hint>
                )}

                {!selectedShopGame &&
                  (shopGames.length === 0 ? (
                    <Hint>
                      No shop listings yet. Redeploy with npm run deploy:local
                    </Hint>
                  ) : (
                    <AnimatedPanel key="shop-games">
                      <Grid>
                        {shopGames.map((game) => (
                          <InteractiveCard
                            key={game.id}
                            type="button"
                            onClick={() => setSelectedShopGame(game.name)}
                          >
                            <GameCover>
                              {game.image ? (
                                <img src={game.image} alt="" />
                              ) : (
                                <GameCoverFallback>
                                  {game.name}
                                </GameCoverFallback>
                              )}
                            </GameCover>
                            <CardTitle>{game.name}</CardTitle>
                            {game.blurb && <CardMeta>{game.blurb}</CardMeta>}
                            <CardMeta>{game.items.length} items</CardMeta>
                          </InteractiveCard>
                        ))}
                      </Grid>
                    </AnimatedPanel>
                  ))}

                {selectedShopGame && (
                  <>
                    <Breadcrumb aria-label="Breadcrumb">
                      <CrumbLink
                        type="button"
                        onClick={() => setSelectedShopGame(null)}
                      >
                        All games
                      </CrumbLink>
                      <CrumbSep aria-hidden="true">/</CrumbSep>
                      <CrumbCurrent>{selectedShopGame}</CrumbCurrent>
                    </Breadcrumb>
                    <AnimatedPanel key={`shop-${selectedShopGame}`}>
                      {(activeShopGame ? activeShopGame.items : []).length ===
                      0 ? (
                        <Hint>
                          No on-chain items for this game yet. Run{' '}
                          <code>npm run deploy:local</code> to list packs.
                        </Hint>
                      ) : (
                      <Grid>
                        {(activeShopGame ? activeShopGame.items : []).map(
                          (item) => (
                            <ItemCard key={item.id}>
                              <ItemCover>
                                {item.image ? (
                                  <img src={item.image} alt="" />
                                ) : (
                                  <GameCoverFallback>
                                    {item.name}
                                  </GameCoverFallback>
                                )}
                              </ItemCover>
                              <ItemBody>
                                <CardTitle>{item.name}</CardTitle>
                                <PriceMeta title="PROTO">
                                  <ChipIconWrap aria-hidden="true">
                                    <PokerChip width="18" height="18" />
                                  </ChipIconWrap>
                                  <span>
                                    {new Intl.NumberFormat(undefined, {
                                      maximumFractionDigits: 2,
                                    }).format(Number(item.priceProto))}
                                  </span>
                                </PriceMeta>
                                {renderActions(
                                  <PrimaryBtn
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onBuyItem(item.id)}
                                  >
                                    Buy
                                  </PrimaryBtn>,
                                )}
                              </ItemBody>
                            </ItemCard>
                          ),
                        )}
                      </Grid>
                      )}
                    </AnimatedPanel>
                  </>
                )}
                {status && (
                  <StatusLine $error={/fail|error|could not/i.test(status)}>
                    {status}
                  </StatusLine>
                )}
              </>
            )}
          </SectionBlock>
          </AnimatedPanel>
        )}

        {mainTab === 'play' && (
          <AnimatedPanel key="main-play">
          <SectionBlock>
            {!playTab ? (
              <AnimatedPanel key="play-games">
                <Grid>
                  {ONLINE_GAMES.map((game) => (
                    <InteractiveCard
                      key={game.id}
                      type="button"
                      onClick={() => setPlayTab(game.id)}
                    >
                      <GameCover>
                        <img src={game.image} alt="" />
                      </GameCover>
                      <CardTitle>{game.label}</CardTitle>
                      <CardMeta>{game.blurb}</CardMeta>
                    </InteractiveCard>
                  ))}
                </Grid>
              </AnimatedPanel>
            ) : (
              <>
                <Breadcrumb aria-label="Breadcrumb">
                  <CrumbLink type="button" onClick={() => setPlayTab(null)}>
                    All games
                  </CrumbLink>
                  <CrumbSep aria-hidden="true">/</CrumbSep>
                  <CrumbCurrent>
                    {(ONLINE_GAMES.find((g) => g.id === playTab) || {}).label ||
                      'Tables'}
                  </CrumbCurrent>
                </Breadcrumb>

                <AnimatedPanel key={`play-${playTab}`}>
                {playTab === 'cash' && (
                  <Grid>
                    {cashTables.map((table) => (
                      <ItemCard key={table.id}>
                        <ItemCover>
                          <img src={imageForTableRoom(table)} alt="" />
                        </ItemCover>
                        <ItemBody>
                          <CardTitle>{table.name}</CardTitle>
                          <CardMeta>
                            Blinds {table.smallBlind}/{table.bigBlind}
                          </CardMeta>
                          <CardMeta>
                            Seats {table.currentNumberPlayers}/
                            {table.maxPlayers}
                          </CardMeta>
                          {renderActions(
                            <>
                              <PrimaryBtn
                                type="button"
                                onClick={() => joinTable(table.id)}
                              >
                                Join
                              </PrimaryBtn>
                              <GhostBtn
                                type="button"
                                onClick={() => fillBots(table.id)}
                              >
                                Fill bots
                              </GhostBtn>
                            </>,
                          )}
                        </ItemBody>
                      </ItemCard>
                    ))}
                  </Grid>
                )}

                {playTab === 'bj' && (
                  <Grid>
                    {bjTables.map((table) => (
                      <ItemCard key={table.id}>
                        <ItemCover>
                          <img src={imageForTableRoom(table)} alt="" />
                        </ItemCover>
                        <ItemBody>
                          <CardTitle>{table.name}</CardTitle>
                          <CardMeta>
                            Bets {table.minBet}–{table.maxBet}
                          </CardMeta>
                          <CardMeta>
                            Seats {table.currentNumberPlayers}/
                            {table.maxPlayers}
                          </CardMeta>
                          {renderActions(
                            <>
                              <PrimaryBtn
                                type="button"
                                onClick={() => joinTable(table.id)}
                              >
                                Join
                              </PrimaryBtn>
                              <GhostBtn
                                type="button"
                                onClick={() => fillBots(table.id)}
                              >
                                Fill bots
                              </GhostBtn>
                            </>,
                          )}
                        </ItemBody>
                      </ItemCard>
                    ))}
                  </Grid>
                )}

                {(playTab === 'sng' || playTab === 'mtt') && (
                  <Grid>
                    {(playTab === 'sng' ? sng : mtt).map((t) => (
                      <ItemCard key={t.id}>
                        <ItemCover>
                          <img src={imageForTournamentRoom(t)} alt="" />
                        </ItemCover>
                        <ItemBody>
                          <CardTitle>{t.name}</CardTitle>
                          <CardMeta>
                            {t.registered}/{t.maxPlayers} · Buy-in {t.buyIn}
                          </CardMeta>
                          {renderActions(
                            <>
                              <PrimaryBtn
                                type="button"
                                disabled={t.status !== 'registering'}
                                onClick={() => registerTournament(t.id)}
                              >
                                Register
                              </PrimaryBtn>
                              <GhostBtn
                                type="button"
                                disabled={t.status !== 'registering'}
                                onClick={() =>
                                  fillTournamentBots(
                                    t.id,
                                    t.type === 'mtt' ? 6 : 3,
                                  )
                                }
                              >
                                Add bots
                              </GhostBtn>
                              <GhostBtn
                                type="button"
                                disabled={
                                  t.status !== 'registering' ||
                                  t.registered < 2
                                }
                                onClick={() => startTournament(t.id)}
                              >
                                Start
                              </GhostBtn>
                            </>,
                          )}
                        </ItemBody>
                      </ItemCard>
                    ))}
                  </Grid>
                )}
                </AnimatedPanel>
              </>
            )}
          </SectionBlock>
          </AnimatedPanel>
        )}

        {mainTab === 'academy' && (
          <AnimatedPanel key="main-academy">
            <AcademyPanel />
          </AnimatedPanel>
        )}
      </Shell>
    </Page>
  )
}

const drift = keyframes`
  0% { transform: scale(1.06) translate3d(0, 0, 0); }
  50% { transform: scale(1.12) translate3d(-1.5%, -0.8%, 0); }
  100% { transform: scale(1.06) translate3d(0, 0, 0); }
`

const panelIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const crumbIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

const SwalTheme = createGlobalStyle`
  .proto-swal-popup {
    border: 1px solid rgba(128, 234, 255, 0.35) !important;
    border-radius: 0 !important;
    box-shadow:
      0 0 40px rgba(255, 110, 199, 0.18),
      0 0 60px rgba(128, 234, 255, 0.12) !important;
    font-family: 'Chakra Petch', 'Segoe UI', sans-serif !important;
  }

  .proto-swal-title {
    color: #f4f0ff !important;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700 !important;
  }

  .proto-swal-text {
    color: rgba(220, 210, 245, 0.88) !important;
  }

  .proto-swal-confirm {
    border: 1px solid rgba(128, 234, 255, 0.65) !important;
    background: linear-gradient(
      135deg,
      rgba(255, 110, 199, 0.55),
      rgba(88, 40, 160, 0.9),
      rgba(20, 70, 140, 0.95)
    ) !important;
    letter-spacing: 0.06em;
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
  will-change: transform;
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(
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
  margin-bottom: 1rem;
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

const PlayerMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
`

const ProfileLink = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid rgba(128, 234, 255, 0.28);
  background: rgba(255, 255, 255, 0.04);
  min-width: 110px;
  text-decoration: none !important;
  color: inherit !important;

  &:hover {
    border-color: var(--cyan);
  }
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

const PriceMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.15rem 0 0.2rem;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;

  ${ChipIconWrap} {
    width: 18px;
    height: 18px;

    svg {
      width: 18px;
      height: 18px;
    }

    path {
      fill: #ffd36a;
    }
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

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0 0 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.35rem;
`

const Tab = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  color: ${(p) => (p.$active ? '#fff' : 'var(--muted)')};
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.75rem 1rem;
  cursor: pointer;
  position: relative;
  transition: color 0.25s ease;

  &::after {
    content: '';
    position: absolute;
    left: 0.85rem;
    right: 0.85rem;
    bottom: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--pink), var(--cyan));
    transform: scaleX(${(p) => (p.$active ? 1 : 0)});
    transform-origin: left center;
    transition: transform 0.3s ease;
  }

  &:hover {
    color: #fff;
  }
`

const SectionBlock = styled.div`
  width: 100%;
`

const AnimatedPanel = styled.div`
  width: 100%;
  animation: ${panelIn} 0.38s cubic-bezier(0.22, 1, 0.36, 1);
`

const Breadcrumb = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.55rem;
  margin: 0 0 1.1rem;
  animation: ${crumbIn} 0.3s ease;
`

const CrumbLink = styled.button`
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover,
  &:focus {
    color: var(--cyan);
  }
`

const CrumbSep = styled.span`
  color: rgba(128, 234, 255, 0.35);
  font-size: 0.78rem;
  font-weight: 600;
  user-select: none;
`

const CrumbCurrent = styled.span`
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
`

const Hint = styled.p`
  margin: 0 0 0.85rem;
  color: var(--muted);
  font-size: 0.9rem;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.75rem;
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
  transition: filter 0.2s ease, border-color 0.2s ease, background 0.2s ease;

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

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    filter: brightness(1.1);
  }
`

const GhostBtn = styled.button`
  ${btnBase}
  border: 1px solid rgba(128, 234, 255, 0.28);
  color: var(--ink);
  background: rgba(255, 255, 255, 0.04);

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    border-color: var(--cyan);
    background: rgba(128, 234, 255, 0.08);
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.85rem;
  width: 100%;
`

const Card = styled.div`
  border: 1px solid rgba(128, 234, 255, 0.22);
  background: rgba(10, 5, 24, 0.7);
  backdrop-filter: blur(8px);
  padding: 1.1rem;
`

const ItemCard = styled.div`
  border: 1px solid rgba(128, 234, 255, 0.22);
  background: rgba(10, 5, 24, 0.7);
  backdrop-filter: blur(8px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const ItemCover = styled.div`
  width: 100%;
  aspect-ratio: 16 / 10;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const ItemBody = styled.div`
  padding: 0.9rem 1.1rem 1.1rem;
`

const InteractiveCard = styled.button`
  appearance: none;
  text-align: left;
  border: 1px solid rgba(128, 234, 255, 0.22);
  background: rgba(10, 5, 24, 0.7);
  backdrop-filter: blur(8px);
  padding: 0;
  overflow: hidden;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: var(--cyan);
    transform: translateY(-1px);
  }

  ${'' /* title/meta padding */}
  & > h3,
  & > p {
    padding-left: 1.1rem;
    padding-right: 1.1rem;
  }

  & > h3 {
    margin-top: 0.85rem;
  }

  & > p:last-child {
    padding-bottom: 1.1rem;
  }
`

const GameCover = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.35);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`

const GameCoverFallback = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(128, 234, 255, 0.7);
  background: linear-gradient(
    135deg,
    rgba(255, 110, 199, 0.2),
    rgba(20, 70, 140, 0.35)
  );
`

const CardTitle = styled.h3`
  margin: 0 0 0.45rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.04em;
`

const CardMeta = styled.p`
  margin: 0.2rem 0;
  color: var(--muted);
  font-size: 0.9rem;
`

export default Lobby
