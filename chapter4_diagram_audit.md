# Chapter 4 Diagram Audit

## Figure-by-Figure Audit

| Figure | Approx. Page | Caption | Status | Audit Note |
| --- | --- | --- | --- | --- |
| Figure 1 | 44 | System Architecture | Partial | Core architecture is broadly supported, but wording should mention optional cloud fallback instead of implying strictly local-only AI. |
| Figure 2 | 48 | Agile Development | Match | Generic process figure; fix punctuation and make phases match actual repo workflow if detailed. |
| Figure 3 | 56 | Use Case Diagram for Nexora Web Application | Partial | Web roles and modules exist, but diagram should not overclaim mobile push or unverified admin/teacher AI parity. |
| Figure 4 | 56 | Use Case Diagram for Nexora Mobile Application | Mismatch | Mobile exists but is student-focused; teacher mobile remains unsupported. |
| Figure 5 | 101 | Functional Decomposition Diagram of the Admin Portal | Partial | Admin portal is real; ensure chatbot, diagnostics, audit, and roster features match actual route names. |
| Figure 6 | 101 | Functional Decomposition Diagram of the Teacher Portal | Match | Teacher portal largely aligns; keep intervention threshold at 74%. |
| Figure 7 | 102 | Functional Decomposition Diagram of the Student Portal | Partial | Student portal is real, but JA/LXP wording must use actual gating and load behavior. |
| Figure 8 | 103 | Mobile Login & OTP Verification | Partial | OTP backend exists; mobile end-to-end flow was not live-verified in this audit. |
| Figure 9 | 104 | Mobile Forgot Password and Account Recovery | Partial | Web forgot-password flow exists; mobile parity not fully verified. |
| Figure 10 | 105 | View Dashboard and Continue Learning Logic | Partial | Student dashboards exist; validate exact mobile continue-learning logic before claiming detailed process certainty. |
| Figure 11 | 106 | View Modules and 30-Second Lesson Completion Tracking | Mismatch | 30-second completion rule is unsupported by current code evidence. |
| Figure 12 | 107 | Taking Assessments and Summative Submission | Match | Assessment flows are implemented; mobile parity should be qualified if shown in figure. |
| Figure 13 | 108 | LXP Remedial Access and 60% Mastery Threshold Gating | Mismatch | Implemented threshold is 74%, not 60%. |
| Figure 14 | 109 | RAG-Based Interaction with JAKIPIR AI Mentor | Match | RAG and JA routes are implemented; keep model/grounding explanation precise. |
| Figure 15 | 110 | View Performance Analytics and Quarterly Trends | Partial | Analytics surfaces exist, but some live datasets are sparse. |
| Figure 16 | 111 | Mobile Profile Management and Data Persistence | Partial | Profile surfaces exist; mobile details were not live-walked in this audit. |
| Figure 17 | 112 | Web Login and Dashboard Navigation | Match | Live-verified. |
| Figure 18 | 113 | Web Course Browsing and Filtering | Match | Live student courses route verified. |
| Figure 19 | 114 | Assessment Taking with Out-of-Focus Warning Logic | Match | Web implementation exists in student assessment page. |
| Figure 20 | 115 | Discussion Board Participation and Thread Replies | Partial | Web discussion support exists; mobile parity does not. |
| Figure 21 | 116 | Web Profile Management and Account Locking | Mismatch | Profile completion lock exists; generic account-lock wording is unsupported. |
| Figure 22 | 117 | Managing Classes and Instructional Materials | Match | Teacher/admin class management exists. |
| Figure 23 | 118 | AI PDF Extraction and Layout-Aware Section Application | Partial | Extraction pipeline exists; layout-aware wording should reflect teacher review and queue-based processing. |
| Figure 24 | 119 | AI Quiz Drafting and Assessment Studio Workspace | Match | Supported by AI job endpoints and teacher/admin assessment editor flows. |
| Figure 25 | 120 | Asynchronous AI Job Monitoring and Status Updates | Match | Supported by queue/job tables and async endpoints. |
| Figure 26 | 121 | Class Record Synchronization and Spreadsheet Management | Match | Class-record subsystem exists. |
| Figure 27 | 122 | Student Intervention Triage and Outcome Tracking | Match | Intervention subsystem exists; threshold wording must stay at 74%. |
| Figure 28 | 122 | Learning Gap Analysis and Competency Heatmap Generation | Partial | Schema support exists; live proof is limited. |
| Figure 29 | 123 | Academic Report Generation and Data Export | Partial | Report/export surfaces exist, but this audit did not execute every export path. |
| Figure 30 | 123 | Creating Class Announcements and Discussion Threads | Mismatch | Push notification claim is unsupported; web/in-app announcement propagation is the supported claim. |
| Figure 31 | 124 | Admin Dashboard Overview and Quick Route Navigation | Match | Admin dashboard live-verified. |
| Figure 32 | 125 | User Lifecycle Management | Match | Users/admin surfaces and lifecycle endpoints exist. |
| Figure 33 | 126 | Admin-Triggered User Password Reset | Match | Backend reset-password endpoint exists. |
| Figure 34 | 127 | Section Creation and Roster Management | Match | Admin sections and roster surfaces exist. |
| Figure 35 | 128 | Bulk Roster Import and Validation Logic | Partial | Feature exists; not live-run during this audit. |
| Figure 36 | 129 | School Calendar and Event Timeline Management | Match | School-events module and route exist. |
| Figure 37 | 131 | System Diagnostics and Dependency Health Checks | Match | Live-verified admin diagnostics and health route. |
| Figure 38 | 133 | Audit Trail Review and Security Log Filtering | Match | Live-verified audit trail page and audit_logs table. |
| Figure 39 | 134 | Academic State Transition | Match | Academic-state module and schema exist. |

## Table Audit

| Table | Approx. Page | Title | Issue |
| --- | --- | --- | --- |
| Table 1 | 21 | LMS vs LXP comparison | Ensure the 74% threshold and constrained intervention access are reflected consistently. |
| Table 2 | 34 | Gap analysis | Some comparative claims are too absolute and need source verification. |
| Table 3 | 37 | Software requirements | Exact package versions need updating to current manifests. |
| Table 4 | 40 | Hardware specifications | Hardware claims should be matched to actual local/dev deployment assumptions. |
| Table 5 | 47 | Agile development phases | Align terms with Figure 2 punctuation and phase wording. |
| Table 6 | 50 | Functional requirements for admins and teachers | Remove or qualify unsupported push/mobile parity claims. |
| Table 7 | 52 | Functional requirements for students | Fix 60%/74% threshold mismatch and 30-second completion claim. |
| Table 8 | 55 | Technical and operational constraints | Document AI-service fallback and demo-data limitations accurately. |
| Table 17 | 66 | Use Case Narratives of Student Profile | Title duplicates Table 18. |
| Table 18 | 67 | Use Case Narratives of Student Profile | Rename to the intended use case. |
| Table 24 | 73 | Use Case Narratives of Disccusion Board (Teacher) | Fix typo: Discussion. |
| Table 31 | 80 | Use Case Narratives of Student Performance | Conflicts with another Table 31 title in body text. |
| Table 31 | 81 | Use Case Narratives of View Evaluations | Renumber to restore sequence integrity. |

## Chapter 4 Summary
- The most severe Chapter 4 problems are the 60%/74% mismatch, unsupported 30-second tracking, overclaimed mobile parity, push-notification wording, and duplicate/misaligned use-case tables.
- The strongest supported Chapter 4 areas are web dashboard navigation, diagnostics, audit trail, JA/RAG architecture, class record flow, and admin lifecycle surfaces.
