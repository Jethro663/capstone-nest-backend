import { registerAs } from '@nestjs/config';

export default registerAs('adminDemoMode', () => ({
  available: process.env.ADMIN_DEMO_MODE_AVAILABLE === 'true',
}));
