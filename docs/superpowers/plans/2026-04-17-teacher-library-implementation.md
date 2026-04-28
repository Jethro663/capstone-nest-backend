# Teacher Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved teacher library at `/dashboard/teacher/library` with `General Modules` + `My Library`, teacher-owned AI-ready uploads, and direct attach of library files into teacher module/material flows.

**Architecture:** Extend the existing shared library workspace instead of creating a second library stack. Keep admin general modules read-only for teachers, add teacher-owned private files with subject/grade metadata plus `aiEnabled`, and let attached personal files become student-accessible through module-scoped download endpoints instead of generic `/files/:id/download`.

**Tech Stack:** Next.js App Router, React, Jest, NestJS 11, Drizzle ORM, FastAPI, Python unittest

---

## File Map

### Backend

- Modify: `backend/src/drizzle/schema/base.schema.ts`
  - Add the teacher-library AI toggle field on `uploaded_files`.
- Create: `backend/drizzle/0067_teacher_library_ai_enabled.sql`
  - Persist the schema change for `ai_enabled`.
- Modify: `backend/src/modules/file-upload/dto/file-upload.dto.ts`
  - Accept teacher-private subject/grade metadata and `aiEnabled`.
- Modify: `backend/src/modules/file-upload/file-upload.service.ts`
  - Queue indexing for teacher-owned private files, preserve subject/grade metadata, and allow teacher retry/index toggles.
- Modify: `backend/src/modules/file-upload/file-upload.service.spec.ts`
  - Lock the backend contract for teacher-owned files.
- Modify: `backend/src/modules/content-modules/content-modules.service.ts`
  - Validate file attach permissions and add module-scoped file streaming for students.
- Modify: `backend/src/modules/content-modules/content-modules.controller.ts`
  - Expose the new attached-file download endpoint.
- Modify: `backend/src/modules/content-modules/content-modules.service.spec.ts`
  - Verify teacher attach rules and student module download rules.
- Modify: `backend/src/modules/content-modules/content-modules.controller.spec.ts`
  - Verify the new controller route envelope and guards.

### AI service

- Modify: `ai-service/app/library_indexing_pipeline.py`
  - Index teacher-owned private files when they are AI-enabled.
- Modify: `ai-service/app/retrieval_service.py`
  - Include teacher-owned library chunks for the owning teacher with subject/grade matching.
- Modify: `ai-service/app/quiz_generation_service.py`
- Modify: `ai-service/app/mentor_service.py`
- Modify: `ai-service/app/remedial_service.py`
- Modify: `ai-service/app/student_tutor_service.py`
  - Pass teacher-aware retrieval parameters.
- Modify: `ai-service/tests/test_library_indexing_pipeline.py`
  - Verify teacher-private indexing metadata.
- Modify: `ai-service/tests/test_retrieval_service.py`
  - Verify teacher-owned retrieval joins class retrieval correctly.

### Frontend

- Modify: `next-frontend/src/types/file.ts`
  - Add teacher-library upload/update/query fields such as `aiEnabled`.
- Modify: `next-frontend/src/services/file-service.ts`
  - Send teacher-library metadata to the backend.
- Modify: `next-frontend/src/hooks/use-library-workspace.ts`
  - Add teacher-specific mode, filters, upload metadata, move semantics, and AI toggle.
- Modify: `next-frontend/src/components/library/LibraryWorkspaceView.tsx`
  - Render teacher `General Modules` + `My Library` UX with the approved permissions.
- Modify: `next-frontend/src/components/library/TeacherLibraryPage.tsx`
  - Keep the route wrapper thin and teacher-only.
- Create: `next-frontend/src/components/library/LibraryFilePickerDialog.tsx`
  - Reusable library picker for teacher module/material attachment.
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/library/page.test.tsx`
  - Cover the teacher route integration and upload payload.
- Create: `next-frontend/src/components/library/LibraryWorkspaceView.teacher.test.tsx`
  - Cover teacher UI permissions and tabs.
- Modify: `next-frontend/src/services/module-service.ts`
  - Add module-scoped attached-file download.
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx`
  - Add “choose from library” file attachment flow.
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx`
  - Verify teacher attach flow for general and personal files.
- Modify: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.tsx`
  - Download attached teacher-personal files through the module route instead of generic file download.
