import { validate } from 'class-validator';
import {
  ActivateAdminDemoModeDto,
  DeactivateAdminDemoModeDto,
  REQUIRED_DEMO_ACKNOWLEDGEMENTS,
} from './admin-demo-mode.dto';

describe('admin demo mode DTOs', () => {
  const validActivation = () =>
    Object.assign(new ActivateAdminDemoModeDto(), {
      currentPassword: 'DemoOnly!456',
      confirmation: 'ENABLE DEMO MODE',
      reason: 'Prepare a complete presentation flow.',
      durationMinutes: 30,
      expectedVersion: 0,
      acknowledgements: [...REQUIRED_DEMO_ACKNOWLEDGEMENTS],
    });

  it('accepts the complete exact activation contract', async () => {
    await expect(validate(validActivation())).resolves.toEqual([]);
  });

  it.each([
    ['wrong phrase', { confirmation: 'enable demo mode' }],
    ['short reason', { reason: 'too short' }],
    ['unsupported duration', { durationMinutes: 45 }],
    ['negative version', { expectedVersion: -1 }],
    [
      'duplicate acknowledgement',
      {
        acknowledgements: [
          ...REQUIRED_DEMO_ACKNOWLEDGEMENTS,
          REQUIRED_DEMO_ACKNOWLEDGEMENTS[0],
        ],
      },
    ],
    ['unknown acknowledgement', { acknowledgements: ['UNKNOWN'] }],
  ])('rejects %s', async (_label, change) => {
    expect(
      await validate(Object.assign(validActivation(), change)),
    ).not.toEqual([]);
  });

  it('requires the exact deactivation phrase and a current version', async () => {
    const valid = Object.assign(new DeactivateAdminDemoModeDto(), {
      confirmation: 'DISABLE DEMO MODE',
      expectedVersion: 3,
    });
    await expect(validate(valid)).resolves.toEqual([]);

    const invalid = Object.assign(new DeactivateAdminDemoModeDto(), {
      confirmation: 'disable',
      expectedVersion: -1,
    });
    expect(await validate(invalid)).not.toEqual([]);
  });
});
