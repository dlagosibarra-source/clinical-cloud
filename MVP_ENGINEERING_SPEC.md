# Clinical Cloud — MVP Engineering Specification

> This file is the source of truth for the project architecture.
> All implementation decisions must be consistent with this specification.
> See the user's original prompt for the complete specification content.

**Version:** 1.0
**Status:** Architecture baseline / ready for incremental implementation

---

> **NOTE:** The complete specification is maintained in the project's conversation history.
> This file serves as a reference marker. The full 50-section specification covers:
>
> 1. Product Definition
> 2. Product Scope
> 3. Explicitly Out of Scope
> 4. Architecture (modular monolith)
> 5. Technology Stack (Next.js, Lambda, PostgreSQL, Cognito)
> 6. Multi-Tenancy (RLS, organization_id isolation)
> 7. Authentication and Authorization (Cognito → JWT → RBAC)
> 8. Database Design (UUID PKs, UTC timestamps, constraints)
> 9–15. Domain entities (organizations, users, dentists, locations, resources, services, patients)
> 16. Appointments (conflict protection, snapshots, status lifecycle)
> 17. Availability (recurring schedules, blocks)
> 18. Waitlist (deterministic matching)
> 19. Recovery Offers (atomic acceptance)
> 20. Appointment Events (append-only)
> 21–25. WhatsApp (conversations, messages, templates, integrations)
> 26–31. AI Architecture (DeepSeek, tools, prompts, context, interactions)
> 32. Audit Logs (append-only)
> 33. Background Jobs (idempotent, retryable)
> 34. Recovery Engine (deterministic)
> 35. Dashboard (SQL views, no metrics table)
> 36. Billing (future, no card storage)
> 37. AWS Target Architecture
> 38. Infrastructure as Code (Terraform)
> 39. Security (first-class requirement)
> 40. Scaling Strategy (design for scale, implement for current size)
> 41. Docker
> 42. Git Strategy (conventional commits)
> 43. Testing (unit, integration, E2E, RLS tests)
> 44. Seed Data
> 45. Development Phases (1–11)
> 46. First Vertical Slice
> 47. Agent Rules
> 48. Current Implementation Rule (incremental)
> 49. Definition of Done
> 50. Product Philosophy
