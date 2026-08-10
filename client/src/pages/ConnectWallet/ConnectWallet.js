import React, { useContext, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import globalContext from './../../context/global/globalContext'
import LoadingScreen from '../../components/loading/LoadingScreen'
import socketContext from '../../context/websocket/socketContext'
import { CS_FETCH_LOBBY_INFO } from '../../game/actions'

const guestWallet = () =>
  `0xguest${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`

const ConnectWallet = () => {
  const { setWalletAddress, setUserName } = useContext(globalContext)
  const { socket } = useContext(socketContext)
  const navigate = useNavigate()
  const location = useLocation()
  const joining = useRef(false)

  useEffect(() => {
    // Skip until the socket exists; also avoid double-join when already connected
    if (!socket || socket.connected === true || joining.current) return undefined

    const query = new URLSearchParams(location.search)
    const walletFromQuery = query.get('walletAddress')
    const usernameFromQuery = query.get('username')

    joining.current = true
    const walletAddress = walletFromQuery || guestWallet()
    const username = walletFromQuery
      ? usernameFromQuery || 'Player'
      : 'Guest'

    setWalletAddress(walletAddress)
    setUserName(username)
    socket.emit(CS_FETCH_LOBBY_INFO, {
      walletAddress,
      socketId: socket.id,
      gameId: query.get('gameId') || 'local',
      username,
    })
    navigate('/lobby', { replace: true })
  }, [socket, location.search, navigate, setWalletAddress, setUserName])

  return <LoadingScreen />
}

export default ConnectWallet
