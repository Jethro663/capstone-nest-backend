import adminLifecycleConfig from './admin-lifecycle.config';

describe('admin lifecycle config', () => {
  const previous = process.env.ADMIN_LIFECYCLE_ENABLED;
  const previousCascade = process.env.ADMIN_CASCADE_ERASE_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.ADMIN_LIFECYCLE_ENABLED;
    else process.env.ADMIN_LIFECYCLE_ENABLED = previous;
    if (previousCascade === undefined)
      delete process.env.ADMIN_CASCADE_ERASE_ENABLED;
    else process.env.ADMIN_CASCADE_ERASE_ENABLED = previousCascade;
  });

  it('defaults execution to disabled', () => {
    delete process.env.ADMIN_LIFECYCLE_ENABLED;
    delete process.env.ADMIN_CASCADE_ERASE_ENABLED;
    expect(adminLifecycleConfig()).toEqual({
      enabled: false,
      cascadeEraseEnabled: false,
    });
  });

  it('enables execution only for the explicit true value', () => {
    process.env.ADMIN_LIFECYCLE_ENABLED = 'true';
    expect(adminLifecycleConfig()).toMatchObject({ enabled: true });

    process.env.ADMIN_LIFECYCLE_ENABLED = '1';
    expect(adminLifecycleConfig()).toMatchObject({ enabled: false });
  });

  it('enables cascade erasure only for the explicit true value', () => {
    process.env.ADMIN_CASCADE_ERASE_ENABLED = 'true';
    expect(adminLifecycleConfig()).toMatchObject({ cascadeEraseEnabled: true });

    process.env.ADMIN_CASCADE_ERASE_ENABLED = '1';
    expect(adminLifecycleConfig()).toMatchObject({ cascadeEraseEnabled: false });
  });
});
