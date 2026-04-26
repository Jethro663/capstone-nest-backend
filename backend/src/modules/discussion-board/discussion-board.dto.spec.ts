import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDiscussionThreadDto } from './DTO/discussion-thread.dto';

async function errorsFor(dto: object) {
  return validate(plainToInstance(CreateDiscussionThreadDto, dto));
}

describe('CreateDiscussionThreadDto', () => {
  it('accepts a valid discussion thread payload', async () => {
    const errors = await errorsFor({
      title: 'Week 2 Open Forum',
      bodyHtml: '<p>Share your questions.</p>',
      themeId: 'classic',
      commentLimitPerStudent: 1,
      allowComments: true,
      isPinned: false,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects an empty title', async () => {
    const errors = await errorsFor({
      title: '',
      bodyHtml: '<p>Share your questions.</p>',
    });

    expect(errors.some((error) => error.property === 'title')).toBe(true);
  });

  it('rejects an empty body', async () => {
    const errors = await errorsFor({
      title: 'Week 2 Open Forum',
      bodyHtml: '',
    });

    expect(errors.some((error) => error.property === 'bodyHtml')).toBe(true);
  });
});
