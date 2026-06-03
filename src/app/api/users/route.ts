import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { logActivity } from '@/utils/audit';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true
      }
    });
    return NextResponse.json({ success: true, users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, password } = await req.json();
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing name, email, or password' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Temporary password must be at least 8 characters long' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email }
    });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        status: 'ACTIVE'
      }
    });

    // Register user invitation audit trail
    await logActivity(session.userId, session.name, 'User Invitation', {
      invitedUserId: newUser.id,
      invitedEmail: email,
      invitedName: name
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (e: any) {
    console.error('Invite user error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