- Create: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.library-download.test.tsx`
  - Verify the student flow uses module-scoped download for attached files.

---

### Task 1: Backend Teacher File Contract

**Files:**
- Create: `backend/drizzle/0067_teacher_library_ai_enabled.sql`
- Modify: `backend/src/drizzle/schema/base.schema.ts`
- Modify: `backend/src/modules/file-upload/dto/file-upload.dto.ts`
- Modify: `backend/src/modules/file-upload/file-upload.service.spec.ts`
- Modify: `backend/src/modules/file-upload/file-upload.service.ts`

- [ ] **Step 1: Write the failing backend tests**

```ts
it('queues indexing for teacher private uploads when subject, grade, and aiEnabled are provided', async () => {
  await service.saveFileRecord(
    {
      teacherId: 'teacher-1',
      scope: FileScopeDto.Private,
      originalName: 'forces.txt',
      storedName: 'forces.txt',
      mimeType: 'text/plain',
      sizeBytes: 1200,
      filePath: 'uploads/library/forces.txt',
      subjectKey: LibrarySubjectKeyDto.Science,
      gradeLevel: GradeLevelDto.Grade7,
      fileKind: LibraryFileKindDto.Txt,
      teacherVisible: true,
      aiEnabled: true,
    },
    teacherUser,
  );

  expect(indexingService.queueFileIndex).toHaveBeenCalled();
  expect(insertedRecord.indexStatus).toBe(LibraryIndexStatusDto.Pending);
  expect(insertedRecord.subjectKey).toBe(LibrarySubjectKeyDto.Science);
  expect(insertedRecord.gradeLevel).toBe(GradeLevelDto.Grade7);
  expect(insertedRecord.aiEnabled).toBe(true);
});

it('allows retryIndex for teacher-owned private files that are AI-enabled', async () => {
  uploadedFilesRepo.findFirst.mockResolvedValue({
    id: 'file-1',
    teacherId: 'teacher-1',
    scope: FileScopeDto.Private,
    subjectKey: LibrarySubjectKeyDto.Science,
    gradeLevel: GradeLevelDto.Grade7,
    aiEnabled: true,
  });

  await service.retryIndex('file-1', teacherUser);

  expect(indexingService.queueFileIndex).toHaveBeenCalledWith(
    'file-1',
    expect.objectContaining({ actorId: 'teacher-1', reason: 'retry' }),
  );
});
```

- [ ] **Step 2: Run the backend spec to verify it fails**

Run: `cd backend; npm run test -- file-upload.service.spec.ts`

Expected: FAIL with `aiEnabled` missing, private uploads staying `not_indexed`, or retry being rejected for non-general files.

- [ ] **Step 3: Add the schema, DTO, and service implementation**

```sql
ALTER TABLE uploaded_files
ADD COLUMN ai_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX uploaded_files_ai_enabled_idx
  ON uploaded_files (teacher_id, scope, ai_enabled, deleted_at);
```

```ts
// backend/src/drizzle/schema/base.schema.ts
aiEnabled: boolean('ai_enabled').notNull().default(true),
```

```ts
// backend/src/modules/file-upload/dto/file-upload.dto.ts
@Transform(({ value }) => toBoolean(value))
@IsBoolean()
@IsOptional()
aiEnabled?: boolean;
```

```ts
// backend/src/modules/file-upload/file-upload.service.ts
private ensureIndexedPartitionMetadata(input: {
  scope?: FileScopeDto | 'private' | 'general' | null;
  aiEnabled?: boolean | null;
  subjectKey?: LibrarySubjectKeyDto | string | null;
  gradeLevel?: GradeLevelDto | string | null;
}) {
  const requiresMetadata =
    input.scope === FileScopeDto.General || input.aiEnabled === true;

  if (requiresMetadata && (!input.subjectKey || !input.gradeLevel)) {
    throw new BadRequestException(
      'AI-ready library files must specify subjectKey and gradeLevel.',
    );
  }
}

