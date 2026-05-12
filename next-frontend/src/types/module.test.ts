import type { ModuleFileRef } from './module';

describe('module file refs', () => {
  it('can carry the hydrated library file kind', () => {
    const file: ModuleFileRef = {
      id: 'file-1',
      originalName: 'quarter-one.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      fileKind: 'pptx',
      sizeBytes: 4096,
      scope: 'private',
    };

    expect(file.fileKind).toBe('pptx');
  });
});
