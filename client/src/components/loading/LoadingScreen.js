import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import universeBg from '../../assets/img/proto-universe-bg.png';

const StyledLoadingScreen = styled.div`
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #05010f;
`;

const kenBurns = keyframes`
  0% { transform: scale(1.08) translate3d(0, 0, 0); }
  50% { transform: scale(1.16) translate3d(-2.2%, -1.2%, 0); }
  100% { transform: scale(1.08) translate3d(0, 0, 0); }
`;

const shimmer = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
`;

const UniverseImage = styled.div`
  position: absolute;
  inset: -8%;
  z-index: 0;
  background:
    url(${universeBg}) center 42% / cover no-repeat,
    #05010f;
  animation: ${kenBurns} 32s ease-in-out infinite;
  will-change: transform;
`;

const FrostedOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      180deg,
      rgba(4, 1, 14, 0.7) 0%,
      rgba(4, 1, 14, 0.35) 45%,
      rgba(4, 1, 14, 0.82) 100%
    );
`;

const LoaderWrapper = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: min(420px, calc(100% - 2.5rem));
`;

const LoadingText = styled.div`
  margin-bottom: 1.25rem;
  color: white;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 1px;
  text-shadow: 0 0 10px #00ffff44;
`;

const ProgressTrack = styled.div`
  position: relative;
  width: 100%;
  height: 12px;
  overflow: hidden;
  border: 1px solid rgba(128, 234, 255, 0.45);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 18px rgba(0, 255, 255, 0.18);
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #0b6e6e 0%, #80eaff 55%, #e8ffff 100%);
  box-shadow: 0 0 16px rgba(128, 234, 255, 0.75);
  transition: width 0.08s linear;
`;

const ProgressShine = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.28),
    transparent
  );
  animation: ${shimmer} 1.6s linear infinite;
  pointer-events: none;
`;

const ProgressLabel = styled.div`
  margin-top: 0.85rem;
  color: rgba(128, 234, 255, 0.95);
  font-size: 0.95rem;
  letter-spacing: 0.12em;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.35);
`;

const LoadingScreen = () => {
  const [progress, setProgress] = useState(8);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const p = Math.min(92, 8 + (1 - Math.exp(-elapsed / 1800)) * 84);
      setProgress(Math.round(p));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <StyledLoadingScreen>
      <UniverseImage />
      <FrostedOverlay />
      <LoaderWrapper>
        <LoadingText>Loading experience...</LoadingText>
        <ProgressTrack
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <ProgressFill style={{ width: `${progress}%` }} />
          <ProgressShine aria-hidden="true" />
        </ProgressTrack>
        <ProgressLabel>{progress}%</ProgressLabel>
      </LoaderWrapper>
    </StyledLoadingScreen>
  );
};

export default LoadingScreen;
