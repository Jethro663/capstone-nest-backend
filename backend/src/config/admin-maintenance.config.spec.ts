import adminMaintenanceConfig from './admin-maintenance.config';

describe('admin maintenance config', () => {
  const previousEnabled = process.env.ADMIN_MAINTENANCE_ENABLED;
  const previousDuration = process.env.ADMIN_MAINTENANCE_DURATION_MINUTES;

  afterEach(() => {
    if (previousEnabled === undefined)
      delete process.env.ADMIN_MAINTENANCE_ENABLED;
    else process.env.ADMIN_MAINTENANCE_ENABLED = previousEnabled;
    if (previousDuration === undefined)
      delete process.env.ADMIN_MAINTENANCE_DURATION_MINUTES;
    else process.env.ADMIN_MAINTENANCE_DURATION_MINUTES = previousDuration;
  });

  it('fails closed and uses a 15-minute duration by default', () => {
    delete process.env.ADMIN_MAINTENANCE_ENABLED;
    delete process.env.ADMIN_MAINTENANCE_DURATION_MINUTES;
    expect(adminMaintenanceConfig()).toEqual({
      enabled: false,
      durationMinutes: 15,
    });
  });

  it('enables only from exact true and reads the configured duration', () => {
    process.env.ADMIN_MAINTENANCE_ENABLED = 'true';
    process.env.ADMIN_MAINTENANCE_DURATION_MINUTES = '20';
    expect(adminMaintenanceConfig()).toEqual({
      enabled: true,
      durationMinutes: 20,
    });
  });
});
