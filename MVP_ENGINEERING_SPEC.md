# Clinical Cloud

## SaaS Dental MVP — Agenda + WhatsApp + DeepSeek + Recovery Engine

**Version:** 1.0
**Status:** Architecture baseline / ready for incremental implementation

---

# 1. Product Definition

Clinical Cloud is a multi-tenant SaaS platform for dental clinics.

The initial MVP focuses exclusively on operational workflows:

* organizations
* users
* dentists
* locations
* resources
* services
* patients
* appointments
* availability
* waitlists
* recovery of cancelled appointment slots
* WhatsApp communication
* conversational AI through DeepSeek
* operational dashboard
* auditability
* background jobs

The product must prioritize:

1. correctness
2. security
3. traceability
4. simplicity
5. maintainability
6. performance

General engineering principle:

> **Design for scale, implement for the current size.**

The system must be capable of evolving toward larger workloads without introducing premature complexity or microservices.

---

# 2. Product Scope

## 2.1 In Scope

The MVP includes:

* multi-tenancy
* organization management
* user management
* role-based authorization
* dentist management
* location management
* resource management
* service management
* patient management
* appointment management
* dentist availability
* availability blocks
* waitlists
* cancelled-slot recovery
* WhatsApp integration
* conversational AI
* audit logs
* background jobs
* operational dashboard
* observability
* automated testing
* Docker
* CI/CD
* AWS infrastructure
* Terraform infrastructure as code

---

# 3. Explicitly Out of Scope

The MVP must NOT implement:

* clinical history
* odontogram
* periodontogram
* DICOM
* radiology management
* laboratory information system
* inventory
* payroll
* accounting
* CFDI
* telemedicine
* ERP
* electronic medical records
* clinical decision support
* medical diagnosis
* payment-card storage

These may be considered future products/modules but are not part of this MVP.

---

# 4. Architecture

## 4.1 Initial Architecture

Use a **modular monolith**.

Do NOT create microservices.

The initial system should be easy to understand, test, deploy and operate.

The architecture must nevertheless maintain clear boundaries between:

* presentation
* API
* application services
* domain/business logic
* repositories
* integrations
* infrastructure

---

# 5. Target Technology Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui where useful

## Backend

Target architecture:

* Amazon API Gateway
* AWS Lambda
* Node.js
* TypeScript

## Database

* PostgreSQL
* Amazon RDS for PostgreSQL

PostgreSQL is the source of truth.

Do NOT replace PostgreSQL with DynamoDB merely because AWS provides DynamoDB.

The domain requires:

* relational integrity
* transactions
* joins
* constraints
* appointment conflict protection
* multi-tenant relationships
* deterministic business rules

Aurora PostgreSQL may be considered later if scale justifies it.

## Authentication

Target:

* Amazon Cognito
* JWT
* API authorization

Cognito `sub` is the stable external identity.

Email must NOT be treated as the immutable identity.

## Infrastructure

* AWS
* Terraform

## Async Processing

Target:

* Amazon SQS
* AWS Lambda
* Amazon EventBridge

## Secrets

Target:

* AWS Secrets Manager

Never store secrets in source code or PostgreSQL.

## Observability

Target:

* Amazon CloudWatch
* structured logs
* metrics
* alarms
* tracing when justified

---

# 6. Multi-Tenancy

Clinical Cloud is multi-tenant.

Business entities must contain:

`organization_id`

Tenant isolation must exist at multiple layers:

1. authentication
2. authorization
3. application business logic
4. PostgreSQL Row Level Security

All business tables must be designed with tenant isolation in mind.

Do NOT disable RLS as a shortcut.

---

# 7. Authentication and Authorization

Target flow:

Next.js

→ Amazon Cognito

→ JWT

→ API Gateway

→ Lambda

→ authenticated user

→ organization resolution

→ role authorization

→ PostgreSQL

→ RLS

The application must never trust an organization ID supplied blindly by the client.

The backend must resolve the organization from authenticated context.

Initial roles:

* OWNER
* ADMIN
* DENTIST
* RECEPTIONIST
* STAFF

Initial authorization may use coarse RBAC.

More granular permissions can be added later.

---

# 8. Database Design

The database is relational and PostgreSQL-first.

Use:

* UUID primary keys
* `gen_random_uuid()`
* UTC timestamps
* appropriate foreign keys
* check constraints
* unique constraints
* indexes
* transactions
* PostgreSQL functions where justified
* Row Level Security

