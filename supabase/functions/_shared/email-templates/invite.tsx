/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to HookCut</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>
            <span style={logoAccent}>Hook</span>Cut
          </Text>
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            Someone invited you to join HookCut — the AI-powered tool that turns long-form video into viral clips. Click below to accept.
          </Text>
          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>
              Accept Invitation →
            </Button>
          </Section>
          <Text style={footerText}>
            If you weren't expecting this, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={bottomSection}>
          <Text style={copyright}>© 2026 Truhand LLC. All rights reserved.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
}
const container = { maxWidth: '520px', margin: '0 auto' }
const logoSection = {
  backgroundColor: '#0F0F1A',
  padding: '28px 32px',
  borderRadius: '12px 12px 0 0',
  textAlign: 'center' as const,
}
const logoText = {
  fontSize: '28px',
  fontWeight: '800' as const,
  color: '#ffffff',
  margin: '0',
  letterSpacing: '-0.5px',
}
const logoAccent = { color: 'hsl(349, 100%, 59%)' }
const contentSection = { backgroundColor: '#0F0F1A', padding: '0 32px 32px' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#f5f5f5', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#a1a1aa', lineHeight: '1.6', margin: '0 0 24px' }
const buttonSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = {
  backgroundColor: 'hsl(349, 100%, 59%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footerText = { fontSize: '13px', color: '#71717a', margin: '0' }
const bottomSection = {
  backgroundColor: '#0a0a14',
  padding: '20px 32px',
  borderRadius: '0 0 12px 12px',
  textAlign: 'center' as const,
}
const copyright = { fontSize: '12px', color: '#52525b', margin: '0' }
