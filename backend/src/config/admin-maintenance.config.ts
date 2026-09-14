import { registerAs } from '@nestjs/config';

export default registerAs('adminMaintenance', () => ({
  enabled: process.env.ADMIN_MAINTENANCE_ENABLED === 'true',
}));
