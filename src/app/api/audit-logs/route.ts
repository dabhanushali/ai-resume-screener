import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { jsonObject } from '@/utils/json';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100 // Return the most recent 100 logs for high responsiveness
    });

    const formattedLogs = logs.map((l: any) => ({
      ...l,
      metadata: jsonObject(l.metadata)
    }));

    return NextResponse.json({ success: true, logs: formattedLogs });
  } catch (e: any) {
    console.error('Fetch audit logs error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
