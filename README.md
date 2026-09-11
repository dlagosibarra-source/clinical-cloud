# Clinical Cloud

Multi-tenant SaaS platform for dental clinics.

## Overview

Clinical Cloud provides operational workflow management for dental clinics including:
- Organization and user management
- Patient management
- Appointment scheduling with conflict protection
- Dentist availability management
- Waitlist and cancelled-slot recovery
- WhatsApp communication
- Conversational AI (DeepSeek)
- Operational dashboard
- Audit logging

## Architecture

**Modular monolith** — clear module boundaries without microservice complexity.

See [Architecture Decisions](docs/architecture.md) for detailed ADRs.

## Tech Stack

| Layer          | Technology                        |
| -------------- | --------------------------------- |
| Frontend       | Next.js, TypeScript, Tailwind CSS |
| UI Components  | shadcn/ui                         |
| Backend        | AWS Lambda, Node.js, TypeScript   |
| Database       | PostgreSQL (Amazon RDS)           |
| Auth           | Amazon Cognito, JWT               |
| Messaging      | Amazon SQS, EventBridge           |
| Communication  | Meta WhatsApp Cloud API           |
| AI             | DeepSeek                          |
| Infrastructure | AWS, Terraform                    |
| Observability  | Amazon CloudWatch                 |

## Project Structure

```
src/
├── app/                  # Next.js App Router (pages, layouts, routes)
├── modules/              # Domain modules (modular monolith)
│   ├── organizations/    # Multi-tenant org management
│   ├── users/            # User accounts and roles
│   ├── patients/         # Patient contact information
│   ├── services/         # Dental service catalog
│   └── appointments/     # Appointment lifecycle
├── shared/               # Cross-cutting concerns
│   ├── auth/             # Authentication utilities
│   ├── database/         # Database connection and migrations
│   ├── errors/           # Custom error classes
│   ├── middleware/       # Request middleware
│   ├── types/            # Shared types and constants
│   ├── utils/            # General utilities
│   └── validation/       # Shared validation schemas
├── infrastructure/       # External service adapters
│   ├── aws/              # AWS SDK clients
│   ├── whatsapp/         # WhatsApp Cloud API adapter
│   └── ai/               # AI provider adapters
├── components/           # React UI components
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Reusable form components
│   └── layout/           # Layout components
└── lib/                  # Frontend utilities
```

Additional modules (dentists, locations, resources, availability, waitlist, recovery, whatsapp, ai, audit, dashboard, jobs) will be added incrementally in later phases.

## Development

### Prerequisites

- Node.js 20.x
- npm 10.x

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

### Environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

## Git Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add patient domain model
fix: prevent overlapping appointments
docs: update architecture decisions
chore: update dependencies
refactor: extract validation logic
test: add appointment conflict tests
```

### Branch Strategy

- `main` — production-ready
- `develop` — integration branch
- `feature/*` — new features
- `fix/*` — bug fixes

## Development Phases

1. ✅ **Repository** — Next.js, TypeScript, ESLint, project structure
2. ⬜ **Core Domain** — organizations, users, patients, dentists, locations, resources, services
3. ⬜ **Appointments** — creation, validation, conflict protection, events, availability
4. ⬜ **Waitlist & Recovery** — waitlist, recovery offers, deterministic matching
5. ⬜ **AWS Backend** — API Gateway, Lambda, RDS, Cognito, Secrets Manager
6. ⬜ **WhatsApp** — Meta integration, webhooks, messages, templates
7. ⬜ **DeepSeek** — AI service, prompts, tools, structured output
8. ⬜ **Async Processing** — SQS, EventBridge, Lambda workers
9. ⬜ **Dashboard** — operational KPIs, recovery metrics
10. ⬜ **DevOps** — Docker, Terraform, CI/CD, observability
11. ⬜ **Production Hardening** — security review, monitoring, backups

## License

Proprietary. All rights reserved.
