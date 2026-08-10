import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/buttons/Button'
import gameContext from '../context/game/gameContext'
import socketContext from '../context/websocket/socketContext'
import PokerCard from '../components/game/PokerCard'
import styled from 'styled-components'

const Page = styled.div`
  min-height: 100vh;
  background: radial-gradient(ellipse at center, #0f2e28 0%, #071412 70%);
  color: #e8f0ee;
  padding: 1.25rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const Shell = styled.div`
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
`

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`

const Title = styled.div`
  h2 {
    margin: 0 0 0.25rem;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 400;
  }

  p {
    margin: 0;
    opacity: 0.85;
  }
`

const TableFelt = styled.div`
  border: 1px solid #2a5c52;
  border-radius: 1.5rem;
  background: radial-gradient(ellipse at center, #145a4a 0%, #0a2a24 65%, #061816 100%);
  padding: 1.25rem 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  min-height: 420px;
`

const Zone = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`

const ZoneLabel = styled.div`
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.75;
  margin-bottom: 0.35rem;
`

const Cards = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
  min-height: 4.5rem;
  align-items: center;
`

const Seats = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  align-items: stretch;
`

const SeatBox = styled.div`
  border: 1px solid ${(p) => (p.$active ? '#3ce0c0' : '#2a5c52')};
  box-shadow: ${(p) => (p.$active ? '0 0 0 1px #3ce0c0' : 'none')};
  padding: 0.85rem 0.7rem;
  min-height: 150px;
  text-align: center;
  background: rgba(8, 28, 28, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25rem;

  p {
    margin: 0;
    font-size: 0.92rem;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  width: 100%;

  input {
    background: #081c1c;
    border: 1px solid #2a5c52;
    color: #e8f0ee;
    padding: 0.5rem 0.65rem;
    width: 110px;
  }

  button {
    min-width: 0;
  }
`

const Hint = styled.p`
  margin: 0;
  text-align: center;
  opacity: 0.85;
`

const BlackjackPlay = () => {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
  const {
    currentTable,
    seatId,
    joinTable,
    leaveTable,
    sitDown,
    bjBet,
    bjDeal,
    bjHit,
    bjStand,
    bjDouble,
    fillBots,
    messages,
  } = useContext(gameContext)
  const [betAmount, setBetAmount] = useState(10)

  useEffect(() => {
    if (!socket) {
      navigate('/')
      return undefined
    }
    joinTable(Number(tableId))
    // Do NOT leave on unmount — remount was interrupting live tables.
    // eslint-disable-next-line
  }, [socket, tableId])

  useEffect(() => {
    if (currentTable && currentTable.minBet) {
      setBetAmount(currentTable.minBet)
    }
  }, [currentTable])

  if (!currentTable) {
    return (
      <Page>
        <Shell>
          <Hint>Loading blackjack table…</Hint>
        </Shell>
      </Page>
    )
  }

  const mySeat = seatId && currentTable.seats[seatId]
  const isMyTurn = mySeat && currentTable.turn === seatId
  const dealerHand = (currentTable.dealer && currentTable.dealer.hand) || []
  const seatCount = currentTable.maxPlayers || 5

  return (
    <Page>
      <Shell>
        <TopBar>
          <Button small secondary onClick={leaveTable}>
            Leave
          </Button>
          <Button small secondary onClick={() => fillBots(currentTable.id)}>
            Add bot
          </Button>
        </TopBar>

        <Title>
          <h2>{currentTable.name}</h2>
          <p>
            Phase: {currentTable.phase} · Min bet {currentTable.minBet}
            {messages && messages.length > 0
              ? ` · ${messages[messages.length - 1]}`
              : ''}
          </p>
        </Title>

        <TableFelt>
          <Zone>
            <ZoneLabel>Dealer</ZoneLabel>
            <Cards>
              {dealerHand.length === 0 ? (
                <Hint>Waiting for deal…</Hint>
              ) : (
                dealerHand.map((card, i) =>
                  card && card.suit && card.rank ? (
                    <PokerCard
                      key={`${card.suit}${card.rank}-${i}`}
                      card={card}
                      width="4.5vw"
                      minWidth="42px"
                      maxWidth="70px"
                    />
                  ) : null,
                )
              )}
            </Cards>
            {currentTable.dealer && currentTable.dealer.value != null && (
              <p>Value: {currentTable.dealer.value}</p>
            )}
          </Zone>

          <Zone>
            <ZoneLabel>Seats</ZoneLabel>
            <Seats>
              {Array.from({ length: seatCount }, (_, i) => i + 1).map((n) => {
                const seat = currentTable.seats[n]
                const isTurn = currentTable.turn === n

                if (!seat) {
                  return (
                    <SeatBox key={n}>
                      <p>Empty Seat {n}</p>
                      <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                        <Button
                          small
                          primary
                          onClick={() => sitDown(currentTable.id, n, 0)}
                        >
                          Sit
                        </Button>
                      </div>
                    </SeatBox>
                  )
                }

                return (
                  <SeatBox key={n} $active={isTurn}>
                    <p>
                      {seat.player.name}
                      {seat.player.isBot ? ' (bot)' : ''}
                    </p>
                    <p>Bank {seat.player.bankroll}</p>
                    <p>Bet {seat.bet || 0}</p>
                    {seat.value != null && seat.hand && seat.hand.length > 0 && (
                      <p>Hand {seat.value}</p>
                    )}
                    {seat.result && <p>{seat.result}</p>}
                    <Cards>
                      {(seat.hand || []).map((card, idx) =>
                        card && card.suit && card.rank ? (
                          <PokerCard
                            key={`${n}-${card.suit}${card.rank}-${idx}`}
                            card={card}
                            width="3.5vw"
                            minWidth="36px"
                            maxWidth="56px"
                          />
                        ) : null,
                      )}
                    </Cards>
                    {!seatId && seat.player.isBot && (
                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                        <Button
                          small
                          primary
                          onClick={() => sitDown(currentTable.id, n, 0)}
                        >
                          Take Seat
                        </Button>
                      </div>
                    )}
                  </SeatBox>
                )
              })}
            </Seats>
          </Zone>
        </TableFelt>

        {mySeat && currentTable.phase === 'betting' && (
          <Actions>
            <input
              type="number"
              value={betAmount}
              min={currentTable.minBet}
              max={currentTable.maxBet}
              onChange={(e) => setBetAmount(Number(e.target.value))}
            />
            <Button small primary onClick={() => bjBet(betAmount)}>
              Bet
            </Button>
            <Button small secondary onClick={bjDeal}>
              Deal
            </Button>
          </Actions>
        )}

        {isMyTurn && (
          <Actions>
            <Button small primary onClick={bjHit}>
              Hit
            </Button>
            <Button small primary onClick={bjStand}>
              Stand
            </Button>
            <Button small secondary onClick={bjDouble}>
              Double
            </Button>
          </Actions>
        )}

        {!mySeat && <Hint>Sit at an empty seat to play.</Hint>}
      </Shell>
    </Page>
  )
}

export default BlackjackPlay
