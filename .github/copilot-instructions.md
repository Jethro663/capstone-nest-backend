# Nexora LMS–LXP Architectural Framework

This file defines the architectural authority for all code changes in the Nexora Learning Management System–Learning Experience Platform. Every feature, modification, and bug fix must follow the Senior Software Architect review process before implementation.

---

## 🏗️ Core Principle

**Controllers contain no business logic. Business logic belongs only in services. Database access occurs only in repositories/data layers. Modules remain isolated and communicate only through services. No circular dependencies between modules.**

---

## System Modules (Scope Awareness)

All changes must identify which modules are affected:

- **User Management** — User accounts, credentials, session management
- **Role & Access Control** — RBAC, permissions, authorization
- **Student Profile** — Student demographic data, preferences, goals
- **Teacher Profile** — Instructor information, credentials, subject mastery
- **Class & Subject Management** — Course structure, enrollment, curriculum
- **Learning Content Management** — Lessons, content blocks, educational materials
- **Assessment Management** — Quizzes, tests, assignment evaluation
- **Performance Tracking** — Student progress metrics, learning analytics
- **Learning Experience Platform (LXP)** — Personalized recommendations, adaptive pathways
- **Intervention Management** — Supplementary support, tutoring, remediation
- **AI Mentor** — Intelligent support, feedback generation, learning assistance
- **Instructional Support** — Teacher guidance, pedagogical tools
- **Analytics Dashboard** — Data visualization, insights, reporting
- **Reporting** — Compliance reports, administrative exports
- **System Evaluation** — Quality metrics, system health monitoring
- **Security & Data Management** — Encryption, audit logs, privacy compliance

---

## STEP 1 — SYSTEM IMPACT ANALYSIS

Before any code changes, analyze which modules listed above will be affected.

**Required Actions:**
- Identify all affected modules
- Document data flow between modules
- Verify no unintended module coupling
- Check for dependency chain complexity

**Example:**
> Adding AI Mentor feedback → Affects: AI Mentor, Student Profile, Performance Tracking, Learning Content Management
> Verify: AI Mentor only reads performance data, does NOT modify grades.

---

## STEP 2 — ARCHITECTURE VALIDATION

Enforce these non-negotiable architectural rules:

✅ **Controllers** contain only:
- Route definition
- Request validation
- Delegation to services
- Response formatting

❌ **Services** must NOT:
- Make direct SQL queries
- Violate separation of concerns
- Create circular dependencies

✅ **Repositories/Data Layers** handle:
- All database access
- Query optimization
- Connection pooling

✅ **Module Communication**:
- Only through services (never direct DB access across modules)
- Defined interfaces/contracts
- Dependency injection for testability

❌ **Circular Dependencies**: Forbidden
- Module A → Module B → Module C ✅
- Module A → Module B → Module A ❌

---

## STEP 3 — DATA CONSISTENCY CHECK

Before touching any schema:

- [ ] Check for duplicate fields across tables (especially user/student/teacher profiles)
- [ ] Verify correct foreign key relationships and cascades
- [ ] Review indexing strategy for performance-critical queries
- [ ] Prevent redundant storage of computed values (e.g., don't store "total grade" if it's calculated)
- [ ] Ensure enums and constrained fields match documentation
- [ ] Run consistency checks on existing migrations

**Common Pitfalls:**
- User data duplicated in multiple tables
- Missing indexes on foreign keys
- Storing derived values that should be computed on-demand

---

## STEP 4 — SECURITY REVIEW

Automatically verify (non-negotiable):

- [ ] **Role-Based Access Control**: Endpoint protected by `@UseGuards(AuthGuard, RoleGuard)`
- [ ] **Authentication**: All protected routes require valid JWT or session
- [ ] **Sensitive Data**: Never return passwords, tokens, encrypted fields in API responses
- [ ] **Input Validation**: All parameters validated via DTOs with `class-validator`
- [ ] **Encryption**: Passwords hashed with bcrypt, sensitive fields encrypted at rest
- [ ] **Audit Logging**: Changes to sensitive records logged with timestamp and actor
- [ ] **Error Handling**: Never expose stack traces, DB internals, or system paths to clients

**Red Flags:**
- Hardcoded credentials
- Unvalidated user input reaching services
- Returning encrypted/hashed values to frontend
- Missing role checks on sensitive operations

---

## STEP 5 — PERFORMANCE REVIEW

Evaluate for optimization opportunities:

- [ ] Check for N+1 query patterns → Use joins, batch loading, or DataLoader
- [ ] Identify inefficient joins → Verify indexes exist on foreign keys
- [ ] Count unnecessary database calls → Consider caching or request batching
- [ ] Review caching strategy → TBD: Redis integration for frequently accessed data
- [ ] Heavy AI operations → Should they run asynchronously? Consider job queues
- [ ] Query result size → Add pagination to endpoints returning lists
- [ ] Connection pooling → Verify DB connection limits match app scalability

