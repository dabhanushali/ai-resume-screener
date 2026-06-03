import { prisma } from './db';

/**
 * Creates an audit log entry in the database.
 * Does not block/throw on failure, but logs to console.
 */
export async function logActivity(
  userId: string | null,
  userName: string | null,
  action: string,
  metadata: Record<string, any> = {}
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userName: userName || 'System',
        action,
        metadata,
      } as any,
    });
  } catch (e) {
    console.error('Failed to log audit activity:', e);
  }
}
