import { db, auditLogs } from '@kratos/db';

export const auditRepo = {
  async create(data: {
    entityType: string;
    entityId: string;
    action: string;
    payloadBefore?: Record<string, unknown> | null;
    payloadAfter?: Record<string, unknown> | null;
    userId?: string | null;
  }) {
    const [log] = await db.insert(auditLogs).values({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      payloadBefore: data.payloadBefore ?? null,
      payloadAfter: data.payloadAfter ?? null,
      userId: data.userId ?? null,
    }).returning();

    return log;
  },
};