**Common Optimizations:**
- Use `.leftJoinAndSelect()` instead of N separate queries
- Add indexes on `WHERE`, `JOIN`, and `ORDER BY` columns
- Cache read-only reference data (subjects, grade levels, roles)
- Queue AI Mentor feedback generation to avoid blocking HTTP responses

---

## STEP 6 — FEATURE INTEGRATION CHECK

Ensure the feature doesn't duplicate existing functionality or violate system contracts:

**LXP Module Rules:**
- [ ] LXP access only triggers when performance threshold is reached (not automatically)
- [ ] LXP recommendations based solely on performance data + system configuration
- [ ] No LXP conflicts with student's enrolled classes

**AI Mentor Rules:**
- [ ] AI Mentor cannot modify grades, enrollment, or administrative records
- [ ] AI Mentor feedback is read-only assistance (never stored as assignments)
- [ ] AI Mentor operates within student's current learning content (no unauthorized material)

**Intervention Management Rules:**
- [ ] Intervention results are optional, linked references only
- [ ] Never automatically trigger interventions based on single low assessment
- [ ] Requires explicit teacher/admin approval

**Cross-Module Contracts:**
- [ ] User roles define system access (RBAC must be enforced before service logic)
- [ ] Student performance data available only to authorized teachers/admins
- [ ] Class data changes propagate consistently to enrollment and performance records

---

## STEP 7 — CODE GENERATION

Only after completing the 6 steps above, generate code with the following requirements:

### Structure
- [ ] Clear separation of concerns (controller → service → repository)
- [ ] Dependency injection used throughout
- [ ] All dependencies are explicit (constructor injection)

### Validation
- [ ] DTOs with `@IsNotEmpty()`, `@IsEmail()`, etc.
- [ ] Custom validators for domain-specific constraints
- [ ] Validation errors return HTTP 400 with descriptive messages

### Error Handling
- [ ] Try-catch for database errors
- [ ] Service-level error messages logged
- [ ] Appropriate HTTP status codes (400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 500 server error)

### Logging
- [ ] Log significant operations (create, update, delete, authorization checks)
- [ ] Include contextual info (user ID, resource ID, timestamp)
- [ ] Never log passwords or sensitive tokens

### Testing
- [ ] Unit tests for service business logic
- [ ] Mock repositories and external dependencies
- [ ] Test both success and failure paths
- [ ] Integration test for database interactions (optional but recommended)

---

## STEP 8 — SELF REVIEW

After generating code, perform an internal review:

- [ ] **Logic Errors**: Walk through happy path and error paths step-by-step
- [ ] **Edge Cases**: Null values, empty lists, boundary conditions, permission edge cases
- [ ] **Race Conditions**: If multiple requests happen simultaneously, will data be consistent?
- [ ] **Security Risks**: Injection vulnerabilities, privilege escalation, data exposure
- [ ] **Architectural Violations**: Review against rules in STEP 2 (controller/service/repo separation, circular deps, module isolation)

If any violation is detected, revise the implementation before finalizing.

---

## Workflow Summary

```
REQUEST RECEIVED
    ↓
STEP 1: Identify affected modules
    ↓
STEP 2: Validate architecture rules
    ↓
STEP 3: Check data consistency
    ↓
STEP 4: Security review
    ↓
STEP 5: Performance review
    ↓
STEP 6: Verify no feature conflicts
    ↓
STEP 7: Generate code
    ↓
STEP 8: Self review
    ↓
IMPLEMENTATION COMPLETE ✓
```

---

## Violation Handling

If a violation is detected at any step:

1. **Flag the issue** with explanation of which step/rule it violates
2. **Explain the impact** (e.g., performance, security, maintainability)
3. **Suggest the correction** aligned with architectural rules
4. **Proceed with revised approach** once correction is understood

Example violation response:
> ❌ **Violation (STEP 2)**: Service contains direct SQL query instead of using repository.
> 
> **Impact**: Breaks architecture pattern; makes testing impossible; violates module isolation.
> 
> **Correction**: Move query to repository layer. Service should call repository method.
> 
> Awaiting revision...

---

## Quick Reference Checklist

- [ ] All modules affected by this change identified
- [ ] Architecture layering respected (controller → service → repository)
- [ ] No circular dependencies introduced
- [ ] Data consistency verified (no duplicates, correct FKs, proper indexing)
- [ ] Role-based access control enforced
- [ ] Sensitive data never exposed in responses
- [ ] All inputs validated
- [ ] Passwords encrypted (bcrypt)
- [ ] N+1 queries checked
- [ ] Caching opportunities identified
- [ ] Feature doesn't conflict with LXP, AI Mentor, or Intervention rules
- [ ] Code follows controller/service/repo pattern
- [ ] Validation in DTOs
- [ ] Error handling with appropriate status codes
- [ ] Logging includes context
- [ ] Unit tests written
- [ ] Self-review complete, no violations present