Avoid physical deletion of important business records unless explicitly justified.

Prefer statuses and auditability.

---

# 9. Organizations

Table:

`organizations`

Fields:

* organization_id UUID PK
* name
* legal_name
* slug UNIQUE
* email
* phone
* country_code
* timezone
* currency
* status
* created_at
* updated_at

Statuses:

* TRIAL
* ACTIVE
* SUSPENDED
* CANCELLED

Rules:

* slug unique
* timestamps stored in UTC
* timezone stored explicitly
* no passwords
* no payment credentials
* no secrets
* no clinical data

---

# 10. Users

Table:

`users`

Fields:

* user_id UUID PK
* organization_id FK
* email
* first_name
* last_name
* role
* status
* phone
* last_login_at
* created_at
* updated_at

Statuses:

* INVITED
* ACTIVE
* SUSPENDED
* DEACTIVATED

Roles:

* OWNER
* ADMIN
* DENTIST
* RECEPTIONIST
* STAFF

Constraint:

`UNIQUE (organization_id, email)`

Passwords are handled by the authentication provider.

---

# 11. Dentists

Table:

`dentists`

Fields:

* dentist_id
* organization_id
* user_id nullable
* first_name
* last_name
* professional_name
* license_number
* specialty
* phone
* email
* status
* created_at
* updated_at

Statuses:

* ACTIVE
* INACTIVE
* SUSPENDED

A dentist belongs to one organization.

Future evolution may support many-to-many dentist/location relationships.

---

# 12. Locations

Table:

`locations`

Fields:

* location_id
* organization_id
* name
* code
* description
* phone
* email
* address
* city
* state
* postal_code
* country_code
* timezone
* status
* created_at
* updated_at

Constraint:

`UNIQUE (organization_id, code)`

Statuses:

* ACTIVE
* INACTIVE

---

# 13. Resources

Resources represent operational assets such as dental chairs or rooms.

Table:

`resources`

Fields:

* resource_id
* organization_id
* location_id
* name
* code
* resource_type
* description
* status
* created_at
* updated_at

Resource types:

* CHAIR
* ROOM
* EQUIPMENT
* OTHER

Statuses:

* ACTIVE
* INACTIVE
* MAINTENANCE

Constraint:

`UNIQUE (organization_id, code)`

---

# 14. Services

Table:

`services`

Fields:

* service_id
* organization_id
* name
* description
* duration_minutes
* price
* currency
* status
* created_at
* updated_at

Constraints:

* duration_minutes > 0
* price >= 0
* currency uses ISO 4217
* `UNIQUE (organization_id, name)`

Statuses:

* ACTIVE
* INACTIVE

Appointments must store snapshots of service information so historical appointments remain understandable if a service later changes.

---

# 15. Patients

Table:

`patients`

Fields:

* patient_id
* organization_id
* first_name
* last_name
* phone
* email
* date_of_birth
* gender
* whatsapp_opt_in
* whatsapp_opt_in_at
* whatsapp_opt_out_at
* status
* created_at
* updated_at

Phone must use E.164 format.

Do NOT make phone globally unique because family/shared numbers are possible.

Patients in this MVP contain operational contact information only.

Do NOT introduce clinical history.

Statuses:

* ACTIVE
* INACTIVE

Patient operations:

* create
* search
* retrieve
* update
* deactivate
* WhatsApp opt-in
* WhatsApp opt-out

Search must support efficient lookup by:

* name
* phone

---

# 16. Appointments

Table:

`appointments`

Fields:

* appointment_id
* organization_id
* patient_id
* dentist_id
* location_id
* resource_id nullable
* service_id
* start_at
* end_at
* status
* notes
* created_by_user_id
* service_name_snapshot
* service_duration_snapshot
* service_value_snapshot
* created_at
* updated_at

Statuses:

* SCHEDULED
* CONFIRMED
* CANCELLED
* COMPLETED
* NO_SHOW
* RESCHEDULED

Rules:

* end_at > start_at
* all related entities must belong to the same organization
* timestamps stored in UTC
* application validation is required
* transaction protection is required
* database-level conflict protection should be used where practical

Double booking must be protected at:

1. application level
2. transaction level
3. database level where practical

PostgreSQL exclusion/range constraints may be used to protect overlapping appointments.

