import type { Hono } from 'hono';
import type { User } from '@supabase/supabase-js';

/** Hono environment with custom variables set by auth middleware */
export type AppEnv = {
  Variables: {
    userId: string;
    user: User;
    requestId: string;
  };
};
