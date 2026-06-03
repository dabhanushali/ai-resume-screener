import { NextRequest, NextResponse } from 'next/server';
import { getSession, comparePassword, hashPassword } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { logActivity } from '@/utils/audit';

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Current password, new password, and confirmation are required' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation do not match' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'New password must be different from the current password' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 });
    }

    const currentPasswordMatches = await comparePassword(currentPassword, user.passwordHash);
    if (!currentPasswordMatches) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await logActivity(user.id, user.name, 'Password Change', {
      userId: user.id,
      email: user.email
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Change password error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
