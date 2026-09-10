import { registerAs } from '@nestjs/config';

export default registerAs('adminLifecycle', () => ({
  enabled: process.env.ADMIN_LIFECYCLE_ENABLED === 'true',
}));
