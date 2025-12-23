![hero](https://assets.niceyup.com/decorative-strip.png)

<p align="center">
	<h1 align="center"><b>Niceyup</b></h1>
  <p align="center">
      Your AI-Powered Assistant for Work and Life
      <br />
      <br />
      <a href="https://niceyup.com">Website</a>
      ·
      <a href="https://github.com/niceyup/niceyup/issues">Issues</a>
    </p>
</p>

> **⚠️ Early Development** - Niceyup is currently in early development. Features may change, and some functionality may be incomplete. We're actively working on improvements and welcome feedback!

## About Niceyup

Niceyup is not just another chat tool — it was designed so humans and AI work together as true teammates. Create intelligent agents with knowledge sources, custom tools, and real-time collaboration.

The platform enables you to create AI agents that can access your knowledge sources, connect to databases, and have meaningful conversations with context and understanding. Whether you're building internal tools, customer support systems, or personal assistants, Niceyup provides the infrastructure to make AI truly useful in your workflow.

## Features

### 🤖 AI Agents

Create and configure powerful AI assistants with:
- Custom system messages and prompts
- Multiple language models (OpenAI, Anthropic, Google, and more via gateway)
- Configurable temperature, top-p, and reasoning effort
- Custom tools and function calling
- Embedding models for semantic understanding

### 📚 Knowledge Sources

Connect and ingest various knowledge sources:
- **Text Documents** - Upload PDFs, Word docs, markdown, and more
- **Question & Answer Pairs** - Structured Q&A knowledge bases
- **Database Connections** - Direct integration with:
  - PostgreSQL
  - MySQL
  - SQLite
  - And more via Python database clients
- **Automatic Ingestion** - Background processing with Trigger.dev
- **Schema Introspection** - Automatic database schema discovery

### 💬 Conversations

- Real-time chat interface with streaming responses
- Message regeneration and editing
- File attachments in conversations
- Conversation history and context
- Multi-user conversations
- Message status tracking

### 👥 Team Collaboration

- **Organizations** - Multi-tenant support
- **Teams** - Group agents and sources by team
- **Role-Based Access Control** - Fine-grained permissions
- **Invitations** - Team member management
- **Shared Resources** - Collaborate on agents and knowledge bases

### 🔍 Vector Search & RAG

- Semantic search across your knowledge base
- Automatic text chunking and embedding
- Hybrid search (vector + keyword)
- Source attribution in responses
- Retrieval-Augmented Generation (RAG)

### 🗄️ Database Querying

- AI-powered SQL query generation
- Natural language to SQL conversion
- Database schema understanding
- Query execution with safety checks
- Result visualization

### 💾 Memory & Context

- Conversation history persistence
- Context window management
- Agent memory across sessions
- Source-aware responses
- Metadata tracking

## Get started

### Prerequisites

- Node.js >= 22
- pnpm >= 10.4.1
- Docker and Docker Compose (for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/niceyup/niceyup.git
cd niceyup
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start local services (PostgreSQL and Redis):
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
cd packages/db
pnpm run db:push
```

6. Start the development servers:
```bash
pnpm dev
```

This will start:
- Web app at `http://localhost:3000`
- API server at `http://localhost:3333`

## App Architecture

Niceyup is built as a modern monorepo using **pnpm workspaces** and **Turborepo** for efficient builds and development. The architecture follows a clean separation of concerns with shared packages and independent applications.

### Frontend (`apps/web`)

- **Next.js 16** - React framework with App Router and Server Components
- **React 19** - Latest React with concurrent features
- **TypeScript 5** - Full type safety across the codebase
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/ui** - High-quality component library
- **TanStack Query** - Powerful data synchronization for React
- **Zustand** - Lightweight state management
- **Zod** - TypeScript-first schema validation
- **Lucide React** - Beautiful icon library
- **Turbopack** - Fast bundler for development

### Backend (`apps/api`)

- **Fastify 5** - Fast and low overhead web framework
- **TypeScript** - Type-safe backend development
- **Zod** - Runtime type validation with Fastify integration
- **Swagger/OpenAPI** - Auto-generated API documentation
- **Scalar** - Interactive API reference
- **WebSocket** - Real-time bidirectional communication
- **Redis** - Caching and session storage

### AI & ML Stack

- **Vercel AI SDK** - Unified interface for AI models
- **AI SDK Gateway** - Multi-provider AI gateway
- **OpenAI SDK** - Direct OpenAI integration
- **LangChain** - LLM application framework
- **Vector Store** - Semantic search and embeddings
- **Embeddings** - Text embedding generation for RAG
- **Streaming** - Real-time AI response streaming

### Database & ORM

- **PostgreSQL** - Primary relational database
- **Drizzle ORM** - TypeScript ORM with excellent DX
- **Drizzle Kit** - Database migrations and introspection
- **Neon** - Serverless Postgres hosting

### Storage

- **AWS S3** - Object storage for files and documents
- **S3 Presigned URLs** - Secure file upload/download
- **Multi-bucket** - Separate buckets for different file types

### Caching & Real-time

- **Redis (ioredis)** - In-memory data store for caching
- **WebSocket** - Real-time message streaming
- **Pub/Sub** - Event-driven architecture
- **Cache Layer** - Intelligent caching strategy

### Background Jobs

- **Trigger.dev** - Reliable background job processing
- **Python Integration** - Database operations and file processing
- **Task Scheduling** - Automated ingestion and processing
- **Job Queues** - Async task execution

### Authentication & Authorization

- **Better Auth** - Modern authentication library
- **OAuth** - GitHub social login
- **Email/Password** - Traditional authentication
- **Email Verification** - Secure account activation
- **Organizations & Teams** - Multi-tenant support
- **Role-Based Access Control** - Fine-grained permissions

### Packages (`packages/*`)

The monorepo includes several shared packages:

- **`@workspace/ai`** - AI model integration and utilities
- **`@workspace/auth`** - Authentication and authorization
- **`@workspace/billing`** - Payment processing integration
- **`@workspace/cache`** - Redis caching layer
- **`@workspace/db`** - Database schema and queries
- **`@workspace/email`** - Email templating and sending
- **`@workspace/engine`** - AI processing engine with Trigger.dev
- **`@workspace/env`** - Environment variable validation
- **`@workspace/realtime`** - WebSocket and real-time utilities
- **`@workspace/sdk`** - Auto-generated API client (Kubb)
- **`@workspace/storage`** - S3 file storage operations
- **`@workspace/ui`** - Shared UI components
- **`@workspace/utils`** - Common utilities
- **`@workspace/vector-store`** - Vector database operations
- **`@workspace/encryption`** - Data encryption utilities
- **`@workspace/notification`** - Notification system (Novu)

### Build Tools & DevOps

- **Turborepo** - Monorepo build system
- **pnpm** - Fast, disk space efficient package manager
- **Biome** - Fast formatter and linter
- **TypeScript** - Static type checking
- **Docker** - Containerization
- **Docker Compose** - Local development environment

### Hosting & Infrastructure

- **Vercel** - Frontend hosting and edge functions
- **Railway** - Backend API hosting
- **Neon** - Serverless PostgreSQL database
- **Upstash** - Serverless Redis and Vector Store
- **Cloudflare R2** - File storage

### Third-Party Services

- **Trigger.dev** - Background job processing
- **Resend** - Transactional and marketing emails
- **Polar** - Payment processing and subscriptions
- **Novu** - Multi-channel notifications
- **GitHub Actions** - CI/CD pipeline
- **GitHub OAuth** - Social authentication

### Development Experience

- **Hot Module Replacement** - Fast development iteration
- **Type Safety** - End-to-end TypeScript
- **Auto-generated SDK** - Type-safe API client from OpenAPI
- **API Documentation** - Interactive Swagger docs
- **Database Studio** - Drizzle Studio for DB management

## License

This project is licensed under the **[AGPL-3.0](https://opensource.org/licenses/AGPL-3.0)** for non-commercial use. 

### Commercial Use

For commercial use or deployments requiring a setup fee, please contact us
for a commercial license at [hello@niceyup.team](mailto:hello@niceyup.team).

By using this software, you agree to the terms of the license.