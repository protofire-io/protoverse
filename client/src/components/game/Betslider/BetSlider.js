import React from 'react'
import { BetSliderInput } from './BetSliderInput'
import { BetSliderWrapper } from './BetSliderWrapper'
import './BetSlider.scss'

export const BetSlider = ({ currentTable, seatId, bet, setBet }) => {
  const seat = currentTable.seats[seatId]
  if (!seat) return null

  const minTo = Math.max(
    currentTable.minRaise || currentTable.callAmount || currentTable.minBet || 0,
    currentTable.callAmount || 0,
    currentTable.minBet || 0,
  )
  const maxTo = seat.stack + seat.bet

  return (
    <BetSliderWrapper>
      <BetSliderInput
        type="range"
        style={{ width: '60%' }}
        step="10"
        min={Math.min(minTo, maxTo)}
        max={maxTo}
        value={Math.min(Math.max(bet, Math.min(minTo, maxTo)), maxTo)}
        onChange={(e) => setBet(+e.target.value)}
      />
      <span className="bet-slider-value">$ {bet}</span>
    </BetSliderWrapper>
  )
}