Appointment creation must occur through backend business logic.

Do not allow arbitrary client-side inserts.

---

# 17. Availability

Do NOT create an unnecessarily complicated generic availability engine.

Use two core tables.

## dentist_availability

Fields:

* availability_id
* organization_id
* dentist_id
* location_id
* day_of_week
* start_time
* end_time
* status
* created_at
* updated_at

## availability_blocks

Fields:

* block_id
* organization_id
* dentist_id
* location_id
* resource_id nullable
* start_at
* end_at
* reason
* status
* created_by_user_id
* created_at
* updated_at

Availability is calculated from:

recurring schedule

*

blocks

*

existing appointments

*

resource availability

---

# 18. Waitlist

Table:

`waitlist`

Fields:

* waitlist_id
* organization_id
* patient_id
* service_id
* dentist_id nullable
* location_id nullable
* preferred date range
* preferred time range
* priority
* status
* created_at
* updated_at

Statuses:

* WAITING
* OFFERED
* ACCEPTED
* EXPIRED
* CANCELLED
* FULFILLED

Matching must be deterministic.

AI must NOT select the winner.

---

# 19. Recovery Offers

Table:

`recovery_offers`

Fields:

* offer_id
* organization_id
* waitlist_id
* appointment_id
* patient_id
* status
* offered_at
* expires_at
* responded_at
* created_at
* updated_at

Statuses:

* PENDING
* ACCEPTED
* DECLINED
* EXPIRED
* CANCELLED

Acceptance must use an atomic transaction so two patients cannot successfully claim the same appointment slot.

---

# 20. Appointment Events

Table:

`appointment_events`

Append-only event history.

Fields:

* event_id
* organization_id
* appointment_id
* event_type
* actor_type
* actor_user_id nullable
* source
* metadata JSONB
* created_at

Event types:

* CREATED
* CONFIRMED
* CANCELLED
* RESCHEDULED
* COMPLETED
* NO_SHOW
* RECOVERY_TRIGGERED
* RECOVERY_OFFERED
* RECOVERY_ACCEPTED
* RECOVERY_DECLINED

Actor types:

* USER
* SYSTEM
* AI
* PATIENT
* INTEGRATION

Sources:

* WEB
* MOBILE
* WHATSAPP
* API
* SYSTEM
* ADMIN

This table is append-only.

---

# 21. WhatsApp

WhatsApp is the first external communication channel.

Provider:

Meta WhatsApp Cloud API.

The architecture must keep communication providers behind an adapter/service boundary so additional channels can be added later.

Future channels:

* Instagram Messaging
* Facebook Messenger

The system should therefore conceptually support:

CommunicationService

with provider-specific adapters.

Do NOT implement Instagram or Facebook yet.

---

# 22. WhatsApp Conversations

Table:

`whatsapp_conversations`

Fields:

* conversation_id
* organization_id
* patient_id
* phone
* status
* last_message_at
* last_inbound_at
* last_outbound_at
* created_at
* updated_at

Statuses:

* OPEN
* CLOSED

Multiple historical conversations may exist.

Do not require every conversation to be linked to an appointment.

---

# 23. WhatsApp Messages

Table:

`whatsapp_messages`

Fields:

* message_id
* organization_id
* conversation_id
* patient_id
* provider_message_id
* direction
* type
* body
* media_reference
* status
* provider_timestamp
* error_code
* error_message
* metadata JSONB
* created_at
* updated_at

Directions:

* INBOUND
* OUTBOUND

Types:

* TEXT
* IMAGE
* AUDIO
* DOCUMENT
* VIDEO
* LOCATION
* OTHER

Statuses:

* RECEIVED
* SENT
* DELIVERED
* READ
* FAILED

Provider message ID must be idempotent.

Binary media must NOT be stored directly in PostgreSQL.

Webhook flow:

1. verify signature
2. validate payload
3. deduplicate provider message ID
4. persist message
5. resolve organization/patient/conversation
6. process message
7. invoke AI when appropriate

---

# 24. WhatsApp Templates

Table:

`whatsapp_templates`

Fields:

* template_id
* organization_id
* name
* provider_template_name
* language_code
* category
* body
* variables_schema JSONB
* status
* provider_template_id
* created_at
* updated_at

Categories:

* UTILITY
* MARKETING
* AUTHENTICATION

Statuses:

* DRAFT
* PENDING
* APPROVED
* REJECTED
* DISABLED

Only approved and enabled templates may be used for applicable outbound messages.

---

# 25. WhatsApp Integrations

Table:

`whatsapp_integrations`

Fields:

* integration_id
* organization_id
* provider
* phone_number
* phone_number_id
* business_account_id
* display_name
* secret_reference
* status
* webhook_verified
* last_webhook_at
* last_error
* created_at
* updated_at

Provider:

* META_WHATSAPP

Statuses:

* PENDING
* ACTIVE
* DISCONNECTED
* ERROR
* DISABLED

Secrets are stored in AWS Secrets Manager.

PostgreSQL stores only a reference to the secret.

WhatsApp failures must NOT roll back core appointment transactions.

---

# 26. AI Architecture

AI provider:

DeepSeek.

The AI layer must be abstracted behind:

`AIService`

The system must not couple core business logic directly to DeepSeek.

Future providers can be added.

AI output must be structured and validated.

Use Zod or equivalent schema validation.

The AI must never:

* execute SQL directly
* access PostgreSQL directly
* bypass authorization
* modify business data without validated tools
* choose recovery winners
* bypass business rules

---

# 27. AI Integrations

Table:

`ai_integrations`

Fields:

* integration_id
* organization_id
* provider
* model
* secret_reference
* status
* temperature
* max_tokens
* created_at
* updated_at

Provider initially:

* DEEPSEEK

---

# 28. AI Prompt Versions

Table:

`ai_prompt_versions`

Fields:

* prompt_id
* organization_id
* name
* version
* system_prompt
* status
* created_at
* updated_at

Statuses:

* DRAFT
* ACTIVE
* ARCHIVED

Prompts must be versioned.

---

# 29. AI Tools

Table:

`ai_tools`

Fields:

* tool_id
* organization_id
* name
* description
* tool_type
* parameters_schema
* status
* requires_confirmation
* created_at
* updated_at

Tool types:

* READ
* WRITE

Initial conceptual tools:

* get_patient
* create_patient
* update_patient
* list_services
* get_service
* search_slots
* create_appointment
* get_appointment
* confirm_appointment
* cancel_appointment
* reschedule_appointment
* add_to_waitlist
* get_recovery_offer
* accept_recovery_offer
* escalate_to_human

Every tool must pass through:

AI tool call

→ schema validation

→ authentication

→ authorization

→ business logic

→ repository

→ database

AI does not directly access repositories or SQL.

---

# 30. AI Conversation Context

Table:

`ai_conversation_context`

Fields:

* context_id
* organization_id
* conversation_id
* summary
* current_intent
* intent_status
* context_data JSONB
* last_processed_message_id
* last_ai_request_at
* context_version
* created_at
* updated_at

Intent statuses:

* NONE
* ACTIVE
* WAITING_FOR_USER
* COMPLETED
* CANCELLED
* ESCALATED

Full message history remains in `whatsapp_messages`.

This table stores mutable operational context.

---

# 31. AI Interactions

Table:

`ai_interactions`

Fields:

* interaction_id
* organization_id
* conversation_id
* trigger_message_id
* provider
* model
* prompt_id
* tool_name
* request_payload
* response_payload
* input_tokens
* output_tokens
* latency_ms
* status
* error_message
* result_type
* created_at
* updated_at

Statuses:

* PENDING
* SUCCESS
* FAILED
* TIMEOUT
* CANCELLED

Avoid unnecessary storage of sensitive content.

---

# 32. Audit Logs

Table:

`audit_logs`

Append-only.

Fields:

* audit_log_id
* organization_id
* actor_type
* actor_user_id nullable
* source
* action
* entity_type
* entity_id
* old_values JSONB
* new_values JSONB
* metadata JSONB
* request_id
* created_at

Important operations must be auditable:

* create
* update
* cancel
* confirm
* reschedule
* recovery
* AI action
* escalation
* integration changes

---

# 33. Background Jobs

Tables:

`jobs`

and

`job_executions`

Jobs must support:

* idempotency
* attempts
* retries
* status
* timestamps
* error information

Future AWS architecture:

EventBridge

→ SQS

→ Lambda worker

Initial jobs may include:

* appointment reminders
* expired waitlist offers
* expired recovery offers
* no-show processing
* recovery processing

---

# 34. Recovery Engine

