# Sistema de Gestão de Ocorrências de Trânsito

## 📋 Visão Geral

Sistema completo para registro e gestão de ocorrências de trânsito envolvendo frota de ônibus urbanos. A aplicação possui duas áreas principais:

1. **Formulário Público**: Interface para registro de incidentes por motoristas e envolvidos
2. **Dashboard Gerencial**: Painel administrativo para visualização e controle de ocorrências

## 🎯 Características Principais

### Formulário de Ocorrências
- Interface amigável e intuitiva com comunicação empática
- Design inspirado nos padrões Apple (espaçamento, tipografia, animações)
- Sistema de upload de fotos guiado com 4 campos específicos:
  - **Frontal**: Vista frontal do veículo
  - **Lateral**: Vista lateral do veículo
  - **Danos**: Foco nos danos causados
  - **Contexto**: Visão geral da cena do incidente
- Animações 3D guiadas para orientar o posicionamento correto das fotos
- Preview das fotos capturadas com opção de refazer ou remover
- Geração automática de protocolo único no formato: `SIN-TB-YYYYMMDD-HHMMSS`
- Campos para múltiplas testemunhas
- Tema claro/escuro selecionável

### Dashboard Gerencial
- Visualização completa de todas as ocorrências
- Estatísticas em tempo real:
  - Total de ocorrências
  - Ocorrências recentes (últimas 48h)
  - Distribuição por responsabilidade (motorista/terceiro)
- Sistema de busca por protocolo, local ou motorista
- Indicadores visuais de status:
  - 🟢 Verde: Recente (< 2 dias)
  - 🟡 Amarelo: Em andamento (2-7 dias)
  - 🔴 Vermelho: Atenção (> 7 dias)
- Visualização detalhada de cada ocorrência com fotos e testemunhas

## 🔐 Acesso ao Sistema

### Formulário Público
**URL**: `/`
- Acesso livre, sem necessidade de autenticação
- Qualquer pessoa pode registrar uma ocorrência

### Dashboard Gerencial
**URL**: `/dashboard`

**Credenciais de Acesso**:
- **Usuário**: `gestor`
- **Senha**: `topbus2024`

**Como Acessar**:
1. Na página inicial, clique no ícone de escudo (🛡️) no canto superior direito
2. Digite as credenciais acima
3. Clique em "Acessar Dashboard"

## 🗄️ Arquitetura do Banco de Dados

### Supabase (Lovable Cloud)

O sistema utiliza Supabase como backend, com as seguintes configurações:

**Project ID**: `gijffocheprsblgztokt`

### Tabelas

#### 1. `sinistros`
Armazena as informações principais das ocorrências.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | integer | ID único (Primary Key) |
| protocolo | varchar | Protocolo único gerado automaticamente |
| data_hora | timestamp | Data e hora do registro |
| local_acidente | text | Endereço ou local do incidente |
| onibus | varchar | Número do ônibus |
| motorista | varchar | Nome do motorista |
| chapa | varchar | Chapa do motorista (opcional) |
| responsabilidade | varchar | "motorista" ou "terceiro" |
| descricao | text | Descrição detalhada do incidente |
| empresa | varchar | Nome da empresa (default: "TOPBUS") |
| created_at | timestamp | Data de criação do registro |
| updated_at | timestamp | Data da última atualização |

**RLS (Row Level Security)**: Acesso aberto (policy: `true`)

#### 2. `testemunhas`
Armazena informações das testemunhas de cada ocorrência.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | integer | ID único (Primary Key) |
| sinistro_id | integer | Referência ao sinistro (Foreign Key) |
| nome | varchar | Nome da testemunha |
| telefone | varchar | Telefone de contato |
| created_at | timestamp | Data de criação do registro |

**Relacionamento**: `testemunhas.sinistro_id` → `sinistros.id`

**RLS**: Acesso aberto (policy: `true`)

#### 3. `imagens`
Armazena os metadados das imagens anexadas às ocorrências.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | integer | ID único (Primary Key) |
| sinistro_id | integer | Referência ao sinistro (Foreign Key) |
| nome_arquivo | varchar | Nome original do arquivo |
| url_publica | text | URL pública da imagem no Storage |
| path_storage | text | Caminho no bucket do Storage |
| tamanho | integer | Tamanho do arquivo em bytes |
| tipo_mime | varchar | Tipo MIME do arquivo (ex: image/jpeg) |
| created_at | timestamp | Data de upload |

