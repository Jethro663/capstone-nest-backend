import {
  updateTemplateItemByIndex,
  updateTemplateModuleByIndex,
  updateTemplateSectionByIndex,
} from '@/lib/class-template-editor';
import type { ClassTemplateModule } from '@/types/class-template';

function sampleModules(): ClassTemplateModule[] {
  return [
    {
      title: 'Module 1',
      order: 1,
      sections: [
        {
          title: 'Section 1',
          order: 1,
          items: [
            {
              itemType: 'lesson',
              order: 1,
              metadata: { lessonTitle: 'Old Lesson' },
            },
          ],
        },
      ],
    },
  ];
}

describe('class-template-editor immutable helpers', () => {
  it('updates only the targeted module immutably', () => {
    const original = sampleModules();
    const next = updateTemplateModuleByIndex(original, 0, (moduleEntry) => ({
      ...moduleEntry,
      title: 'Updated Module',
    }));

    expect(next).not.toBe(original);
    expect(next[0]).not.toBe(original[0]);
    expect(next[0].title).toBe('Updated Module');
    expect(original[0].title).toBe('Module 1');
  });

  it('updates only the targeted section immutably', () => {
    const original = sampleModules();
    const next = updateTemplateSectionByIndex(original, 0, 0, (sectionEntry) => ({
      ...sectionEntry,
      title: 'Updated Section',
    }));

    expect(next).not.toBe(original);
    expect(next[0]).not.toBe(original[0]);
    expect(next[0].sections).not.toBe(original[0].sections);
    expect(next[0].sections?.[0]).not.toBe(original[0].sections?.[0]);
    expect(next[0].sections?.[0].title).toBe('Updated Section');
    expect(original[0].sections?.[0].title).toBe('Section 1');
  });

  it('updates only the targeted item immutably', () => {
    const original = sampleModules();
    const next = updateTemplateItemByIndex(original, 0, 0, 0, (itemEntry) => ({
      ...itemEntry,
      metadata: {
        ...(itemEntry.metadata ?? {}),
        lessonTitle: 'Updated Lesson',
      },
    }));

    expect(next).not.toBe(original);
    expect(next[0].sections?.[0].items).not.toBe(original[0].sections?.[0].items);
    expect(next[0].sections?.[0].items?.[0]).not.toBe(original[0].sections?.[0].items?.[0]);
    expect(next[0].sections?.[0].items?.[0].metadata?.lessonTitle).toBe('Updated Lesson');
    expect(original[0].sections?.[0].items?.[0].metadata?.lessonTitle).toBe('Old Lesson');
  });
});
