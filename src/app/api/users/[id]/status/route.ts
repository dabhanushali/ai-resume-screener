import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { logActivity } from '@/utils/audit';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Recruiter cannot disable themselves
    if (targetUser.id === session.userId) {
      return NextResponse.json({ error: 'You cannot disable or enable your own account' }, { status: 400 });
    }

    const nextStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: nextStatus }
    });

    const logAction = nextStatus === 'ACTIVE' ? 'User Enable' : 'User Disable';
    await logActivity(session.userId, session.name, logAction, {
      modifiedUserId: updated.id,
      modifiedEmail: updated.email,
      newStatus: nextStatus
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (e: any) {
    console.error('Status change error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