// saveFileRecord
aiEnabled: dto.aiEnabled ?? true,
indexStatus:
  dto.aiEnabled === false
    ? LibraryIndexStatusDto.NotIndexed
    : LibraryIndexStatusDto.Pending,

if (record.aiEnabled) {
  await this.libraryIndexingService?.queueFileIndex(record.id, {
    actorId: actingUser.id,
    reason: 'upload',
  });
}

// updateFileMetadata
subjectKey: normalizedSubjectKey,
gradeLevel: normalizedGradeLevel,
aiEnabled: dto.aiEnabled === undefined ? record.aiEnabled : dto.aiEnabled,

// retryIndex
if (!record.aiEnabled) {
  throw new BadRequestException('Enable AI usage before retrying indexing.');
}
```

- [ ] **Step 4: Re-run the backend spec to verify it passes**

Run: `cd backend; npm run test -- file-upload.service.spec.ts`

Expected: PASS for the new private upload and retry cases.

- [ ] **Step 5: Commit**

```bash
git add backend/drizzle/0067_teacher_library_ai_enabled.sql backend/src/drizzle/schema/base.schema.ts backend/src/modules/file-upload/dto/file-upload.dto.ts backend/src/modules/file-upload/file-upload.service.ts backend/src/modules/file-upload/file-upload.service.spec.ts
git commit -m "feat: support teacher ai-ready library files"
```

---

### Task 2: AI Indexing and Teacher Retrieval

**Files:**
- Modify: `ai-service/app/library_indexing_pipeline.py`
- Modify: `ai-service/app/retrieval_service.py`
- Modify: `ai-service/app/quiz_generation_service.py`
- Modify: `ai-service/app/mentor_service.py`
- Modify: `ai-service/app/remedial_service.py`
- Modify: `ai-service/app/student_tutor_service.py`
- Modify: `ai-service/tests/test_library_indexing_pipeline.py`
- Modify: `ai-service/tests/test_retrieval_service.py`

- [ ] **Step 1: Write the failing AI tests**

```py
def test_index_library_file_supports_teacher_private_ai_enabled_file(self):
    file_row = {
        "id": "file-1",
        "file_path": "uploads/library/forces.txt",
        "original_name": "forces.txt",
        "mime_type": "text/plain",
        "size_bytes": 12,
        "subject_key": "science",
        "grade_level": "7",
        "teacher_visible": True,
        "file_kind": "txt",
        "content_hash": None,
        "teacher_id": "teacher-1",
        "class_id": None,
        "scope": "private",
        "ai_enabled": True,
    }
    # mocked db returns file_row
    result = asyncio.run(index_library_file(db, "file-1"))
    self.assertEqual(result["fileId"], "file-1")

def test_similarity_search_includes_teacher_library_chunks_for_same_teacher(self):
    results = asyncio.run(
        similarity_search(
            db,
            query_text="balanced and unbalanced forces",
            class_id="class-1",
            teacher_id="teacher-1",
            subject_key="science",
            grade_level="7",
            include_library=True,
            policy_name="quiz_generation",
        )
    )
    self.assertTrue(any(item["sourceType"] == "library_file" for item in results))
```

- [ ] **Step 2: Run the AI tests to verify they fail**

Run: `cd ai-service; python -m unittest tests.test_library_indexing_pipeline tests.test_retrieval_service`

Expected: FAIL because private files are rejected or retrieval ignores teacher-owned chunks.

- [ ] **Step 3: Implement teacher-aware indexing and retrieval**

```py
# ai-service/app/library_indexing_pipeline.py
if not file_row["subject_key"] or not file_row["grade_level"]:
    raise ValueError("AI-ready library file is missing subject_key or grade_level")

