import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import Play from '../../pages/Play'
import Lobby from '../../pages/Lobby'
import BlackjackPlay from '../../pages/BlackjackPlay'
import NotFoundPage from '../../pages/NotFoundPage'
import ConnectWallet from '../../pages/ConnectWallet'
import Landing from '../../pages/Landing'
import Profile from '../../pages/Profile'

const pageIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const PageTransition = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  animation: ${pageIn} 0.4s cubic-bezier(0.22, 1, 0.36, 1);
`

const AppRoutes = () => {
  const location = useLocation()

  return (
    <PageTransition key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/enter" element={<ConnectWallet />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/finance" element={<Navigate to="/profile" replace />} />
        <Route path="/play" element={<Play />} />
        <Route path="/play/:tableId" element={<Play />} />
        <Route path="/play/bj/:tableId" element={<BlackjackPlay />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PageTransition>
  )
}

export default AppRoutes