**Relacionamento**: `imagens.sinistro_id` → `sinistros.id`

**RLS**: Acesso aberto (policy: `true`)

### Storage Buckets

#### Bucket: `sinistros`
- **Tipo**: Público
- **Estrutura de pastas**: `{protocolo}/{timestamp}-{tipo}-{nome_arquivo}`
- **Tipos de imagens suportados**: JPEG, PNG, WEBP
- **Política de acesso**: Leitura pública, escrita autenticada

## 🛠️ Stack Tecnológica

### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite
- **Linguagem**: TypeScript
- **Styling**: Tailwind CSS com design tokens customizados
- **Componentes UI**: shadcn/ui (Radix UI primitives)
- **Roteamento**: React Router DOM 6.30.1
- **Formulários**: React Hook Form com validação Zod
- **Notificações**: Sonner
- **Ícones**: Lucide React

### Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth (frontend simples)
- **Client Library**: @supabase/supabase-js 2.86.0

### Gerenciamento de Estado
- **React Query**: @tanstack/react-query 5.83.0 (cache e sincronização de dados)
- **React Hooks**: useState, useEffect para estado local

## 📁 Estrutura de Diretórios

```
├── public/
│   ├── robots.txt
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui
│   │   ├── Dashboard.tsx    # Dashboard gerencial
│   │   ├── IncidentForm.tsx # Formulário de ocorrências
│   │   ├── LoginDialog.tsx  # Modal de login
│   │   ├── NavLink.tsx      # Componente de navegação
│   │   ├── PhotoGuide.tsx   # Guia de upload de fotos
│   │   └── ThemeToggle.tsx  # Alternador de tema
│   ├── pages/
│   │   ├── Index.tsx        # Página inicial (formulário)
│   │   ├── DashboardPage.tsx # Página do dashboard
│   │   └── NotFound.tsx     # Página 404
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Cliente Supabase (auto-gerado)
│   │       └── types.ts     # Tipos TypeScript (auto-gerado)
│   ├── hooks/               # Custom hooks
│   ├── lib/
│   │   └── utils.ts         # Utilitários
│   ├── index.css            # Estilos globais e design tokens
│   ├── main.tsx             # Entry point
│   └── App.tsx              # Componente raiz com rotas
├── supabase/
│   ├── config.toml          # Configuração Supabase
│   └── migrations/          # Migrações do banco de dados
├── tailwind.config.ts       # Configuração Tailwind
├── vite.config.ts           # Configuração Vite
└── tsconfig.json            # Configuração TypeScript
```

## 🎨 Design System

### Paleta de Cores (HSL)

#### Tema Claro
- **Primary**: `220 90% 30%` (Azul escuro profissional)
- **Secondary**: `220 20% 96%` (Cinza azulado muito claro)
- **Background**: `0 0% 100%` (Branco)
- **Foreground**: `220 20% 10%` (Quase preto azulado)

#### Tema Escuro
- **Primary**: `220 80% 60%` (Azul médio)
- **Secondary**: `220 15% 20%` (Cinza escuro azulado)
- **Background**: `0 0% 0%` (Preto)
- **Foreground**: `0 0% 95%` (Branco acinzentado)

### Animações
- `fade-in`: Entrada suave com opacidade e translação
- `scale-in`: Entrada com escala
- `rotate-guide`: Rotação contínua para guias de foto
- `pulse-soft`: Pulsação suave para elementos interativos

### Tipografia
- **Fonte**: Sistema (Apple-like): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
- **Escala**: Baseada em rem com variação de 0.75rem a 3rem

## 🚀 Como Executar

### Pré-requisitos
- Node.js 16+ e npm/bun instalados
- Conta Lovable (para desenvolvimento integrado)

### Instalação Local

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Entre no diretório
cd <NOME_DO_PROJETO>

# Instale as dependências
npm install
# ou
bun install

# Execute o servidor de desenvolvimento
npm run dev
# ou
bun dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Variáveis de Ambiente

O arquivo `.env` é gerenciado automaticamente pela integração Lovable Cloud e contém:

```
VITE_SUPABASE_URL=<url_do_projeto>
VITE_SUPABASE_PUBLISHABLE_KEY=<chave_publica>
VITE_SUPABASE_PROJECT_ID=<project_id>
```