metadata = {
    "libraryFileId": file_id,
    "teacherId": file_row["teacher_id"],
    "classId": file_row["class_id"],
    "scope": file_row["scope"],
    "aiEnabled": bool(file_row["ai_enabled"]),
    "subjectKey": file_row["subject_key"],
    "gradeLevel": file_row["grade_level"],
}
```

```py
# ai-service/app/retrieval_service.py
async def _vector_search(
    db: AsyncSession,
    *,
    query_text: str,
    class_id: str,
    teacher_id: str | None = None,
    subject_key: str | None = None,
    grade_level: str | None = None,
    include_library: bool = True,
    limit: int,
    ...
) -> list[dict[str, Any]]:
    if include_library and subject_key and grade_level and teacher_id:
        params["teacherId"] = teacher_id
        filters = [
            """
            (
              c.class_id = :classId
              OR (
                c.source_type = 'library_file'
                AND (
                  (
                    c.subject_key = :subjectKey
                    AND c.grade_level = :gradeLevel
                    AND EXISTS (
                      SELECT 1
                      FROM uploaded_files uf
                      WHERE uf.id = c.library_file_id
                        AND uf.scope = 'general'
                        AND uf.teacher_visible = true
                        AND uf.deleted_at IS NULL
                    )
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM uploaded_files uf
                    WHERE uf.id = c.library_file_id
                      AND uf.scope = 'private'
                      AND uf.teacher_id = :teacherId
                      AND uf.ai_enabled = true
                      AND uf.subject_key = :subjectKey
                      AND uf.grade_level = :gradeLevel
                      AND uf.deleted_at IS NULL
                  )
                )
              )
            )
            """
        ]
```

```py
# teacher-aware call sites
results = await similarity_search(
    db,
    query_text=query,
    class_id=class_id,
    teacher_id=str(class_info["teacher_id"]),
    subject_key=library_subject_key,
    grade_level=library_grade_level,
    include_library=True,
    policy_name="quiz_generation",
)
```

- [ ] **Step 4: Re-run the AI tests to verify they pass**

Run: `cd ai-service; python -m unittest tests.test_library_indexing_pipeline tests.test_retrieval_service`

Expected: PASS with teacher-private chunks returned for the owning teacher only.

- [ ] **Step 5: Commit**

```bash
git add ai-service/app/library_indexing_pipeline.py ai-service/app/retrieval_service.py ai-service/app/quiz_generation_service.py ai-service/app/mentor_service.py ai-service/app/remedial_service.py ai-service/app/student_tutor_service.py ai-service/tests/test_library_indexing_pipeline.py ai-service/tests/test_retrieval_service.py
git commit -m "feat: retrieve teacher library files in ai flows"
```

---

### Task 3: Frontend Library Contract and Teacher Workspace State

**Files:**
- Modify: `next-frontend/src/types/file.ts`
- Modify: `next-frontend/src/services/file-service.ts`
- Modify: `next-frontend/src/hooks/use-library-workspace.ts`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/library/page.test.tsx`

- [ ] **Step 1: Write the failing frontend tests for teacher payloads**

```tsx
it('uploads teacher library files with destination, subject, grade, and aiEnabled', async () => {
  render(<DashboardTeacherLibraryPage />);

  await user.click(screen.getByRole('tab', { name: 'My Library' }));
  await user.selectOptions(screen.getByLabelText('Upload destination'), 'class');
  await user.selectOptions(screen.getByLabelText('Subject filter'), 'science');
  await user.selectOptions(screen.getByLabelText('Grade filter'), '7');
  await user.selectOptions(screen.getByLabelText('Class target'), 'class-1');
  await user.upload(screen.getByTestId('library-upload-input'), file);
  await user.click(screen.getByRole('button', { name: 'Upload File' }));

  expect(mockedFileService.upload).toHaveBeenCalledWith(
    file,
    expect.objectContaining({
      scope: 'private',
      classId: 'class-1',
      subjectKey: 'science',
      gradeLevel: '7',
      aiEnabled: true,
    }),
  );
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run: `cd next-frontend; npx jest --runTestsByPath "app/(dashboard)/dashboard/teacher/library/page.test.tsx" --runInBand`

Expected: FAIL because the teacher upload flow does not send subject/grade/destination/AI metadata.

- [ ] **Step 3: Implement the teacher library contract in types, service, and hook state**

```ts
// next-frontend/src/types/file.ts
export interface UploadedFile {
  ...
  aiEnabled?: boolean;
}

export interface FileLibraryQuery {
  ...
  aiEnabled?: boolean;
}
```

```ts
// next-frontend/src/services/file-service.ts
async upload(
  file: File,
  options: {
    classId?: string;
    folderId?: string;
    scope?: 'private' | 'general';
    subjectKey?: LibrarySubjectKey;
    gradeLevel?: LibraryGradeLevel;
    teacherVisible?: boolean;
    aiEnabled?: boolean;
  } = {},
) { ... }

