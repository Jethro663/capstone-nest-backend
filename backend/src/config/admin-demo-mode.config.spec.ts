import adminDemoModeConfig from './admin-demo-mode.config';

describe('admin demo mode config', () => {
  const previous = process.env.ADMIN_DEMO_MODE_AVAILABLE;

  afterEach(() => {
    if (previous === undefined) delete process.env.ADMIN_DEMO_MODE_AVAILABLE;
    else process.env.ADMIN_DEMO_MODE_AVAILABLE = previous;
  });

  it('fails closed unless the value is exactly true', () => {
    for (const value of [undefined, '', '1', 'TRUE', 'yes']) {
      if (value === undefined) delete process.env.ADMIN_DEMO_MODE_AVAILABLE;
      else process.env.ADMIN_DEMO_MODE_AVAILABLE = value;
      expect(adminDemoModeConfig()).toEqual({ available: false });
    }

    process.env.ADMIN_DEMO_MODE_AVAILABLE = 'true';
    expect(adminDemoModeConfig()).toEqual({ available: true });
  });
});
