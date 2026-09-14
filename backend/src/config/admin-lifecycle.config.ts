import { registerAs } from '@nestjs/config';

export default registerAs('adminLifecycle', () => ({
  enabled: process.env.ADMIN_LIFECYCLE_ENABLED === 'true',
  cascadeEraseEnabled: process.env.ADMIN_CASCADE_ERASE_ENABLED === 'true',
}));
