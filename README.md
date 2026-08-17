# ⚡ EventSync — Multi-Tenant Event Management SaaS Blueprint

[![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Neon_DB-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth_&_Orgs-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**EventSync** is a production-ready, multi-tenant Event Management SaaS architecture built with the **Next.js 16 App Router**, **Clerk Authentication**, **NeonDB Serverless Postgres**, **Prisma ORM**, and **Tailwind CSS v4**.

It serves as an enterprise reference implementation demonstrating production-grade SaaS engineering patterns: database-authoritative RBAC, real-time Server-Sent Events (SSE), Svix HMAC webhook verification, hybrid Upstash Redis rate limiting, RFC 5545 iCalendar exports, and transactional email workflows.

---

## 📋 Table of Contents

- [✨ Key Features & Architectural Highlights](#-key-features--architectural-highlights)
- [🏛 System Architecture](#-system-architecture)
- [🗄️ Entity Relationship & Data Model](#️-entity-relationship--data-model)
- [🛠 Tech Stack](#-tech-stack)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [🔑 Environment Variables](#-environment-variables)
- [💻 Command Reference](#-command-reference)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [🛡️ Security & Multi-Tenancy Architecture](#️-security--multi-tenancy-architecture)
- [📂 Directory Structure](#-directory-structure)
- [📄 License](#-license)

---

## ✨ Key Features & Architectural Highlights

### 🏢 1. Database-Authoritative Multi-Tenant RBAC
* **Decoupled Identity & Authorization**: User identity is managed via Clerk, but organization roles (`ADMIN`, `MANAGER`, `MEMBER`) are stored directly in your PostgreSQL database.
* **Strict Tenant Isolation**: Every query and server action enforces `organizationId` scoping, eliminating cross-tenant data access (IDOR) risks.
* **Granular Role Guards**: Mutating Server Actions evaluate caller privileges with `requireRole(["ADMIN", "MANAGER"])` before executing database updates.

### ⚡ 2. Real-Time Server-Sent Events (SSE) Engine
* **Live Event Stream**: Non-blocking `/api/events/stream` endpoint streams event creation, edits, and RSVP updates to online organization members.
* **Zero Client Polling**: Saves network bandwidth and reduces database CPU utilization by replacing traditional polling with lightweight HTTP streaming.

### 🔒 3. Webhook Ingestion & Cryptographic Idempotency
* **Svix HMAC-SHA256 Verification**: Verifies incoming Clerk webhook signatures to block payload spoofing.
* **Replay Protection & Deduplication**: Rejects stale payloads (>5 min drift) and logs `svixId` in the `WebhookEvent` audit log for deduplication.
* **Admin Audit Interface**: Dedicated `/dashboard/admin/webhooks` view to inspect incoming webhook payloads, execution status, and failure tracebacks.

### 🛡️ 4. Hybrid Rate Limiting Infrastructure
* **Upstash Redis Integration**: Enforces sliding-window rate limits on public and mutating endpoints.
* **Graceful High-Availability Fallback**: Automatically degrades to an in-memory token bucket if Redis services become unavailable, preventing app downtime.

### 📅 5. Native RFC 5545 iCalendar (.ics) Engine
* **Universal Calendar Export**: Export individual events or entire organization schedules via `/api/events/export`.
* **Cross-Platform Compatibility**: Fully tested with Google Calendar, Apple Calendar, and Microsoft Outlook with zero third-party dependencies.

### 📩 6. Transactional Email Dispatch
* **Resend API Integration**: Automatically sends responsive HTML email notifications when new events are scheduled.
* **Safe Dev Environment Handling**: Silently logs email events in development when API keys are unconfigured, avoiding execution blockages.

### 📊 7. Interactive Analytics & Observability
* **Recharts Visualizations**: View monthly event creation velocity, day-of-week engagement breakdowns, and top event organizers.
* **Sentry Error Tracking**: Captures client, server, and edge runtime exceptions.

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser)"]
        UI["Next.js 16 App Router UI\n(Tailwind CSS v4 + base-ui)"]
        SSE_Client["SSE Live Stream Listener"]
    end

    subgraph Auth ["Authentication & Identity"]
        Clerk["Clerk Auth & Org Switcher"]
    end

    subgraph API ["Server Layer (Next.js 16)"]
        Middleware["Edge Middleware\n(Auth & Route Protection)"]
        ServerActions["Server Actions\n(Database-Authoritative RBAC)"]
        WebhookRoute["/api/webhooks/clerk\n(Svix HMAC Verification)"]
        SSERoute["/api/events/stream\n(Real-Time SSE Engine)"]
        ExportRoute["/api/events/export\n(RFC 5545 iCal Engine)"]
        RateLimiter["Hybrid Rate Limiter\n(Upstash Redis / In-Memory)"]
    end

    subgraph Database ["Data & External Services"]
        NeonDB[("NeonDB Serverless Postgres\n(Prisma 7 ORM)")]
        Resend["Resend API\n(Transactional Email)"]
        Sentry["Sentry\n(Error Monitoring)"]
    end

    UI --> Middleware
    Middleware --> Clerk
    UI --> ServerActions
    ServerActions --> RateLimiter
    ServerActions --> NeonDB
    ServerActions --> Resend
    Clerk -- "Webhooks" --> WebhookRoute
    WebhookRoute --> NeonDB
    SSE_Client <--> SSERoute
    SSERoute --> NeonDB
    UI --> ExportRoute
    ExportRoute --> NeonDB
    API -. "Errors" .-> Sentry
```

---

## 🗄️ Entity Relationship & Data Model

```mermaid
erDiagram
    User ||--o{ Membership : "holds"
    Organization ||--o{ Membership : "has"
    User ||--o{ Event : "creates"
    Organization ||--o{ Event : "owns"
    User ||--o{ Attendance : "submits"
    Event ||--o{ Attendance : "receives"
    Organization ||--o{ Attendance : "scopes"

    User {
        string id PK
        string clerkId UK
        string email UK
        string name
        string imageUrl
        datetime deletedAt
    }

    Organization {
        string id PK
        string clerkOrgId UK
        string name
        string imageUrl
        datetime deletedAt
    }

    Membership {
        string id PK
        string userId FK
        string organizationId FK
        Role role "ADMIN | MANAGER | MEMBER"
    }

    Event {
        string id PK
        string title
        string description
        string location
        datetime startTime
        datetime endTime
        string organizationId FK
        string createdById FK
    }

    Attendance {
        string id PK
        string eventId FK
        string userId FK
        string organizationId FK
        RsvpStatus status "GOING | MAYBE | NOT_GOING"
    }

    WebhookEvent {
        string id PK
        string svixId UK
        string eventType
        json payload
        string status
        string error
    }
```

---

## 🛠 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, React Server Components, Server Actions, React Compiler |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict type checking & end-to-end type safety |
| **Database** | [NeonDB](https://neon.tech/) | Serverless PostgreSQL with auto-scaling capabilities |
| **ORM** | [Prisma 7](https://www.prisma.io/) | `@prisma/adapter-pg` engine for high-performance serverless queries |
| **Authentication** | [Clerk](https://clerk.com/) | Multi-tenant organization switching, session security, & webhooks |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern utility-first CSS engine with dark mode theme switching |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) / `@base-ui/react` | Accessible, unstyled UI primitives & Lucide react icons |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) | `@upstash/ratelimit` with in-memory fallback for high availability |
| **Email Service** | [Resend](https://resend.com/) | Transactional HTML email delivery |
| **Testing** | [Vitest](https://vitest.dev/) / [Playwright](https://playwright.dev/) | Unit, integration, coverage reporting (`v8`), and E2E automation |
| **Monitoring** | [Sentry](https://sentry.io/) | Full-stack telemetry & exception tracking |

---

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed locally:
* **Node.js** 18.x or higher
* **npm** 9.x or higher
* A free [NeonDB PostgreSQL](https://neon.tech/) account
* A free [Clerk](https://clerk.com/) application with Organizations enabled

### Step 1: Clone the Repository

```bash
git clone https://github.com/DevPranavJad700/EventSync.git
cd EventSync
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Setup

Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

Configure your credentials in `.env`:
* Populate `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from your Clerk Dashboard.
* Populate `DATABASE_URL` and `DIRECT_URL` from your NeonDB project parameters.

### Step 4: Run Database Migrations

Generate Prisma Client and push schema to your Postgres instance:

```bash
npm run db:push
```

### Step 5: (Optional) Seed Demo Data

Populate the database with sample users, organizations, events, and attendances:

```bash
npm run seed
```

### Step 6: Launch Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🔑 Environment Variables

| Variable Name | Description | Required | Default / Example |
|---|---|:---:|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key | **Yes** | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk Secret Key | **Yes** | `sk_test_...` |
| `CLERK_WEBHOOK_SECRET` | Signing secret for Svix webhook verification | **Yes** | `whsec_...` |
| `DATABASE_URL` | NeonDB pooled connection string | **Yes** | `postgres://user:pass@ep-pooler.neon.tech/db?sslmode=require` |
| `DIRECT_URL` | Direct connection string for schema migrations | **Yes** | `postgres://user:pass@ep-direct.neon.tech/db?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | Application root URL | **Yes** | `http://localhost:3001` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (Rate Limiter) | Optional | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | Optional | `AXXX...` |
| `RESEND_API_KEY` | Resend API Key for transactional emails | Optional | `re_...` |
| `SENTRY_DSN` | Sentry Data Source Name for error monitoring | Optional | `https://...@sentry.io/...` |

---

## 💻 Command Reference

| Command | Purpose |
|---|---|
| `npm run dev` | Starts Next.js development server on port `3001` |
| `npm run build` | Generates Prisma client and builds production bundle |
| `npm run start` | Launches production build server |
| `npm run lint` | Runs ESLint analysis across codebase |
| `npm run typecheck` | Validates TypeScript types without compiling output |
| `npm test` | Runs unit & integration test suite using Vitest |
| `npm run test:e2e` | Runs Playwright end-to-end browser test suite |
| `npm run seed` | Seeds Postgres database with mock multi-tenant data |
| `npm run db:push` | Pushes Prisma schema modifications to Postgres |
| `npm run db:studio` | Opens interactive Prisma GUI database browser |

---

## 🧪 Testing & Quality Assurance

EventSync includes end-to-end testing coverage across unit, integration, and E2E layers.

```bash
# Run unit and integration tests
npm test

# Run tests with code coverage report
npx vitest run --coverage

# Run Playwright E2E browser tests
npm run test:e2e

# Run TypeScript type check
npm run typecheck
```

---

## 🛡️ Security & Multi-Tenancy Architecture

1. **Authorization Boundaries**: Roles are validated dynamically on each Server Action execution using caller identity decoded from Clerk session tokens verified against database `Membership` records.
2. **Database Scoping**: Queries must explicitly include `where: { organizationId }` clause. Soft-deletion checks (`deletedAt: null`) prevent deleted users or orgs from surfacing in queries.
3. **Webhook Security**: All webhooks delivered via Clerk are validated using Svix `Webhook.verify()` with raw headers (`svix-id`, `svix-timestamp`, `svix-signature`).
4. **XSS & Injection Protection**: Inputs validated via Zod schema validators before reaching handlers or database layers.

---

## 📂 Directory Structure

```
EventSync/
├── .github/              # GitHub Actions workflows & issue templates
├── e2e/                  # Playwright end-to-end test cases
├── prisma/
│   ├── schema.prisma     # Production database schema & model definitions
│   └── seed.ts           # Development database seeding script
├── src/
│   ├── app/
│   │   ├── (auth)/       # Sign-in / Sign-up authentication routes
│   │   ├── (dashboard)/  # Authenticated multi-tenant dashboard & views
│   │   │   ├── dashboard/
│   │   │   │   ├── admin/      # Webhook audit log interface
│   │   │   │   ├── analytics/  # Recharts reporting dashboard
│   │   │   │   ├── events/     # Event CRUD & iCal export
│   │   │   │   └── members/    # Team member & RBAC management
│   │   └── api/          # Webhooks, SSE stream, and iCal API routes
│   ├── components/
│   │   ├── events/       # Event forms, calendar components, RSVP cards
│   │   ├── layout/       # Navigation, sidebar, header, theme toggle
│   │   └── ui/           # Reusable UI component library (shadcn/base-ui)
│   ├── lib/              # Core business logic, RBAC guards, rate limiter, email engine
│   └── types/            # Application TypeScript definitions
├── vitest.config.ts      # Vitest configuration file
└── next.config.ts        # Next.js 16 compiler configuration
```

---

## 📄 License

Distributed under the **MIT License**. Free for commercial and non-commercial use, modification, and distribution. See [`LICENSE`](LICENSE) for details.

---

<p align="center">
  Built with ❤️ for modern SaaS developers using Next.js 16 & Serverless Postgres.
</p>