**⚠️ IMPORTANTE**: Nunca edite o arquivo `.env` manualmente. Ele é atualizado automaticamente.

## 📦 Deploy

### Via Lovable (Recomendado)

1. Acesse o projeto no Lovable
2. Clique em "Publish" no canto superior direito (Desktop) ou inferior direito (Mobile)
3. Clique em "Update" para publicar as mudanças do frontend
4. Mudanças de backend (edge functions, migrações) são deployadas automaticamente

### Build Manual

```bash
# Gerar build de produção
npm run build

# Preview do build
npm run preview
```

Os arquivos gerados estarão em `/dist`

## 🔄 Fluxo de Dados

### Registro de Ocorrência

1. Usuário preenche o formulário na página inicial
2. Validação dos campos usando Zod schema
3. Verificação das 4 fotos obrigatórias
4. Geração do protocolo único
5. Inserção na tabela `sinistros`
6. Inserção das testemunhas (se houver) na tabela `testemunhas`
7. Upload das imagens para o bucket `sinistros`
8. Inserção dos metadados das imagens na tabela `imagens`
9. Exibição do protocolo para o usuário

### Visualização no Dashboard

1. Login com credenciais do gestor
2. Fetch de todas as ocorrências ordenadas por data
3. Cálculo de estatísticas em tempo real
4. Filtro dinâmico por busca
5. Ao clicar em uma ocorrência:
   - Fetch das testemunhas relacionadas
   - Fetch das imagens relacionadas
   - Exibição em modal com todos os detalhes

## 🔒 Segurança

### RLS (Row Level Security)
- Todas as tabelas possuem RLS habilitado
- Políticas configuradas para acesso público (formulário sem autenticação)
- Para ambientes de produção com dados sensíveis, recomenda-se revisar as políticas

### Autenticação
- Dashboard protegido por credenciais hardcoded
- Para produção, considere implementar:
  - Supabase Auth com usuários reais
  - Tokens JWT
  - Refresh tokens
  - Políticas RLS baseadas em `auth.uid()`

## 🧪 Validações

### Formulário de Ocorrência

```typescript
const incidentSchema = z.object({
  local_acidente: z.string().min(5, "O local precisa ter mais detalhes"),
  onibus: z.string().min(1, "Não esquece de colocar o número do ônibus"),
  motorista: z.string().min(3, "Coloca o nome completo do motorista"),
  chapa: z.string().optional(),
  responsabilidade: z.enum(["motorista", "terceiro"]),
  descricao: z.string().min(20, "Conta com mais detalhes o que rolou, mínimo 20 caracteres"),
});
```

### Upload de Imagens
- Tipos aceitos: `image/*`
- 4 fotos obrigatórias: frontal, lateral, danos, contexto
- Validação no submit antes do upload

## 📱 Responsividade

- **Formulário**: Otimizado principalmente para smartphones (mobile-first)
- **Dashboard**: Otimizado para laptop/desktop com layout de BI analítico
- Breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

## 🎭 Filosofia de Design

### Comunicação
- **Formulário**: Tom amigável, acolhedor e empático
- **Dashboard**: Profissional, objetivo e analítico

### Visual
- Inspiração Apple: Minimalismo, espaçamento generoso, tipografia clara
- Ícones de linha contínua discretos (Lucide React)
- Animações suaves e propositais
- Hierarquia visual bem definida

## 🔄 Roadmap de Melhorias Futuras

- [ ] Implementar autenticação real com Supabase Auth
- [ ] Sistema de notificações por email/SMS
- [ ] Exportação de relatórios em PDF
- [ ] Gráficos avançados e dashboards analíticos
- [ ] Sistema de status e workflow de ocorrências
- [ ] Integração com APIs de mapas para geolocalização
- [ ] App mobile nativo com React Native
- [ ] Sistema de comentários e atualizações em ocorrências
- [ ] Backup automático de dados
- [ ] Logs de auditoria

## 👥 Suporte e Contribuição

Para suporte ou contribuições:
1. Abra uma issue no repositório
2. Entre em contato com a equipe de desenvolvimento
3. Consulte a documentação do Lovable: https://docs.lovable.dev/

## 📄 Licença

Este projeto é proprietário e de uso restrito.

---

**Desenvolvido com ❤️ usando Lovable**
