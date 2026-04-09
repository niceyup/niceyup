![hero](https://assets.niceyup.com/decorative-strip.png)

<p align="center">
	<h1 align="center"><b>Niceyup</b></h1>
  <p align="center">
      Build production-ready AI agents with knowledge, tools, and real-time collaboration.
      <br />
      <br />
      <a href="https://niceyup.com">Website</a>
      ·
      <a href="https://github.com/niceyup/niceyup/issues">Issues</a>
    </p>
</p>

> **⚠️ Early Development** - Niceyup is currently in early development. Features may change, and some functionality may be incomplete. We're actively working on improvements and welcome feedback!

## About Niceyup

Niceyup is an AI agent platform built for teams that want reliable, production-ready assistants, not just chatbots. It combines agent behavior controls, model and embedding configuration, tool integrations, and knowledge retrieval in one collaborative workspace.

With Niceyup, you can connect documents, Q&A data, databases, and external MCP tools, then run real-time conversations with grounded responses and source attribution. From internal copilots to support and operations workflows, it gives you the infrastructure to build, govern, and scale useful AI teammates.

## Features

### 🤖 AI Agents

Build production-ready AI agents with:

- Behavior and instruction controls (system prompts and response style)
- Multi-model support (OpenAI, Anthropic, Google, OpenAI-compatible, and gateway providers)
- Fully customizable model parameters (temperature, top-p, reasoning effort, and more)
- Tool use and function calling (native and external capabilities)
- Embedding model configuration (for retrieval quality and grounding)

### 💬 Conversations

- Real-time chat experience (streaming responses and responsive message updates)
- Conversation controls (regenerate, resend, and stop message generation)
- File attachments in chat (context-aware conversations with uploaded files)
- Persistent history (conversation context across sessions)
- Shared workspace usage (collaborative, team-based conversations)

### ⚙️ Agent Configuration

- Behavior configuration (instructions, guardrails, and response direction)
- Model and embedding tuning (quality, latency, and cost balancing)
- Knowledge retrieval controls (top-k, indexing, and search strategy)
- Tool and integration enablement (MCP, providers, and runtime capabilities)

### 📚 Data Sources

Connect and ingest various data sources:

- **Text Documents** - Upload PDFs, Word docs, markdown, and more
- **Question & Answer Pairs** - Structured Q&A entries for targeted answers
- **Source Explorer** - Organize sources and folders at the team level
- **Automatic Ingestion** - Background processing powered by Trigger.dev

### 📚 Knowledge Base

- Agent-level knowledge base configuration (per-agent retrieval behavior)
- Automatic chunking and embedding pipeline (optimized for semantic retrieval)
- Source attribution in responses (grounded answers with references)
- Retrieval-Augmented Generation (RAG) for higher answer quality
- Reindex workflows (refresh indexed data as sources evolve)

### 🔌 Integrations & MCP

- Connect any MCP server (bring your own tools and capabilities)
- Integrate model providers (including OpenAI-compatible endpoints)
- Connect vector store providers (currently Upstash)
- Centralized integration management (providers, MCP servers, and connections)

### 👥 Team Collaboration

- **Organizations** - Multi-tenant workspaces with isolated data
- **Teams** - Group agents, sources, and workflows by team
- **Role-Based Access Control** - Fine-grained permissions and governance
- **Invitations** - Invite, assign, and manage members
- **Shared Resources** - Collaborate on agents and knowledge bases

## Get started
 
We are working on the documentation to get started with Niceyup for local development: https://docs.niceyup.com/local-development

## App Architecture
 
- Monorepo
- pnpm + Turborepo
- React
- TypeScript
- Next.js 16
- Fastify 5
- Drizzle ORM
- PostgreSQL
- Shadcn/ui
- TailwindCSS
- Vercel AI SDK
- LangChain
- Better Auth
 
### Hosting
 
- Vercel (Web)
- Railway (API)
- Neon (Database)
- Upstash (Redis)
- Cloudflare R2 (Storage)
 
### Services
 
- Trigger.dev (Background jobs)
- Resend (Transactional & Marketing)
- GitHub Actions (CI/CD)
- GitHub OAuth (Social authentication)
- Polar (Payment processing)
- Novu (Multi-channel notifications)
- OpenAI (AI models)
- Anthropic (AI models)
- Google (AI models)

## License

This project is licensed under the **[AGPL-3.0](https://opensource.org/licenses/AGPL-3.0)** for non-commercial use. 

### Commercial Use

For commercial use or deployments requiring a setup fee, please contact us
for a commercial license at [hello@niceyup.team](mailto:hello@niceyup.team).

By using this software, you agree to the terms of the license.