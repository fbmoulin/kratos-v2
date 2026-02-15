import { eq, and, desc, count } from 'drizzle-orm';
import { db, documents, extractions } from '@kratos/db';

export const documentRepo = {
  async listByUser(
    userId: string,
    page = 1,
    limit = 20,
    status?: string,
  ) {
    const offset = (page - 1) * limit;
    const filters = [eq(documents.userId, userId)];
    if (status) filters.push(eq(documents.status, status));

    const where = and(...filters);

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(where)
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(documents)
        .where(where),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  },

  async getById(userId: string, documentId: string) {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);

    return doc ?? null;
  },

  async create(data: {
    id: string;
    userId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  }) {
    const [doc] = await db.insert(documents).values({
      ...data,
      status: 'pending',
    }).returning();

    return doc;
  },

  async updateStatus(userId: string, documentId: string, status: string) {
    const [doc] = await db
      .update(documents)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .returning();

    return doc ?? null;
  },

  async getExtraction(documentId: string) {
    const [extraction] = await db
      .select()
      .from(extractions)
      .where(eq(extractions.documentId, documentId))
      .limit(1);

    return extraction ?? null;
  },
};
