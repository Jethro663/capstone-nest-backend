# Teacher Library Design

Date: 2026-04-17
Scope: `next-frontend` teacher library UX aligned with the new admin-side Nexora Library model
Primary route: `/dashboard/teacher/library`

## Summary

The teacher library will support two distinct content sources:

1. `General Modules`
   - Admin-managed, teacher read-only
   - Filtered manually by subject and grade
   - Teachers can browse, preview, download, and attach these files directly into class or materials flows

2. `My Library`
   - Teacher-managed files
   - Supports both teacher-wide personal files and class-specific files
   - Teacher uploads are sanitized, chunked, indexed for AI, and private to `teacher + AI` by default
   - Student access only happens when a teacher explicitly attaches a file into a class/material flow

The recommended implementation is to extend the existing shared library workspace rather than create a second teacher-only library stack.

## Goals

- Align the teacher library with the new admin general-library model
- Preserve a clean separation between admin-owned general files and teacher-owned files
- Support teacher reuse workflows without forcing re-upload for every class
- Keep teacher AI retrieval useful by indexing teacher-owned files automatically
- Avoid drift between admin and teacher library UI where the underlying contract is shared

## Non-Goals

- Teachers directly editing admin-owned general files
- Teacher moderation of general-module visibility or partitions
- A student-facing library redesign in this phase
- A separate teacher-only library backend contract if the current shared file service can be extended safely

## Route Model

The teacher route remains:

- `/dashboard/teacher/library`

This page will have two top-level tabs:

- `General Modules`
- `My Library`

No third top-level `Class Libraries` tab is needed because class-specific ownership is handled inside `My Library`.

## Information Architecture

### General Modules

Purpose:
- Give teachers access to admin-approved, AI-ready library files for browsing and classroom use

Permissions:
- Read-only

Allowed actions:
- Filter by subject
- Filter by grade
- Paginate/search if supported by the shared library contract
- Preview
- Download
- Attach directly to class/material flows

Disallowed actions:
- Upload
- Rename
- Move
- Delete
- Change teacher visibility
- Change partition metadata

Visibility rule:
- Only admin general files with teacher visibility enabled appear here

### My Library

Purpose:
- Let teachers maintain their own reusable or class-specific files that can also support AI generation

Ownership modes:
- `Personal`
  - Teacher-wide reusable files
- `Class`
  - Files bound to a specific class

Allowed actions:
- Upload
- Move between `personal <-> class`
- Change class target when the destination is `class`
- Rename display name
- Preview
- Download
- Delete
- Toggle `Use in AI / Do not use in AI`

Default visibility:
- Teacher + AI only

Student access rule:
- Teacher-owned files do not appear to students by default
- Students only gain access when the teacher explicitly attaches a file into a class/material context

## Upload Rules

Teacher uploads in `My Library` require:

- file
- destination: `personal` or `class`
- subject
- grade
- class selection when destination is `class`

Supported file types:

- PDF
- TXT
- PPTX

Upload processing should match admin-library handling:

- file sanitization
- safe storage
- extraction
- chunking
- embedding/indexing for AI retrieval

## AI Behavior

Teacher-owned files should be AI-ready by default, matching the admin-library ingestion model.

Teacher AI scope:
- `Teacher-wide`
- All teacher-owned files can support AI flows for any class the same teacher handles

Teacher AI visibility toggle:
- `Use in AI / Do not use in AI`
- The toggle controls AI retrieval participation only
- The file remains visible to the teacher in `My Library` regardless of toggle state

General modules remain AI-usable according to existing admin/general-library rules.

## Attach Behavior

Admin-owned `General Modules` may be attached directly into teacher class/material flows.

This means:
- teachers do not need to duplicate an admin general file into `My Library` before using it in class
- direct attach should preserve the fact that the source file remains admin-owned and read-only

Teacher-owned files in `My Library` may also be attached into class/material flows. That attach event is the point where student visibility begins.

## Filtering

### General Modules filters

- Manual subject filter
- Manual grade filter

No auto-locking to currently assigned teacher classes in this phase.

### My Library filters

Recommended baseline filters:
- source type: `personal` or `class`
- subject
- grade
- class when applicable
- AI usage state

These may be implemented progressively if the existing workspace already supports the core list/filter/pagination behavior.

## Component Strategy

Recommended implementation:
- reuse the shared `LibraryWorkspaceView`
- preserve a teacher-specific wrapper page
- branch behavior by role/variant only where permissions or actions differ

Expected frontend ownership:
- teacher route page stays small
- shared workspace handles shared table/list rendering
- teacher-specific upload/move/AI-toggle flows live in teacher-aware branches of the workspace hook and action surface

This keeps admin and teacher library behavior aligned while still enforcing different permissions.

## Data Contract Expectations

The teacher page should rely on the shared file service with role-appropriate parameters.

Expected general-library behavior:
- teacher requests only teacher-visible general files
- supports subject and grade filters

Expected teacher-library behavior:
- supports teacher-owned files with destination metadata
- supports class association for class-scoped teacher files
- supports AI usage state
- supports teacher file move/update/delete operations

If the current API is missing destination ownership or AI-toggle support for teacher files, that becomes an implementation dependency rather than a design change.

## Error Handling

Teacher library UX should handle:

- upload validation errors
- unsupported file types
- missing required metadata
- failed indexing
- failed preview/download
- failed move between personal and class ownership
- attach failures into class/material flows

Error messaging should be action-specific and avoid generic silent failures.

## Testing Expectations

Minimum validation after implementation:

- teacher sees only `General Modules` and `My Library` tabs
- general modules are read-only
- teacher can upload to `My Library` with required metadata
- teacher can create both personal and class-specific files
- teacher can move files between personal and class ownership
- teacher can retarget class-specific files
- teacher can toggle `Use in AI / Do not use in AI`
- admin general files can be attached directly to class/material flows
- teacher-owned files remain private until explicitly attached
- teacher-visible general files respect manual subject and grade filters

## Risks

- The current shared workspace may already encode admin assumptions that need to be separated cleanly
- Attach flows may currently assume file ownership patterns that do not distinguish admin general files from teacher-owned files
- Teacher-wide AI scope can be powerful, but it must remain bounded to the owning teacher's flows

## Recommendation

Implement the teacher library by extending the shared library workspace and hook stack with a teacher-specific permission model and upload metadata model, rather than building a separate teacher-only library system.



