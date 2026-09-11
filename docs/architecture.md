# Clinical Cloud — Architecture Decisions

## Overview

Clinical Cloud is a multi-tenant SaaS platform for dental clinics.

This document records key architectural decisions for the project.

---

## ADR-001: Modular Monolith

**Status:** Accepted

**Context:** The MVP requires multiple domain modules (organizations, users, patients, appointments, etc.) with clear boundaries but without the operational complexity of microservices.

**Decision:** Use a modular monolith architecture with:
- Clear module boundaries under `src/modules/`
- Each module owns its domain, services, repositories, and types
- Modules communicate through typed interfaces, not direct internal imports
- A single deployment unit

**Consequences:**
- Simpler deployment, testing, and debugging
- Modules can be extracted to services later if scale justifies it
- Requires discipline to maintain module boundaries

---

## ADR-002: PostgreSQL as Source of Truth

**Status:** Accepted

**Context:** The domain requires relational integrity, transactions, joins, constraints, appointment conflict protection, and multi-tenant relationships.

**Decision:** Use PostgreSQL (Amazon RDS) as the single source of truth. Do NOT replace with DynamoDB.

**Consequences:**
- Full ACID transactions
- Row Level Security for tenant isolation
- Exclusion constraints for appointment overlap protection
- Familiar SQL tooling and ecosystem

---

## ADR-003: Multi-Tenancy via Row Level Security

**Status:** Accepted

**Context:** All business data must be isolated per organization (tenant). The system must prevent cross-tenant data access at multiple layers.

**Decision:** Implement tenant isolation at four layers:
1. Authentication (Cognito)
2. Authorization (role-based)
3. Application logic (organization resolution)
4. Database (PostgreSQL Row Level Security)

**Consequences:**
- Defense-in-depth tenant isolation
- RLS policies must be tested explicitly
- Every business table must include `organization_id`
- The application must never trust client-supplied organization IDs

---

## ADR-004: AWS Lambda + API Gateway

**Status:** Accepted

**Context:** The backend needs a scalable, cost-effective compute layer without managing servers.

**Decision:** Use AWS Lambda behind API Gateway for the backend API. Next.js handles the frontend.

**Consequences:**
- Pay-per-use pricing
- Automatic horizontal scaling
- Cold start latency (acceptable for this use case)
- Stateless request handling

---

## ADR-005: AI Abstraction Layer

**Status:** Accepted

**Context:** The system integrates DeepSeek for conversational AI. The AI provider may change in the future.

**Decision:** Abstract AI behind an `AIService` interface. AI must never:
- Execute SQL directly
- Access the database
- Bypass authorization
- Choose recovery winners
- Modify data without validated tools

**Consequences:**
- Provider-agnostic AI integration
- All AI tool calls go through schema validation → auth → business logic → repository
- AI interactions are logged and auditable

---

## ADR-006: Communication Service Abstraction

**Status:** Accepted

**Context:** WhatsApp is the first communication channel. Instagram and Facebook Messenger may follow.

**Decision:** Abstract communication behind a `CommunicationService` with provider-specific adapters.

**Consequences:**
- New channels can be added without restructuring
- WhatsApp-specific logic stays in the adapter
- Core business logic remains channel-agnostic
