import adminMaintenanceConfig from './admin-maintenance.config';

describe('admin maintenance config', () => {
  const previousEnabled = process.env.ADMIN_MAINTENANCE_ENABLED;

  afterEach(() => {
    if (previousEnabled === undefined)
      delete process.env.ADMIN_MAINTENANCE_ENABLED;
    else process.env.ADMIN_MAINTENANCE_ENABLED = previousEnabled;
  });

  it('fails closed by default', () => {
    delete process.env.ADMIN_MAINTENANCE_ENABLED;
    expect(adminMaintenanceConfig()).toEqual({
      enabled: false,
    });
  });

  it('enables only from exact true', () => {
    process.env.ADMIN_MAINTENANCE_ENABLED = 'true';
    expect(adminMaintenanceConfig()).toEqual({
      enabled: true,
    });
  });
});
