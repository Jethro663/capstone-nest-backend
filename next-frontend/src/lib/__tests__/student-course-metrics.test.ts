import type { Assessment } from '@/types/assessment';
import type { ClassModule } from '@/types/module';
import { deriveStudentCourseMetrics } from '@/lib/student-course-metrics';

function createModule(overrides: Partial<ClassModule> = {}): ClassModule {
  return {
    id: 'module-1',
    classId: 'class-1',
    title: 'Module 1',
    order: 1,
    isVisible: true,
    isLocked: false,
    sections: [],
    gradingScaleEntries: [],
    ...overrides,
  };
}

function createAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    title: 'Assessment 1',
    classId: 'class-1',
    type: 'quiz' as Assessment['type'],
    isPublished: true,
    questions: [],
    ...overrides,
  };
}

describe('deriveStudentCourseMetrics', () => {
  it('counts only visible lesson blocks and given assessment work for student cards', () => {
    const metrics = deriveStudentCourseMetrics({
      modules: [
        createModule({
          sections: [
            {
              id: 'section-1',
              moduleId: 'module-1',
              title: 'Section 1',
              order: 1,
              items: [
                {
                  id: 'item-visible-lesson',
                  moduleSectionId: 'section-1',
                  itemType: 'lesson',
                  lessonId: 'lesson-visible',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: true,
                  lesson: {
                    id: 'lesson-visible',
                    classId: 'class-1',
                    title: 'Visible Lesson',
                    description: '',
                    order: 1,
                    isDraft: false,
                  },
                },
                {
                  id: 'item-hidden-lesson',
                  moduleSectionId: 'section-1',
                  itemType: 'lesson',
                  lessonId: 'lesson-hidden',
                  order: 2,
                  isVisible: false,
                  isRequired: true,
                  isGiven: true,
                  lesson: {
                    id: 'lesson-hidden',
                    classId: 'class-1',
                    title: 'Hidden Lesson',
                    description: '',
                    order: 2,
                    isDraft: false,
                  },
                },
                {
                  id: 'item-given-assessment',
                  moduleSectionId: 'section-1',
                  itemType: 'assessment',
                  assessmentId: 'assessment-attached-visible',
                  order: 3,
                  isVisible: true,
                  isRequired: true,
                  isGiven: true,
                  assessment: {
                    id: 'assessment-attached-visible',
                    classId: 'class-1',
                    title: 'Visible Given Assessment',
                    description: '',
                    type: 'quiz',
                    totalPoints: 10,
                    isPublished: true,
                  },
                },
                {
                  id: 'item-hidden-assessment',
                  moduleSectionId: 'section-1',
                  itemType: 'assessment',
                  assessmentId: 'assessment-attached-hidden',
                  order: 4,
                  isVisible: false,
                  isRequired: true,
                  isGiven: true,
                  assessment: {
                    id: 'assessment-attached-hidden',
                    classId: 'class-1',
                    title: 'Hidden Assessment',
                    description: '',
                    type: 'quiz',
                    totalPoints: 10,
                    isPublished: true,
                  },
                },
              ],
            },
          ],
        }),
        createModule({
          id: 'module-hidden',
          isVisible: false,
          sections: [
            {
              id: 'section-hidden-module',
              moduleId: 'module-hidden',
              title: 'Hidden Section',
              order: 1,
              items: [
                {
                  id: 'item-hidden-module-lesson',
                  moduleSectionId: 'section-hidden-module',
                  itemType: 'lesson',
                  lessonId: 'lesson-hidden-module',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: true,
                  lesson: {
                    id: 'lesson-hidden-module',
                    classId: 'class-1',
                    title: 'Lesson Hidden By Module',
                    description: '',
                    order: 1,
                    isDraft: false,
                  },
                },
              ],
            },
          ],
        }),
      ],
      assessments: [
        createAssessment({ id: 'assessment-attached-visible', title: 'Visible Given Assessment' }),
        createAssessment({ id: 'assessment-attached-hidden', title: 'Hidden Assessment' }),
        createAssessment({ id: 'assessment-standalone', title: 'Standalone Published Assessment' }),
      ],
      completedLessonIds: ['lesson-visible'],
    });

    expect(metrics).toEqual({
      totalLessons: 1,
      completedCount: 1,
      totalAssessments: 2,
      pendingCount: 2,
      progress: 100,
    });
  });

  it('keeps visible draft lessons and ungiven assessments out of the counts', () => {
    const metrics = deriveStudentCourseMetrics({
      modules: [
        createModule({
          sections: [
            {
              id: 'section-1',
              moduleId: 'module-1',
              title: 'Section 1',
              order: 1,
              items: [
                {
                  id: 'item-draft-lesson',
                  moduleSectionId: 'section-1',
                  itemType: 'lesson',
                  lessonId: 'lesson-draft',
                  order: 1,
                  isVisible: true,
                  isRequired: true,
                  isGiven: true,
                  lesson: {
                    id: 'lesson-draft',
                    classId: 'class-1',
                    title: 'Draft Lesson',
                    description: '',
                    order: 1,
                    isDraft: true,
                  },
                },
                {
                  id: 'item-ungiven-assessment',
                  moduleSectionId: 'section-1',
                  itemType: 'assessment',
                  assessmentId: 'assessment-ungiven',
                  order: 2,
                  isVisible: true,
                  isRequired: true,
                  isGiven: false,
                  assessment: {
                    id: 'assessment-ungiven',
                    classId: 'class-1',
                    title: 'Ungiven Assessment',
                    description: '',
                    type: 'quiz',
                    totalPoints: 10,
                    isPublished: true,
                  },
                },
              ],
            },
          ],
        }),
      ],
      assessments: [createAssessment({ id: 'assessment-ungiven', title: 'Ungiven Assessment' })],
      completedLessonIds: [],
    });

    expect(metrics).toEqual({
      totalLessons: 0,
      completedCount: 0,
      totalAssessments: 0,
      pendingCount: 0,
      progress: 0,
    });
  });
});
