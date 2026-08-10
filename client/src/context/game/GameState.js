import React, { useContext, useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CS_CALL,
  CS_CHECK,
  CS_FOLD,
  CS_JOIN_TABLE,
  CS_LEAVE_TABLE,
  CS_RAISE,
  CS_REBUY,
  CS_SIT_DOWN,
  CS_STAND_UP,
  SC_TABLE_JOINED,
  SC_TABLE_LEFT,
  SC_TABLE_UPDATED,
  CS_FILL_BOTS,
  CS_FILL_TOURNAMENT_BOTS,
  CS_REGISTER_TOURNAMENT,
  CS_START_TOURNAMENT,
  SC_TOURNAMENTS_UPDATED,
  SC_TOURNAMENT_UPDATED,
  SC_TOURNAMENT_STARTED,
  SC_TABLES_UPDATED,
  SC_RECEIVE_LOBBY_INFO,
  CS_BJ_BET,
  CS_BJ_HIT,
  CS_BJ_STAND,
  CS_BJ_DOUBLE,
  CS_BJ_DEAL,
} from '../../game/actions'
import socketContext from '../websocket/socketContext'
import GameContext from './gameContext'
import globalContext from '../global/globalContext'

const GameState = ({ children }) => {
  const { socket } = useContext(socketContext)
  const { setChipsAmount } = useContext(globalContext)
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [currentTable, setCurrentTable] = useState(null)
  const [seatId, setSeatId] = useState(null)
  const [lobbyTables, setLobbyTables] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [joinedTableId, setJoinedTableId] = useState(null)

  const currentTableRef = useRef(currentTable)
  const joinedTableIdRef = useRef(joinedTableId)

  useEffect(() => {
    currentTableRef.current = currentTable
  }, [currentTable])

  useEffect(() => {
    joinedTableIdRef.current = joinedTableId
  }, [joinedTableId])

  useEffect(() => {
    if (!socket) return undefined

    const onTableUpdated = ({ table, message }) => {
      setCurrentTable(table)
      if (table && table.seats) {
        const mine = Object.values(table.seats).find(
          (s) => s && s.player && s.player.socketId === socket.id,
        )
        if (mine) setSeatId(mine.id)
      }
      message && addMessage(message)
    }

    const onTableJoined = ({ tables, tableId, gameType, table }) => {
      setLobbyTables(tables || [])
      setJoinedTableId(tableId)
      if (table) {
        setCurrentTable(table)
        if (table.seats) {
          const mine = Object.values(table.seats).find(
            (s) => s && s.player && s.player.socketId === socket.id,
          )
          if (mine) setSeatId(mine.id)
        }
      }
      if (gameType === 'blackjack') {
        navigate(`/play/bj/${tableId}`)
      } else {
        navigate(`/play/${tableId}`)
      }
    }

    const onTableLeft = ({ tables }) => {
      setCurrentTable(null)
      setMessages([])
      setSeatId(null)
      setJoinedTableId(null)
      setLobbyTables(tables || [])
    }

    socket.on(SC_TABLE_UPDATED, onTableUpdated)
    socket.on(SC_TABLE_JOINED, onTableJoined)
    socket.on(SC_TABLE_LEFT, onTableLeft)
    socket.on(SC_TABLES_UPDATED, (tables) => setLobbyTables(tables || []))
    socket.on(SC_TOURNAMENTS_UPDATED, (list) => setTournaments(list || []))
    socket.on(SC_TOURNAMENT_UPDATED, (t) => {
      setTournaments((prev) =>
        prev.map((x) => (x.id === t.id ? t : x)).concat(
          prev.find((x) => x.id === t.id) ? [] : [t],
        ),
      )
    })
    socket.on(SC_TOURNAMENT_STARTED, (t) => {
      setTournaments((prev) => prev.map((x) => (x.id === t.id ? t : x)))
      if (t.tables && t.tables[0]) {
        setJoinedTableId(t.tables[0].id)
        navigate(`/play/${t.tables[0].id}`)
      }
    })
    socket.on(SC_RECEIVE_LOBBY_INFO, (payload) => {
      setLobbyTables(payload.tables || [])
      setTournaments(payload.tournaments || [])
      if (payload.amount != null && setChipsAmount) {
        setChipsAmount(payload.amount)
      }
    })

    return () => {
      socket.off(SC_TABLE_UPDATED, onTableUpdated)
      socket.off(SC_TABLE_JOINED, onTableJoined)
      socket.off(SC_TABLE_LEFT, onTableLeft)
    }
    // eslint-disable-next-line
  }, [socket])

  const joinTable = (tableId) => {
    if (!socket) return
    socket.emit(CS_JOIN_TABLE, Number(tableId))
  }

  const leaveTable = (options = {}) => {
    const shouldNavigate = options.navigate !== false
    if (!socket) {
      if (shouldNavigate) navigate('/lobby')
      return
    }
    standUp()
    const id = joinedTableIdRef.current || (currentTableRef.current && currentTableRef.current.id)
    if (id) socket.emit(CS_LEAVE_TABLE, Number(id))
    setCurrentTable(null)
    setSeatId(null)
    setJoinedTableId(null)
    if (shouldNavigate) navigate('/lobby')
  }

  const sitDown = (tableId, nextSeatId, amount) => {
    if (!socket) return
    socket.emit(CS_SIT_DOWN, {
      tableId: Number(tableId),
      seatId: Number(nextSeatId),
      amount: Number(amount),
    })
    setSeatId(Number(nextSeatId))
  }

  const rebuy = (tableId, nextSeatId, amount) => {
    if (!socket) return
    socket.emit(CS_REBUY, {
      tableId: Number(tableId),
      seatId: Number(nextSeatId),
      amount: Number(amount),
    })
  }

  const standUp = () => {
    if (!socket) return
    const id = joinedTableIdRef.current || (currentTableRef.current && currentTableRef.current.id)
    if (id) socket.emit(CS_STAND_UP, Number(id))
    setSeatId(null)
  }

  const addMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message])
  }

  const fold = () => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_FOLD, currentTableRef.current.id)
  }

  const check = () => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_CHECK, currentTableRef.current.id)
  }

  const call = () => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_CALL, currentTableRef.current.id)
  }

  const raise = (amount) => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_RAISE, {
      tableId: currentTableRef.current.id,
      amount: Number(amount),
    })
  }

  const fillBots = (tableId, count) => {
    if (!socket) return
    // undefined count → server fills all remaining seats (reserves one only if no human seated)
    const payload = { tableId: Number(tableId) }
    if (count != null) payload.count = count
    socket.emit(CS_FILL_BOTS, payload)
  }

  const fillTournamentBots = (tournamentId, count = 3) => {
    if (!socket) return
    socket.emit(CS_FILL_TOURNAMENT_BOTS, {
      tournamentId: Number(tournamentId),
      count,
    })
  }

  const registerTournament = (tournamentId) => {
    if (!socket) return
    socket.emit(CS_REGISTER_TOURNAMENT, Number(tournamentId))
  }

  const startTournament = (tournamentId) => {
    if (!socket) return
    socket.emit(CS_START_TOURNAMENT, Number(tournamentId))
  }

  const bjBet = (amount) => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_BJ_BET, {
      tableId: currentTableRef.current.id,
      amount: Number(amount),
    })
  }

  const bjDeal = () => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_BJ_DEAL, currentTableRef.current.id)
  }

  const bjHit = () => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_BJ_HIT, currentTableRef.current.id)
  }

  const bjStand = () => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_BJ_STAND, currentTableRef.current.id)
  }

  const bjDouble = () => {
    if (!socket || !currentTableRef.current) return
    socket.emit(CS_BJ_DOUBLE, currentTableRef.current.id)
  }

  return (
    <GameContext.Provider
      value={{
        messages,
        currentTable,
        seatId,
        lobbyTables,
        tournaments,
        joinTable,
        leaveTable,
        sitDown,
        standUp,
        addMessage,
        fold,
        check,
        call,
        raise,
        rebuy,
        fillBots,
        fillTournamentBots,
        registerTournament,
        startTournament,
        bjBet,
        bjDeal,
        bjHit,
        bjStand,
        bjDouble,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export default GameState
