import React from 'react'
import styled from 'styled-components'

const DOCS = {
  academy: 'https://proto-academy.com',
  accelerator: 'https://accelerator.proto.com/',
  sdk: 'https://developers.proto.com/sdk/',
  explorer: 'https://developers.proto.com/sdk/demo/',
  unityQuick: 'https://developers.proto.com/sdk/unity/quick-start/',
  list: 'https://developers.proto.com/sdk/list-of-sdk/',
  publisher: 'https://publisher.proto.com/',
}

const INTEGRATION_STEPS = [
  {
    n: '01',
    title: 'Authenticate',
    body:
      'Configure Project ID and Login ID from Publisher Account. Start the store client (sandbox first) and attach a payment / transaction observer.',
  },
  {
    n: '02',
    title: 'Load catalog',
    body:
      'Fetch SKUs and product metadata from Proto (or declare products for Unity IAP). Surface prices and items in your in-game store UI.',
  },
  {
    n: '03',
    title: 'Purchase',
    body:
      'Call the SDK purchase API for a SKU. Proto Pay Station opens (native or Buy Button → Web Shop) with 1,000+ payment methods.',
  },
  {
    n: '04',
    title: 'Finalize',
    body:
      'Acknowledge the transaction, grant items, and for production validate with Proto webhooks or the Events API on your server.',
  },
]

const PLATFORMS = [
  {
    name: 'Unity SDK',
    detail: 'iOS · Android · Windows · macOS · Web',
    href: DOCS.unityQuick,
  },
  {
    name: 'Mobile SDK',
    detail: 'iOS · Android (StoreKit-style / native)',
    href: DOCS.sdk,
  },
  {
    name: 'Windows Stores',
    detail: 'Windows · Epic Games Store',
    href: DOCS.sdk,
  },
  {
    name: 'Unreal Engine',
    detail: 'Login · Shop Builder · Pay Station',
    href: 'https://developers.proto.com/sdk-client-side/unreal-engine/',
  },
]

/**
 * In-lobby Proto Academy + SDK primer (links to official Proto docs).
 */
const AcademyPanel = () => (
  <Wrap>
    <Hero>
      <Eyebrow>Learn · Build · Monetize</Eyebrow>
      <Title>Proto Academy</Title>
      <Lead>
        Gamified training from Proto for game business, monetization, marketing,
        distribution, investment, and Proto solutions — plus the SDK path to
        ship payments worldwide.
      </Lead>
      <CtaRow>
        <PrimaryLink
          href={DOCS.academy}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Academy
        </PrimaryLink>
        <GhostLink
          href={DOCS.accelerator}
          target="_blank"
          rel="noopener noreferrer"
        >
          Accelerator courses
        </GhostLink>
      </CtaRow>
    </Hero>

    <Section>
      <SectionTitle>What you can learn</SectionTitle>
      <TrackGrid>
        {[
          'Game Business',
          'Monetization',
          'Marketing',
          'Distribution',
          'Investment',
          'Proto Solutions',
        ].map((t) => (
          <Track key={t}>{t}</Track>
        ))}
      </TrackGrid>
      <Note>
        Proto Academy Online (XAO) is free to join at{' '}
        <InlineA href={DOCS.academy} target="_blank" rel="noopener noreferrer">
          proto-academy.com
        </InlineA>
        . Pair it with Accelerator mentorship and the Knowledge Centre when you
        need deeper studio guidance.
      </Note>
    </Section>

    <Section>
      <SectionTitle>Introduce the Proto Game SDK</SectionTitle>
      <LeadTight>
        <strong>Proto Game SDK</strong> helps you monetize and go live across App
        Store, Google Play, Android APK, iOS, Proto Launcher, and standalone PC
        — powered by <strong>Proto Pay Station</strong>. One integration also
        unlocks a customizable <strong>Web Shop</strong> for direct-to-consumer
        sales outside the app.
      </LeadTight>
      <StatRow>
        <Stat>
          <StatNum>1,000+</StatNum>
          <StatLabel>Payment methods</StatLabel>
        </Stat>
        <Stat>
          <StatNum>200+</StatNum>
          <StatLabel>Countries</StatLabel>
        </Stat>
        <Stat>
          <StatNum>130+</StatNum>
          <StatLabel>Currencies</StatLabel>
        </Stat>
        <Stat>
          <StatNum>25+</StatNum>
          <StatLabel>UI languages</StatLabel>
        </Stat>
      </StatRow>
      <CtaRow>
        <PrimaryLink href={DOCS.sdk} target="_blank" rel="noopener noreferrer">
          SDK documentation
        </PrimaryLink>
        <GhostLink
          href={DOCS.explorer}
          target="_blank"
          rel="noopener noreferrer"
        >
          SDK Explorer demo
        </GhostLink>
      </CtaRow>
    </Section>

    <Section>
      <SectionTitle>Integration method</SectionTitle>
      <Note>
        Official flow from{' '}
        <InlineA href={DOCS.sdk} target="_blank" rel="noopener noreferrer">
          developers.proto.com/sdk
        </InlineA>
        . Create a project in Publisher Account first, then install the SDK for
        your engine.
      </Note>
      <StepList>
        {INTEGRATION_STEPS.map((s) => (
          <Step key={s.n}>
            <StepNum>{s.n}</StepNum>
            <div>
              <StepTitle>{s.title}</StepTitle>
              <StepBody>{s.body}</StepBody>
            </div>
          </Step>
        ))}
      </StepList>
      <CodeHint>
        Publisher Account → create project → set Login → install SDK (Unity git
        package / iOS SPM / Android Maven) → sandbox test → webhooks for
        production.
      </CodeHint>
      <CtaRow>
        <GhostLink
          href={DOCS.publisher}
          target="_blank"
          rel="noopener noreferrer"
        >
          Publisher Account
        </GhostLink>
        <GhostLink
          href={DOCS.unityQuick}
          target="_blank"
          rel="noopener noreferrer"
        >
          Unity quick start
        </GhostLink>
      </CtaRow>
    </Section>

    <Section>
      <SectionTitle>Choose your SDK</SectionTitle>
      <PlatformGrid>
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CardTitle>{p.name}</CardTitle>
            <CardMeta>{p.detail}</CardMeta>
            <CardGo>Docs →</CardGo>
          </PlatformCard>
        ))}
      </PlatformGrid>
      <Note>
        Full SDK list:{' '}
        <InlineA href={DOCS.list} target="_blank" rel="noopener noreferrer">
          developers.proto.com/sdk/list-of-sdk
        </InlineA>
      </Note>
    </Section>
  </Wrap>
)

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
`

const Hero = styled.header`
  padding: 1.25rem 0 0.25rem;