async update(id: string, dto: {
  originalName?: string;
  folderId?: string | null;
  classId?: string | null;
  scope?: 'private' | 'general';
  subjectKey?: LibrarySubjectKey;
  gradeLevel?: LibraryGradeLevel;
  teacherVisible?: boolean;
  aiEnabled?: boolean;
}) { ... }
```

```ts
// next-frontend/src/hooks/use-library-workspace.ts
const [teacherOwnershipFilter, setTeacherOwnershipFilter] = useState<'all' | 'personal' | 'class'>('all');
const [uploadTarget, setUploadTarget] = useState<'personal' | 'class'>('personal');
const [uploadSubjectKey, setUploadSubjectKey] = useState<LibrarySubjectKey | ''>('');
const [uploadGradeLevel, setUploadGradeLevel] = useState<LibraryGradeLevel | ''>('');
const [uploadAiEnabled, setUploadAiEnabled] = useState(true);

const uploadRequiresClass = role === 'teacher' && uploadTarget === 'class';
const uploadDisabled =
  !selectedUpload ||
  !uploadSubjectKey ||
  !uploadGradeLevel ||
  (uploadRequiresClass && !uploadClassId);

await fileService.upload(selectedUpload, {
  scope: role === 'admin' ? 'general' : 'private',
  classId: role === 'teacher' && uploadTarget === 'class' ? uploadClassId : undefined,
  subjectKey: role === 'teacher' ? uploadSubjectKey : subjectFilter || undefined,
  gradeLevel: role === 'teacher' ? uploadGradeLevel : gradeFilter || undefined,
  aiEnabled: role === 'teacher' ? uploadAiEnabled : true,
  teacherVisible: true,
});
```

- [ ] **Step 4: Re-run the frontend test to verify it passes**

Run: `cd next-frontend; npx jest --runTestsByPath "app/(dashboard)/dashboard/teacher/library/page.test.tsx" --runInBand`

Expected: PASS with teacher upload payloads carrying the new metadata.

- [ ] **Step 5: Commit**

```bash
git add next-frontend/src/types/file.ts next-frontend/src/services/file-service.ts next-frontend/src/hooks/use-library-workspace.ts next-frontend/app/(dashboard)/dashboard/teacher/library/page.test.tsx
git commit -m "feat: add teacher library upload contract"
```

---

### Task 4: Teacher Library UI and Permissions

**Files:**
- Modify: `next-frontend/src/components/library/LibraryWorkspaceView.tsx`
- Modify: `next-frontend/src/components/library/TeacherLibraryPage.tsx`
- Create: `next-frontend/src/components/library/LibraryWorkspaceView.teacher.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```tsx
it('shows General Modules and My Library tabs for teachers', () => {
  render(<LibraryWorkspaceView variant="teacher" workspace={workspace} />);
  expect(screen.getByRole('tab', { name: 'General Modules' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'My Library' })).toBeInTheDocument();
});

it('hides admin-only actions for teacher general modules', () => {
  render(<LibraryWorkspaceView variant="teacher" workspace={workspaceInGeneralMode} />);
  expect(screen.queryByLabelText('Teacher visibility toggle')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Move File' })).not.toBeInTheDocument();
});

it('shows AI toggle for teacher-owned files', () => {
  render(<LibraryWorkspaceView variant="teacher" workspace={workspaceInPrivateMode} />);
  expect(screen.getByLabelText('Use in AI')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI tests to verify they fail**

Run: `cd next-frontend; npx jest --runTestsByPath "src/components/library/LibraryWorkspaceView.teacher.test.tsx" --runInBand`

Expected: FAIL because the current shared view still follows the old teacher class-filter/upload behavior.

- [ ] **Step 3: Implement the teacher-specific UI**

```tsx
// next-frontend/src/components/library/LibraryWorkspaceView.tsx
{!isAdmin && (
  <section className="nexora-library__tabs" aria-label="Library scope tabs">
    <button type="button" role="tab" aria-selected={mode === 'general'} onClick={() => setMode('general')}>
      General Modules
    </button>
    <button type="button" role="tab" aria-selected={mode === 'private'} onClick={() => setMode('private')}>
      My Library
    </button>
  </section>
)}

