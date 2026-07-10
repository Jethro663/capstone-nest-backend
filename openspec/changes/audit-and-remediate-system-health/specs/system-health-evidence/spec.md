## ADDED Requirements

### Requirement: Evidence-gated health audit
The system-health audit SHALL record fresh command or runtime evidence for each claimed healthy subsystem and SHALL preserve unrelated worktree changes.

#### Scenario: A validation command succeeds
- **WHEN** a selected health command exits successfully
- **THEN** the audit record includes the command, exit status, duration, and covered subsystem.

#### Scenario: A validation command fails or is blocked
- **WHEN** a selected health command fails or cannot run because a local dependency is unavailable
- **THEN** the audit record includes the exact failure or blocker and no code remediation is made without a reproduced defect.

### Requirement: Passive queue and data-safe auditing
The audit SHALL inspect BullMQ and AI orchestration passively and SHALL NOT enqueue synthetic academic or AI jobs or mutate production-like academic data.

#### Scenario: Queue health is inspected
- **WHEN** the audit examines registered queues or workers
- **THEN** it records passive state and configuration evidence without adding a diagnostic job.

### Requirement: Model-aware Ollama readiness
The Compose Ollama health check SHALL remain unhealthy until the configured text, vision, and embedding model names are all installed.

#### Scenario: Ollama has no configured models
- **WHEN** Ollama starts with an empty model list
- **THEN** its Compose health check does not report healthy and dependent AI services do not pass readiness through that gate.