`

const Eyebrow = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cyan);
`

const Title = styled.h2`
  margin: 0 0 0.65rem;
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const Lead = styled.p`
  margin: 0 0 1.1rem;
  max-width: 42rem;
  color: var(--muted);
  line-height: 1.55;
  font-size: 1rem;
`

const LeadTight = styled.p`
  margin: 0 0 1rem;
  color: var(--muted);
  line-height: 1.55;

  strong {
    color: #fff;
    font-weight: 600;
  }
`

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
`

const PrimaryLink = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.15rem;
  border: 1px solid rgba(128, 234, 255, 0.55);
  background: linear-gradient(
    135deg,
    rgba(255, 110, 199, 0.45),
    rgba(88, 40, 160, 0.85),
    rgba(20, 70, 140, 0.9)
  );
  color: #fff !important;
  text-decoration: none !important;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.78rem;
`

const GhostLink = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.15rem;
  border: 1px solid rgba(128, 234, 255, 0.35);
  background: rgba(8, 4, 24, 0.45);
  color: var(--ink) !important;
  text-decoration: none !important;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.78rem;
`

const Section = styled.section`
  padding: 1.15rem 0 0;
  border-top: 1px solid rgba(128, 234, 255, 0.18);
`

const SectionTitle = styled.h3`
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const TrackGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
`

const Track = styled.span`
  padding: 0.45rem 0.75rem;
  border: 1px solid rgba(255, 110, 199, 0.35);
  background: rgba(255, 110, 199, 0.08);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const Note = styled.p`
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.5;
`

const InlineA = styled.a`
  color: var(--cyan) !important;
  text-decoration: underline !important;
`

const StatRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  margin: 0 0 1rem;

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Stat = styled.div`
  padding: 0.75rem 0.85rem;
  border: 1px solid rgba(128, 234, 255, 0.22);
  background: rgba(8, 4, 24, 0.4);
`

const StatNum = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
`

const StatLabel = styled.div`
  margin-top: 0.2rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
`

const StepList = styled.ol`
  list-style: none;
  margin: 1rem 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const Step = styled.li`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.85rem;
  align-items: start;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(128, 234, 255, 0.2);
  background: rgba(8, 4, 24, 0.35);
`

const StepNum = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--pink);
`

const StepTitle = styled.h4`
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const StepBody = styled.p`
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.5;
`

const CodeHint = styled.p`
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border-left: 2px solid var(--cyan);
  background: rgba(128, 234, 255, 0.06);
  color: rgba(230, 235, 255, 0.88);
  font-size: 0.82rem;
  line-height: 1.45;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
`

const PlatformGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.85rem;
`

const PlatformCard = styled.a`
  display: block;
  padding: 1rem;
  border: 1px solid rgba(128, 234, 255, 0.25);
  background: rgba(8, 4, 24, 0.4);
  text-decoration: none !important;
  color: inherit !important;
  transition: border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: rgba(255, 110, 199, 0.55);
    transform: translateY(-2px);
  }
`

const CardTitle = styled.div`
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.88rem;
`

const CardMeta = styled.div`
  margin-top: 0.35rem;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.35;
`

const CardGo = styled.div`
  margin-top: 0.65rem;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cyan);
`

export default AcademyPanel