{variant === 'teacher' && mode === 'general' ? (
  <>
    <select aria-label="Subject filter" ... />
    <select aria-label="Grade filter" ... />
  </>
) : null}

{variant === 'teacher' && mode === 'private' ? (
  <>
    <select aria-label="Upload destination" ... />
    <select aria-label="Subject filter" ... />
    <select aria-label="Grade filter" ... />
    <select aria-label="Class target" ... />
    <label>
      <input
        type="checkbox"
        checked={selectedFile.aiEnabled ?? true}
        onChange={() => handleAiToggle(selectedFile)}
      />
      Use in AI
    </label>
  </>
) : null}
```

```tsx
// next-frontend/src/components/library/TeacherLibraryPage.tsx
if (!isTeacher) {
  return <p className="text-sm text-muted-foreground">Nexora Library is available to teachers only.</p>;
}

return <LibraryWorkspaceView variant="teacher" workspace={workspace} />;
```

- [ ] **Step 4: Re-run the UI tests to verify they pass**

Run: `cd next-frontend; npx jest --runTestsByPath "src/components/library/LibraryWorkspaceView.teacher.test.tsx" --runInBand`

Expected: PASS for teacher tabs, read-only general modules, and teacher AI toggle.

- [ ] **Step 5: Commit**

```bash
git add next-frontend/src/components/library/LibraryWorkspaceView.tsx next-frontend/src/components/library/TeacherLibraryPage.tsx next-frontend/src/components/library/LibraryWorkspaceView.teacher.test.tsx
git commit -m "feat: render teacher library tabs and permissions"
```

---

### Task 5: Attach Library Files Into Module Flows

**Files:**
- Create: `next-frontend/src/components/library/LibraryFilePickerDialog.tsx`
- Modify: `next-frontend/src/services/module-service.ts`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.library-download.test.tsx`
- Modify: `backend/src/modules/content-modules/content-modules.service.ts`
- Modify: `backend/src/modules/content-modules/content-modules.controller.ts`
- Modify: `backend/src/modules/content-modules/content-modules.service.spec.ts`
- Modify: `backend/src/modules/content-modules/content-modules.controller.spec.ts`

- [ ] **Step 1: Write the failing attach/download tests**

```ts
it('allows teachers to attach a visible general module file by fileId', async () => {
  await service.attachItem(
    'section-1',
    { itemType: ModuleItemType.File, fileId: 'general-file-1' },
    'teacher-1',
    ['teacher'],
  );

  expect(insertedItem.fileId).toBe('general-file-1');
});

it('allows students to download an attached personal teacher file through module context', async () => {
  const result = await service.getAttachedFileForStudent(
    'item-1',
    'student-1',
    ['student'],
  );
  expect(result.id).toBe('private-file-1');
});
```

```tsx
it('attaches an existing library file instead of uploading a new pdf', async () => {
  render(<TeacherModuleDetailPage />);
  await user.click(screen.getByRole('button', { name: 'Add Block' }));
  await user.click(screen.getByRole('button', { name: 'Choose from Library' }));
  await user.click(screen.getByRole('button', { name: 'Use General Science File' }));

  expect(mockedModuleService.attachItem).toHaveBeenCalledWith(
    'section-1',
    expect.objectContaining({ itemType: 'file', fileId: 'general-file-1' }),
  );
});

it('downloads file blocks through moduleService.downloadAttachedFile on the student page', async () => {
  render(<StudentModuleDetailPage />);
  await user.click(screen.getByRole('button', { name: /download attachment/i }));
  expect(mockedModuleService.downloadAttachedFile).toHaveBeenCalledWith('item-file-1');
});
```

- [ ] **Step 2: Run the backend and frontend attach tests to verify they fail**

Run: `cd backend; npm run test -- content-modules`

Expected: FAIL because the service does not yet expose module-scoped file download or hidden-general validation.

