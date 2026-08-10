import React, { useContext } from 'react'
import globalContext from '../../../context/global/globalContext'
import gameContext from '../../../context/game/gameContext'
import { PositionedUISlot } from '../PositionedUISlot'
import { LastAction } from '../LastAction'
import PokerCard from '../PokerCard'
import ChipsAmountPill from '../ChipsAmountPill'
import { EmptySeat } from './EmptySeat'
import { OccupiedSeat } from './OccupiedSeat'
import { Hand } from '../Hand'
import DealerButton from '../../icons/DealerButton'
import SmallBlindButton from '../../icons/SmallBlindButton'
import BigBlindButton from '../../icons/BigBlindButton'
import { StyledSeat } from './StyledSeat'
import Button from '../../buttons/Button'
import Markdown from 'react-remarkable'
import './Seat.scss'

export const Seat = ({ currentTable, seatNumber, sitDown }) => {
  const { chipsAmount } = useContext(globalContext)
  const { seatId, rebuy } = useContext(gameContext)

  const seat = currentTable.seats[seatNumber]
  const maxBuyin = currentTable.limit
  const minBuyIn = Math.max(
    (currentTable.minBet || 0) * 20,
    currentTable.minBet * 2 * 10 || 0,
  )

  const gameActions = {
    CS_CALL: { text: 'Call', bgColor: '#feaa33' },
    CS_FOLD: { text: 'Fold', bgColor: '#ff3332' },
    CS_CHECK: { text: 'Check', bgColor: '#48ff52' },
    CS_RAISE: { text: 'Raise', bgColor: '#179ddc' },
    WINNER: { text: 'Win', bgColor: '#f5d742' },
  }

  const handleSit = () => {
    if (!sitDown) return
    const amount = Math.min(maxBuyin, chipsAmount || maxBuyin)
    if (!amount || amount < minBuyIn) {
      window.alert(
        `Need at least ${minBuyIn} chips to sit (you have ${chipsAmount || 0}).`,
      )
      return
    }
    sitDown(currentTable.id, seatNumber, amount)
  }

  const handleRebuy = () => {
    if (!rebuy || seatId !== seatNumber) return
    const amount = Math.min(maxBuyin - (seat.stack || 0), chipsAmount || 0)
    if (amount <= 0) return
    rebuy(currentTable.id, seatNumber, amount)
  }

  return (
    <StyledSeat>
      {!seat ? (
        <EmptySeat onClick={handleSit} style={{ cursor: 'pointer' }}>
          <div className="empty-set-wrapper" onClick={handleSit}>
            <Markdown>
              <span className="empty-seat">Sit Here</span>
            </Markdown>
          </div>
        </EmptySeat>
      ) : (
        <PositionedUISlot
          style={{
            display: 'flex',
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <PositionedUISlot
            top="-7.5rem"
            left="-75px"
            origin="top center"
            style={{ minWidth: '150px', zIndex: '55' }}
          >
            <ChipsAmountPill chipsAmount={seat.bet} />
            {!currentTable.handOver &&
              seat.lastAction &&
              gameActions[seat.lastAction] && (
                <LastAction bgColor={gameActions[seat.lastAction].bgColor}>
                  {gameActions[seat.lastAction].text}
                </LastAction>
              )}
          </PositionedUISlot>
          <PositionedUISlot>
            <OccupiedSeat seatNumber={seatNumber} hasTurn={seat.turn} />
          </PositionedUISlot>
          <PositionedUISlot
            left="4vh"
            style={{
              display: 'flex',
              textAlign: 'center',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            origin="center right"
          >
            <Hand>
              {seat.hand &&
                seat.hand.map((card, index) => (
                  <PokerCard
                    key={index}
                    card={card}
                    width="5vw"
                    maxWidth="60px"
                    minWidth="30px"
                  />
                ))}
            </Hand>
          </PositionedUISlot>

          {currentTable.button === seatNumber && (
            <PositionedUISlot top="-85px" left="-70px" origin="top left" style={{ zIndex: '55' }}>
              <DealerButton />
            </PositionedUISlot>
          )}
          {currentTable.bigBlind === seatNumber && (
            <PositionedUISlot top="-55px" left="-93px" origin="top left" style={{ zIndex: '55' }}>
              <BigBlindButton />
            </PositionedUISlot>
          )}
          {currentTable.smallBlind === seatNumber && (
            <PositionedUISlot top="-55px" left="-93px" origin="top left" style={{ zIndex: '55' }}>
              <SmallBlindButton />
            </PositionedUISlot>
          )}

          <PositionedUISlot
            top="6vh"
            style={{ minWidth: '150px', zIndex: '55' }}
            origin="bottom center"
          >
            <p className="seat-name">
              {seat.player.name}
              {seat.player.isBot ? ' (bot)' : ''}
            </p>
            {seat.stack != null && (
              <p className="seat-stack">
                {new Intl.NumberFormat(document.documentElement.lang).format(
                  seat.stack,
                )}
              </p>
            )}
            {!seatId && seat.player.isBot && (
              <Button small primary onClick={handleSit}>
                Take Seat
              </Button>
            )}
            {seatId === seatNumber && seat.sittingOut && (
              <Button small primary onClick={handleRebuy}>
                Rebuy
              </Button>
            )}
          </PositionedUISlot>
        </PositionedUISlot>
      )}
    </StyledSeat>
  )
}
