import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { logActivity } from '@/utils/audit';

export async function POST(req: NextRequest) {
  const session = getSession(req);
  
  const response = NextResponse.json({ success: true });
  
  // Clear cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });

  if (session) {
    await logActivity(session.userId, session.name, 'User Logout', { email: session.email });
  }

  return response;
}
