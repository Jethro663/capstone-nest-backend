import { AssessmentsService } from './assessments.service';

describe('assessment publication content validation', () => {
  const validate = (
    content: string,
    options = [
      { text: 'Yes', isCorrect: true },
      { text: 'No', isCorrect: false },
    ],
  ) => {
    const service = Object.create(
      AssessmentsService.prototype,
    ) as AssessmentsService;
    service.getAssessmentById = jest.fn().mockResolvedValue({
      title: 'Draft',
      type: 'quiz',
      passingScore: 60,
      questions: [{ type: 'multiple_choice', content, points: 1, options }],
    });
    return (
      service as unknown as { validateForPublish(id: string): Promise<void> }
    ).validateForPublish('draft');
  };

  it.each([
    '<p></p>',
    '<p><br></p>',
    '<p>&nbsp;</p>',
    '<script>alert(1)</script>',
  ])('rejects visually empty question %s', async (content) => {
    await expect(validate(content)).rejects.toThrow(
      'Assessment cannot be published',
    );
  });

  it('rejects a blank answer choice even when an answer is marked', async () => {
    await expect(
      validate('<p>Question?</p>', [
        { text: '', isCorrect: true },
        { text: 'No', isCorrect: false },
      ]),
    ).rejects.toThrow('Assessment cannot be published');
  });

  it('accepts complete rich text', async () => {
    await expect(
      validate('<p><strong>Question?</strong></p>'),
    ).resolves.toBeUndefined();
  });
});