Run: `cd next-frontend; npx jest --runTestsByPath "app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx" "app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.library-download.test.tsx" --runInBand`

Expected: FAIL because the teacher page only supports upload-new and the student page still uses `fileService.download`.

- [ ] **Step 3: Implement attach picker and module-scoped file access**

```ts
// backend/src/modules/content-modules/content-modules.service.ts
if (dto.fileId) {
  const file = await this.db.query.uploadedFiles.findFirst({
    where: eq(uploadedFiles.id, dto.fileId),
    columns: {
      id: true,
      classId: true,
      teacherId: true,
      scope: true,
      teacherVisible: true,
    },
  });

  if (!file) {
    throw new NotFoundException(`File with ID "${dto.fileId}" not found`);
  }

  if (file.scope === 'general' && file.teacherVisible === false && !userRoles.includes('admin')) {
    throw new ForbiddenException('Hidden general modules cannot be attached.');
  }

  if (file.scope === 'private' && file.teacherId !== userId) {
    throw new ForbiddenException('You can only attach your own private library files.');
  }

  if (file.classId && file.classId !== section.module.classId) {
    throw new BadRequestException('Class-scoped file must belong to the same class as the module');
  }
}

async getAttachedFileForStudent(itemId: string, userId: string, userRoles: string[]) {
  const item = await this.getVisibleModuleItemContext(itemId, userId, userRoles);
  if (!item.fileId) {
    throw new NotFoundException('Attached file not found.');
  }
  return this.db.query.uploadedFiles.findFirst({ where: eq(uploadedFiles.id, item.fileId) });
}
```

```ts
// backend/src/modules/content-modules/content-modules.controller.ts
@Get('items/:itemId/file/download')
@Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
async downloadAttachedFile(
  @Param('itemId') itemId: string,
  @CurrentUser() user: any,
  @Res({ passthrough: true }) res: Response,
) {
  const file = await this.contentModulesService.getAttachedFileForStudent(
    itemId,
    user?.userId,
    user?.roles ?? [],
  );
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
  return new StreamableFile(createReadStream(resolve(file.filePath)));
}
```

```ts
// next-frontend/src/services/module-service.ts
async downloadAttachedFile(itemId: string): Promise<Blob> {
  const { data } = await api.get(`/modules/items/${itemId}/file/download`, {
    responseType: 'blob',
  });
  return data;
}
```

```tsx
// next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx
{attachState.itemType === 'file' ? (
  <>
    <button type="button" onClick={() => setAttachSource('upload')}>Upload New PDF</button>
    <button type="button" onClick={() => setAttachSource('library')}>Choose from Library</button>
    {attachSource === 'library' ? (
      <LibraryFilePickerDialog
        open={pickerOpen}
        scopeOptions={['general', 'private']}
        onSelect={(file) =>
          setAttachState((prev) =>
            prev ? { ...prev, itemType: 'file', fileId: file.id, file: null } : prev,
          )
        }
      />
    ) : null}
  </>
) : null}
```

```tsx
// next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.tsx
const downloadAttachment = async (itemId: string, fallbackName: string) => {
  const blob = await moduleService.downloadAttachedFile(itemId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fallbackName;
  anchor.click();
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 4: Re-run the attach/download tests to verify they pass**

Run: `cd backend; npm run test -- content-modules`

Expected: PASS for visible general attach, private ownership attach, and module-scoped student download.

Run: `cd next-frontend; npx jest --runTestsByPath "app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx" "app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.library-download.test.tsx" --runInBand`

Expected: PASS for teacher library picker attach and student module download route.

- [ ] **Step 5: Commit**

```bash
git add next-frontend/src/components/library/LibraryFilePickerDialog.tsx next-frontend/src/services/module-service.ts next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.tsx next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.library-download.test.tsx backend/src/modules/content-modules/content-modules.service.ts backend/src/modules/content-modules/content-modules.controller.ts backend/src/modules/content-modules/content-modules.service.spec.ts backend/src/modules/content-modules/content-modules.controller.spec.ts
git commit -m "feat: attach library files into module flows"
```

---

### Task 6: Verification and Demo Sweep

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/library/page.test.tsx`
- Modify: `next-frontend/src/components/library/LibraryWorkspaceView.teacher.test.tsx`
- Modify: `backend/src/modules/file-upload/file-upload.service.spec.ts`
- Modify: `backend/src/modules/content-modules/content-modules.service.spec.ts`
- Modify: `ai-service/tests/test_retrieval_service.py`