The Recovery Engine is deterministic.

When an appointment is cancelled:

1. create appointment cancellation event;
2. identify the newly available slot;
3. find eligible waitlist candidates;
4. calculate deterministic eligibility;
5. create recovery offers;
6. notify through the communication layer;
7. process acceptance;
8. atomically reserve the appointment.

Candidate matching may consider:

* organization
* location
* service
* duration
* dentist
* preferred date
* preferred time
* waitlist age
* priority

AI may assist with communication.

AI must NOT determine the winner.

---

# 35. Dashboard

Do NOT create a metrics table for basic operational KPIs.

Use SQL views and aggregations over transactional data.

Initial KPIs:

* appointments
* confirmed appointments
* cancellations
* no-shows
* recovered appointments
* confirmation rate
* recovery rate
* estimated recovered value

Infrastructure metrics remain in CloudWatch.

---

# 36. Billing

Billing is a future module.

The application must never store:

* card numbers
* CVV
* expiration data

A payment provider will handle payment details.

Future conceptual entities:

* plans
* billing_accounts
* subscriptions

Future billing structure:

`billing_accounts`

* billing_account_id
* organization_id
* provider
* provider_customer_id
* status
* created_at
* updated_at

`subscriptions`

* subscription_id
* organization_id
* billing_account_id
* plan_id
* provider_subscription_id
* status
* billing_cycle
* current_period_start
* current_period_end
* cancel_at_period_end
* created_at
* updated_at

Billing access may later govern product entitlements.

Do NOT implement billing in the initial vertical slice.

---

# 37. AWS Target Architecture

Target:

Next.js

↓

API Gateway

↓

Lambda

↓

Application Services

↓

RDS PostgreSQL

External integrations:

Lambda

→ Meta WhatsApp Cloud API

Lambda

→ DeepSeek API

Asynchronous:

EventBridge

↓

SQS

↓

Lambda workers

Secrets:

AWS Secrets Manager

Observability:

CloudWatch

Authentication:

Cognito

Infrastructure:

Terraform

---

# 38. Infrastructure as Code

Terraform is part of the professional architecture.

Eventually Terraform should manage:

* networking
* security groups
* RDS
* Lambda
* API Gateway
* Cognito
* SQS
* EventBridge
* Secrets Manager
* IAM
* CloudWatch
* alarms
* other required AWS infrastructure

Do NOT introduce Terraform infrastructure during the initial repository bootstrap unless explicitly requested.

The goal is reproducibility.

Console-created infrastructure should eventually be reproduced and managed through Terraform.

---

# 39. Security

Security is a first-class requirement.

Rules:

* no secrets in Git
* no API keys in source
* no passwords in application database
* no payment-card data
* least privilege IAM
* tenant isolation
* RLS
* input validation
* output validation
* structured logging
* audit logs
* idempotency
* webhook signature verification
* authorization before business operations

Never bypass security to make development easier.

---

# 40. Scaling Strategy

Use the principle:

> **Design for scale, implement for the current size.**

Initial system:

* modular monolith
* single PostgreSQL database
* Lambda/API architecture where appropriate
* synchronous operations for simple workflows
* asynchronous processing for jobs and external workflows

Future scaling may include:

* Lambda horizontal scaling
* SQS buffering
* EventBridge scheduling
* RDS vertical scaling
* RDS read replicas
* Aurora PostgreSQL
* caching
* CDN
* separate workers
* service extraction

Do NOT implement these prematurely.

---

# 41. Docker

Docker is required for reproducibility.

The project should eventually support:

* local development
* consistent Node environment
* PostgreSQL development environment where useful
* CI execution

Docker should not introduce unnecessary complexity during the first initialization.

---

# 42. Git Strategy

Branches:

