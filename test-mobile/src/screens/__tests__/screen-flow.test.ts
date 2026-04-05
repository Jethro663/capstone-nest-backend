import {
  buildProfileFullName,
  buildTutorAnswerPayload,
  canSendTutorMessage,
  canSubmitTutorAnswers,
  computeProfileReadiness,
  resolveInitialLxpClassId,
  resolveInitialTutorClassId,
} from '../screen-flow';

describe('mobile screen flow helpers', () => {
  it('prefers existing LXP selected class before fallback sources', () => {
    expect(
      resolveInitialLxpClassId({
        selectedClassId: 'class-selected',
        eligibleClassId: 'class-eligible',
        tutorSelectedClassId: 'class-tutor',
        fallbackClassId: 'class-fallback',
      }),
    ).toBe('class-selected');
  });

  it('resolves LXP class in eligibility -> tutor -> class-list order', () => {
    expect(
      resolveInitialLxpClassId({
        eligibleClassId: 'class-eligible',
        tutorSelectedClassId: 'class-tutor',
        fallbackClassId: 'class-fallback',
      }),
    ).toBe('class-eligible');

    expect(
      resolveInitialLxpClassId({
        tutorSelectedClassId: 'class-tutor',
        fallbackClassId: 'class-fallback',
      }),
    ).toBe('class-tutor');

    expect(
      resolveInitialLxpClassId({
        fallbackClassId: 'class-fallback',
      }),
    ).toBe('class-fallback');
  });

  it('resolves tutor class in selected -> bootstrap-selected -> bootstrap-first order', () => {
    expect(
      resolveInitialTutorClassId({
        selectedClassId: 'selected',
        bootstrapSelectedClassId: 'bootstrap-selected',
        bootstrapFirstClassId: 'bootstrap-first',
      }),
    ).toBe('selected');

    expect(
      resolveInitialTutorClassId({
        bootstrapSelectedClassId: 'bootstrap-selected',
        bootstrapFirstClassId: 'bootstrap-first',
      }),
    ).toBe('bootstrap-selected');

    expect(
      resolveInitialTutorClassId({
        bootstrapFirstClassId: 'bootstrap-first',
      }),
    ).toBe('bootstrap-first');
  });

  it('allows tutor message send only with active session and non-empty trimmed text', () => {
    expect(canSendTutorMessage(undefined, 'hello')).toBe(false);
    expect(canSendTutorMessage('session-1', '   ')).toBe(false);
    expect(canSendTutorMessage('session-1', ' hello ')).toBe(true);
  });

  it('builds ordered tutor answer payload by question IDs with empty fallback', () => {
    expect(
      buildTutorAnswerPayload(['q1', 'q2', 'q3'], {
        q1: 'answer one',
        q3: 'answer three',
      }),
    ).toEqual(['answer one', '', 'answer three']);
  });

  it('allows tutor answer submission only when at least one answer has text', () => {
    expect(canSubmitTutorAnswers(['q1', 'q2'], { q1: '   ', q2: '' })).toBe(false);
    expect(canSubmitTutorAnswers(['q1', 'q2'], { q1: ' 42 ', q2: '' })).toBe(true);
  });

  it('builds profile full name from names, then email, then Student fallback', () => {
    expect(
      buildProfileFullName({
        firstName: '  Ada ',
        lastName: ' Lovelace ',
        email: 'ada@example.com',
      }),
    ).toBe('Ada Lovelace');

    expect(
      buildProfileFullName({
        firstName: '   ',
        lastName: '',
        email: 'student@example.com',
      }),
    ).toBe('student@example.com');

    expect(buildProfileFullName({})).toBe('Student');
  });

  it('computes profile readiness from filled profile checkpoints', () => {
    expect(
      computeProfileReadiness({
        phone: '09171234567',
        address: '123 Main St',
        familyName: 'Parent Name',
        familyContact: '09998887777',
        profilePicture: '/uploads/avatar.jpg',
      }),
    ).toBe(100);

    expect(
      computeProfileReadiness({
        phone: '09171234567',
        address: '   ',
        familyName: '',
        familyContact: null,
        profilePicture: '/uploads/avatar.jpg',
      }),
    ).toBe(40);
  });
});