- [ ] **Step 1: Add the final regression assertions**

```tsx
it('shows general modules as read-only and my library as editable', async () => {
  render(<DashboardTeacherLibraryPage />);
  await user.click(screen.getByRole('tab', { name: 'General Modules' }));
  expect(screen.queryByRole('button', { name: 'Delete File' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('tab', { name: 'My Library' }));
  expect(screen.getByRole('button', { name: 'Upload File' })).toBeEnabled();
});
```

```ts
it('does not list hidden general modules to teachers', async () => {
  const result = await service.findAll(teacherUser, { scope: FileScopeDto.General });
  expect(result.data.every((file) => file.teacherVisible !== false)).toBe(true);
});
```

```py
def test_teacher_private_chunks_do_not_leak_to_other_teachers(self):
    results = asyncio.run(
        similarity_search(
            db,
            query_text="forces",
            class_id="class-2",
            teacher_id="teacher-2",
            subject_key="science",
            grade_level="7",
            include_library=True,
        )
    )
    self.assertFalse(any(item["libraryFileId"] == "teacher-1-file" for item in results))
```

- [ ] **Step 2: Run the full targeted test matrix**

Run: `cd backend; npm run test -- file-upload content-modules`

Expected: PASS

Run: `cd ai-service; python -m unittest tests.test_library_indexing_pipeline tests.test_retrieval_service`

Expected: PASS

Run: `cd next-frontend; npx jest --runTestsByPath "app/(dashboard)/dashboard/teacher/library/page.test.tsx" "src/components/library/LibraryWorkspaceView.teacher.test.tsx" "app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx" "app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.library-download.test.tsx" --runInBand`

Expected: PASS

- [ ] **Step 3: Run build-level verification**

Run: `cd backend; npm run build`

Expected: PASS

Run: `cd next-frontend; npm run build`

Expected: PASS

- [ ] **Step 4: Run browser/demo verification**

Run:

```bash
cd next-frontend
npm run dev
```

Manual checks:
- Log in as `admin@lms.local / Test@123` and confirm `/dashboard/admin/library` still works.
- Log in as a seeded teacher and open `/dashboard/teacher/library`.
- In `General Modules`, filter `Science + Grade 7`, preview a file, and verify no edit controls appear.
- In `My Library`, upload one `personal` TXT and one `class` PDF with subject/grade metadata.
- Toggle `Use in AI` off for one file and confirm the API update succeeds.
- Open a teacher class module, attach one general module file and one personal library file.
- Open the same module as a student and confirm attached file download works from the module page.

- [ ] **Step 5: Commit the final verification fixes**

```bash
git add backend/src/modules/file-upload/file-upload.service.spec.ts backend/src/modules/content-modules/content-modules.service.spec.ts ai-service/tests/test_retrieval_service.py next-frontend/app/(dashboard)/dashboard/teacher/library/page.test.tsx next-frontend/src/components/library/LibraryWorkspaceView.teacher.test.tsx next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.library-download.test.tsx
git commit -m "test: cover teacher library and module attachment flows"
```

---

## Self-Review

- Spec coverage:
  - `General Modules` read-only: covered by Task 4 and Task 6.
  - `My Library` personal/class ownership: covered by Task 3 and Task 4.
  - `PDF/TXT/PPTX`, sanitization, and indexing: covered by Task 1 and Task 2.
  - `Use in AI / Do not use in AI`: covered by Task 1, Task 2, and Task 4.
  - Direct attach into class/material flows: covered by Task 5.
  - Student visibility only after attach: covered by Task 5 through module-scoped download.

- Placeholder scan:
  - No `TODO`, `TBD`, or “similar to previous task” shortcuts remain.

- Type consistency:
  - The plan uses `aiEnabled` consistently across backend, AI service, and frontend.
  - Teacher ownership uses existing `scope='private'` plus `classId` null/non-null instead of inventing a second ownership column.

