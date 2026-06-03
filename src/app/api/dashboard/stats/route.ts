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
    const totalCandidates = await prisma.candidate.count();
    const totalJobs = await prisma.job.count();

    // Fetch screening scores to compute statistics
    const screenings = await prisma.screening.findMany({
      select: {
        matchScore: true,
        hrStatus: true
      }
    });

    const shortlisted = screenings.filter(
      (s: any) => s.hrStatus === 'SHORTLISTED' || (s.hrStatus === 'PENDING' && s.matchScore >= 75)
    ).length;

    const rejected = screenings.filter(
      (s: any) => s.hrStatus === 'REJECTED' || (s.hrStatus === 'PENDING' && s.matchScore < 50)
    ).length;

    const pending = screenings.filter(
      (s: any) => s.hrStatus === 'HOLD' || (s.hrStatus === 'PENDING' && s.matchScore >= 50 && s.matchScore < 75)
    ).length;

    // Performance & Analytics computations
    const totalScores = screenings.reduce((sum: number, s: any) => sum + s.matchScore, 0);
    const averageMatchScore = screenings.length > 0 ? Math.round(totalScores / screenings.length) : 0;
    
    const candidatesPerJob = totalJobs > 0 ? parseFloat((totalCandidates / totalJobs).toFixed(1)) : 0;
    const screeningSuccessRate = screenings.length > 0 ? Math.round((shortlisted / screenings.length) * 100) : 0;

    // Latest candidates registered in pool
    const latestCandidates = await prisma.candidate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        currentDesignation: true,
        createdAt: true
      }
    });

    // Recent audit activities list
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 8
    });

    const formattedLogs = recentLogs.map((l: any) => ({
      ...l,
      metadata: jsonObject(l.metadata)
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalCandidates,
        totalJobs,
        shortlisted,
        rejected,
        pending,
        averageMatchScore,
        candidatesPerJob,
        screeningSuccessRate
      },
      latestCandidates,
      recentActivity: formattedLogs
    });
  } catch (e: any) {
    console.error('Fetch dashboard stats error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
