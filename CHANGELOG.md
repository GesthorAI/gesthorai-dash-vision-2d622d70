# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- Plano de implementação para produção
- Arquivo `.env.example` com todas as variáveis de ambiente
- Pipeline CI/CD com GitHub Actions
- Configuração de testes com Vitest
- Política de segurança (SECURITY.md)
- Documentação de changelog

### Em Desenvolvimento
- Implementação de testes unitários
- Implementação de testes E2E
- Configuração de monitoramento (Sentry)
- Otimizações de performance
- Documentação de API

## [0.9.0] - 2025-11-05

### Adicionado
- Sistema de segurança completo
- Página de segurança no dashboard
- Monitoramento de eventos de segurança
- Sistema de auditoria
- Gestão de organizações e convites
- Integração com WhatsApp via Evolution API
- Sistema de follow-ups automatizados
- IA para scoring de leads
- Busca semântica de leads
- Analytics e dashboards
- Sistema de tarefas
- Gestão de workflows com N8N
- Autenticação e autorização completas
- 25 Edge Functions no Supabase
- 50+ migrações de banco de dados
- UI completa com shadcn/ui
- Dark mode
- Multi-organização com RLS

### Modificado
- Otimizações de performance no frontend
- Melhorias na UX do dashboard
- Refatoração de componentes

### Corrigido
- Erro de build em send-invite
- Falha em migração de banco de dados
- Problemas de navegação
- Bugs no sistema de convites

## [0.1.0] - 2025-01-XX

### Adicionado
- Estrutura inicial do projeto
- Configuração do Vite + React + TypeScript
- Integração com Supabase
- Componentes básicos de UI

---

## Tipos de Mudanças

- `Adicionado` para novas funcionalidades
- `Modificado` para mudanças em funcionalidades existentes
- `Descontinuado` para funcionalidades que serão removidas
- `Removido` para funcionalidades removidas
- `Corrigido` para correções de bugs
- `Segurança` para vulnerabilidades corrigidas

## Versionamento

- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis
