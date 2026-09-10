import adminLifecycleConfig from './admin-lifecycle.config';

describe('admin lifecycle config', () => {
  const previous = process.env.ADMIN_LIFECYCLE_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.ADMIN_LIFECYCLE_ENABLED;
    else process.env.ADMIN_LIFECYCLE_ENABLED = previous;
  });

  it('defaults execution to disabled', () => {
    delete process.env.ADMIN_LIFECYCLE_ENABLED;
    expect(adminLifecycleConfig()).toEqual({ enabled: false });
  });

  it('enables execution only for the explicit true value', () => {
    process.env.ADMIN_LIFECYCLE_ENABLED = 'true';
    expect(adminLifecycleConfig()).toEqual({ enabled: true });

    process.env.ADMIN_LIFECYCLE_ENABLED = '1';
    expect(adminLifecycleConfig()).toEqual({ enabled: false });
  });
});