* main
* develop
* feature/*
* fix/*

Commit style:

Conventional Commits.

Examples:

`feat: add patient domain model`

`fix: prevent overlapping appointments`

`docs: update architecture`

Never push to GitHub without explicit user authorization unless the user specifically instructs otherwise.

---

# 43. Testing

Testing strategy:

## Unit tests

Business rules:

* appointment validation
* availability
* recovery matching
* authorization
* idempotency

## Integration tests

* PostgreSQL
* repositories
* transactions
* RLS

## E2E tests

Critical user workflows:

1. create organization
2. create patient
3. create service
4. create appointment
5. confirm appointment
6. cancel appointment
7. recover appointment
8. accept recovery offer

RLS must have explicit tests.

---

# 44. Seed Data

Development seed should eventually contain:

* 1 organization
* 1 owner
* 2 dentists
* 2 resources
* 5 services
* 5 patients

Do not create seed data that represents real patients or real clinical information.

---

# 45. Development Phases

## Phase 1 — Repository

* Next.js
* TypeScript
* ESLint
* Git
* documentation
* environment configuration

## Phase 2 — Core Domain

* organization
* users
* patients
* dentists
* locations
* resources
* services

## Phase 3 — Appointments

* appointment creation
* validation
* conflict protection
* events
* availability

## Phase 4 — Waitlist and Recovery

* waitlist
* recovery offers
* deterministic matching
* atomic acceptance

## Phase 5 — AWS Backend

* API Gateway
* Lambda
* RDS PostgreSQL
* Cognito
* Secrets Manager
* CloudWatch

## Phase 6 — WhatsApp

* Meta integration
* webhooks
* messages
* templates
* conversations

## Phase 7 — DeepSeek

* AIService
* prompts
* tools
* structured output
* validation
* escalation

## Phase 8 — Async Processing

* SQS
* EventBridge
* Lambda workers
* retries
* idempotency

## Phase 9 — Dashboard

* operational KPIs
* recovery metrics
* communication metrics

## Phase 10 — DevOps

* Docker
* Terraform
* CI/CD
* automated tests
* observability

## Phase 11 — Production Hardening

* security review
* RLS review
* IAM review
* logging
* monitoring
* backups
* disaster recovery
* documentation

---

# 46. First Vertical Slice

The first functional slice is intentionally small:

Organization

→ User

→ Patient

→ Service

→ Appointment

The goal is to prove the fundamental domain before implementing external integrations.

The first slice should eventually support:

* creating organization
* creating user
* creating patient
* creating service
* creating appointment
* validation
* authorization
* tenant isolation
* appointment conflict protection

---

# 47. Antigravity Agent Rules

Antigravity is being used as a coding agent.

It must behave as an implementation assistant, not as an autonomous architect.

Before making significant architectural changes:

* inspect existing code;
* inspect documentation;
* explain the proposed change;
* avoid duplicating existing logic;
* preserve established architecture.

Never:

* invent new architecture without justification;
* create microservices prematurely;
* disable RLS;
* allow AI direct database access;
* expose secrets;
* add out-of-scope clinical modules;
* replace PostgreSQL with DynamoDB without explicit architectural review;
* create AWS infrastructure without authorization;
* create unnecessary dependencies;
* duplicate business logic;
* silently change established database semantics.

Prefer:

* small changes;
* testable modules;
* clear boundaries;
* explicit validation;
* migrations;
* reusable services;
* repository abstractions where appropriate;
* typed interfaces;
* documentation of meaningful decisions.

---

# 48. Current Implementation Rule

Although this document describes the complete target architecture, implementation must be incremental.

**Do not implement the entire architecture at once.**

At the beginning of the project, the agent must only initialize the repository and establish the foundation.

After each meaningful phase:

1. inspect;
2. implement;
3. test;
4. explain;
5. verify;
6. stop and wait for authorization to continue.

---

# 49. Definition of Done

A feature is not considered complete merely because the code compiles.

A meaningful feature should have:

* implementation
* validation
* tests where appropriate
* database migration where applicable
* authorization considerations
* tenant isolation considerations
* error handling
* logging where appropriate
* documentation when architecture changes

---

# 50. Product Philosophy

Clinical Cloud is intended to become both:

1. a real SaaS product for dental clinics;
2. a professional portfolio demonstrating practical AWS Cloud, DevOps, backend, PostgreSQL, AI and healthcare technology skills.

Therefore the project should demonstrate real engineering practices rather than merely produce a visual prototype.

The system must remain understandable to its developer.

The developer should understand:

* why each AWS service exists;
* why PostgreSQL is used;
* why Lambda is used;
* why SQS is used;
* why Terraform is used;
* how Cognito works;
* how RLS isolates tenants;
* how WhatsApp webhooks work;
* how DeepSeek interacts with validated tools;
* how appointment conflicts are prevented;
* how the recovery engine works;
* how the system scales.

The goal is not merely to make the application work.

The goal is to build it correctly and understand it.
