import React from 'react'
import Button from '../buttons/Button'
import { BetSlider } from './Betslider/BetSlider'
import { UIWrapper } from './UIWrapper'
import { Row, Col } from 'react-bootstrap'

export const GameUI = ({
  currentTable,
  seatId,
  bet,
  setBet,
  raise,
  standUp,
  fold,
  check,
  call,
}) => {
  const seat = currentTable.seats[seatId]
  if (!seat) return null

  const facingBet =
    currentTable.callAmount != null &&
    seat.bet < currentTable.callAmount &&
    currentTable.callAmount > 0

  const canCheck = !facingBet
  const canCall = facingBet
  const callLabel =
    canCall && currentTable.callAmount != null
      ? Math.min(
          currentTable.callAmount - seat.bet,
          seat.stack,
        )
      : 0

  return (
    <UIWrapper style={{ display: 'flex' }}>
      <Row>
        <Col sm={12} md={6}>
          <Row>
            <Col sm={4}>
              <Button small secondary onClick={fold} style={{ minHeight: '100%' }}>
                Fold
              </Button>
            </Col>
            <Col sm={4}>
              <Button
                small
                secondary
                disabled={!canCheck}
                onClick={check}
                style={{ minHeight: '100%' }}
              >
                Check
              </Button>
            </Col>
            <Col sm={4}>
              <Button small disabled={!canCall} onClick={call}>
                Call {canCall ? callLabel : ''}
              </Button>
            </Col>
          </Row>
        </Col>
        <Col sm={12} md={6}>
          <Row>
            <Col sm={3}>
              <Button
                small
                onClick={() => raise(bet)}
                style={{ minHeight: '100%' }}
              >
                Raise
              </Button>
            </Col>
            <Col sm={3}>
              <Button
                small
                secondary
                onClick={() => raise(seat.stack + seat.bet)}
                style={{ minHeight: '100%' }}
              >
                All In
              </Button>
            </Col>
            <Col
              sm={6}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid',
                borderImage: 'linear-gradient(to bottom, #21a68e, #0d3733) 2',
                backgroundImage: 'linear-gradient(to bottom, #187969, #081c1c)',
                backgroundOrigin: 'border-box',
                padding: '0px 5px',
              }}
            >
              <BetSlider
                currentTable={currentTable}
                seatId={seatId}
                bet={bet}
                setBet={setBet}
              />
            </Col>
          </Row>
        </Col>
      </Row>
      <Button small secondary onClick={standUp} style={{ marginLeft: '0.5rem' }}>
        Stand Up
      </Button>
    </UIWrapper>
  )
}
