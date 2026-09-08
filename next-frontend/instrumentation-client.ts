import { z } from 'zod';

// Zod's optional JIT uses Function(); browser validation must work under strict CSP.
z.config({ jitless: true });
