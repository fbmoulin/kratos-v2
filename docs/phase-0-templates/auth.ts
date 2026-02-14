import { Context, Next } from 'hono';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

/**
 * Middleware de autenticação via Supabase JWT.
 * Extrai o token Bearer do header Authorization,
 * valida com Supabase e injeta o usuário no contexto.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Injeta o usuário no contexto para uso nas rotas
    c.set('user', user);
    c.set('userId', user.id);

    await next();
  } catch {
    return c.json({ error: 'Authentication failed' }, 500);
  }
}
