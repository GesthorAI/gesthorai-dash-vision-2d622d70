import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface InviteEmailProps {
  organizationName: string
  inviterName: string
  invitedEmail: string
  role: string
  acceptUrl: string
}

export const InviteEmail = ({
  organizationName,
  inviterName,
  invitedEmail,
  role,
  acceptUrl,
}: InviteEmailProps) => (
  <Html>
    <Head />
    <Preview>Convite para se juntar à {organizationName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Você foi convidado!</Heading>
        
        <Text style={text}>
          Olá! {inviterName} convidou você para se juntar à organização <strong>{organizationName}</strong> como <strong>{role === 'admin' ? 'Administrador' : 'Membro'}</strong>.
        </Text>
        
        <Link
          href={acceptUrl}
          target="_blank"
          style={{
            ...link,
            display: 'block',
            marginBottom: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            textAlign: 'center' as const,
            fontWeight: 'bold',
          }}
        >
          Aceitar Convite
        </Link>
        
        <Text style={{ ...text, marginBottom: '14px' }}>
          Ou copie e cole este link no seu navegador:
        </Text>
        
        <Text style={code}>{acceptUrl}</Text>
        
        <Text
          style={{
            ...text,
            color: '#666',
            marginTop: '24px',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          <strong>Sobre o convite:</strong><br />
          • Email: {invitedEmail}<br />
          • Organização: {organizationName}<br />
          • Função: {role === 'admin' ? 'Administrador' : 'Membro'}<br />
          • Convidado por: {inviterName}
        </Text>
        
        <Text
          style={{
            ...text,
            color: '#999',
            marginTop: '14px',
            marginBottom: '16px',
            fontSize: '11px',
          }}
        >
          Este convite expira em 7 dias. Se você não solicitou este convite, pode ignorar este email com segurança.
        </Text>
        
        <Text style={footer}>
          Enviado pelo sistema de gerenciamento de leads
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #eaeaea',
  borderRadius: '5px',
  boxShadow: '0 5px 10px rgba(20, 50, 70, .2)',
  margin: '0 auto',
  padding: '20px',
  width: '465px',
}

const h1 = {
  color: '#000',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const link = {
  color: '#007bff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '14px',
  textDecoration: 'underline',
}

const text = {
  color: '#000',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '14px',
  margin: '24px 0',
  lineHeight: '1.5',
}

const footer = {
  color: '#898989',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
}

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '12px',
  fontFamily: 'monospace',
  wordBreak: 'break-all' as const,
}