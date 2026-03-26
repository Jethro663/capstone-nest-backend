# Appendix: Enum Catalog

Load this only when exact enum values matter.

## Backend Role Enum

- `backend/src/common/constants/role.constants.ts`
- `RoleName.Admin = 'admin'`
- `RoleName.Teacher = 'teacher'`
- `RoleName.Student = 'student'`

## Common Drizzle Enums

- `accountStatusEnum`: `ACTIVE`, `PENDING`, `SUSPENDED`, `DELETED`
- `assessmentTypeEnum`: `quiz`, `exam`, `assignment`
- `classRecordCategoryEnum`: `written_work`, `performance_task`, `quarterly_assessment`
- `gradingPeriodEnum`: `Q1`, `Q2`, `Q3`, `Q4`
- `enrollmentStatusEnum`: `enrolled`, `dropped`, `completed`
- `gradeLevelEnum`: `7`, `8`, `9`, `10`
- `questionTypeEnum`: `multiple_choice`, `multiple_select`, `true_false`, `short_answer`, `fill_blank`, `dropdown`

## LXP And AI Enums

- `interventionCaseStatusEnum`: in `backend/src/drizzle/schema/lxp.schema.ts`
- `lxpAssignmentTypeEnum`: in `backend/src/drizzle/schema/lxp.schema.ts`
- `aiSessionTypeEnum`: in `backend/src/drizzle/schema/ai-mentor.schema.ts`
- `extractionStatusEnum`: in `backend/src/drizzle/schema/ai-mentor.schema.ts`
- `aiGenerationJobTypeEnum`: in `backend/src/drizzle/schema/rag.schema.ts`
- `aiGenerationStatusEnum`: in `backend/src/drizzle/schema/rag.schema.ts`
