import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { jsonArray } from '@/utils/json';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId') || '';

  try {
    const screenings = await prisma.screening.findMany({
      where: jobId ? { jobId } : {},
      include: {
        candidate: true,
        job: true
      },
      orderBy: { matchScore: 'desc' }
    });

    const reportData = screenings.map((s: any) => {
      const parsedCandidateSkills = jsonArray<string>(s.candidate.skills);
      const parsedRequiredSkills = jsonArray<string>(s.job.requiredSkills);
      
      const matched = parsedRequiredSkills.filter((sk: string) => 
        parsedCandidateSkills.some((ck: string) => ck.toLowerCase() === sk.toLowerCase())
      );
      const missing = parsedRequiredSkills.filter((sk: string) => 
        !parsedCandidateSkills.some((ck: string) => ck.toLowerCase() === sk.toLowerCase())
      );

      return {
        candidateName: s.candidate.name,
        email: s.candidate.email,
        phone: s.candidate.phone,
        experience: s.candidate.totalExperience,
        currentCompany: s.candidate.currentCompany || 'N/A',
        location: s.candidate.location,
        matchedSkills: matched.join(', '),
        missingSkills: missing.join(', '),
        matchScore: s.matchScore,
        recommendation: s.recommendation,
        hrStatus: s.hrStatus,
        remarks: s.remarks || ''
      };
    });

    return NextResponse.json({ success: true, report: reportData });
  } catch (e: any) {
    console.error('Fetch reports error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
