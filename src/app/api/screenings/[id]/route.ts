import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { logActivity } from '@/utils/audit';
import { aiService, calculateDetailedScore, type JobRequirements, type ParsedResume } from '@/utils/ai';
import { jsonArray } from '@/utils/json';

function buildParsedResume(candidate: any): ParsedResume {
  return {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    linkedinUrl: candidate.linkedinUrl || undefined,
    portfolioUrl: candidate.portfolioUrl || undefined,
    currentRole: candidate.currentDesignation || undefined,
    currentCompany: candidate.currentCompany || undefined,
    totalExperience: candidate.totalExperience,
    skills: jsonArray<string>(candidate.skills),
    certifications: jsonArray<string>(candidate.certifications),
    education: jsonArray(candidate.education),
    employmentHistory: jsonArray(candidate.employmentHistory),
    projects: jsonArray(candidate.projects),
    noticePeriod: candidate.noticePeriod || undefined
  };
}

function buildJobRequirements(job: any): JobRequirements {
  return {
    title: job.title,
    department: job.department,
    employmentType: job.employmentType,
    location: job.location,
    minExperience: job.minExperience,
    maxExperience: job.maxExperience,
    requiredSkills: jsonArray<string>(job.requiredSkills),
    preferredSkills: jsonArray<string>(job.preferredSkills),
    minDegree: job.minDegree,
    minGpa: job.minGpa || '',
    noticePeriod: job.noticePeriod,
    certifications: jsonArray<string>(job.certifications),
    keywords: jsonArray<string>(job.keywords),
    weightSkills: job.weightSkills,
    weightExperience: job.weightExperience,
    weightRelevance: job.weightRelevance,
    weightPreferred: job.weightPreferred,
    weightEducation: job.weightEducation,
    weightNoticePeriod: job.weightNoticePeriod,
    thresholdShortlist: job.thresholdShortlist,
    thresholdReview: job.thresholdReview
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const screening = await prisma.screening.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true
      }
    });

    if (!screening) {
      return NextResponse.json({ error: 'Evaluation profile not found' }, { status: 404 });
    }

    const formattedScreening = {
      ...screening,
      strengths: jsonArray<string>(screening.strengths),
      weaknesses: jsonArray<string>(screening.weaknesses),
      missingSkills: jsonArray<string>(screening.missingSkills),
      candidate: {
        ...screening.candidate,
        skills: jsonArray<string>(screening.candidate.skills),
        certifications: jsonArray<string>(screening.candidate.certifications),
        education: jsonArray(screening.candidate.education),
        employmentHistory: jsonArray(screening.candidate.employmentHistory),
        projects: jsonArray(screening.candidate.projects)
      },
      job: {
        ...screening.job,
        requiredSkills: jsonArray<string>(screening.job.requiredSkills),
        preferredSkills: jsonArray<string>(screening.job.preferredSkills),
        certifications: jsonArray<string>(screening.job.certifications),
          keywords: jsonArray<string>(screening.job.keywords)
      }
    };

    const scoring = calculateDetailedScore(buildParsedResume(screening.candidate), buildJobRequirements(screening.job));

    return NextResponse.json({ success: true, screening: { ...formattedScreening, categoryScores: scoring.categoryScores } });
  } catch (e: any) {
    console.error('Fetch screening detail error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

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
    const existingScreening = await prisma.screening.findUnique({
      where: { id },
      include: { candidate: true, job: true }
    });

    if (!existingScreening) {
      return NextResponse.json({ error: 'Evaluation profile not found' }, { status: 404 });
    }

    const parsedResume = buildParsedResume(existingScreening.candidate);
    const jobRequirements = buildJobRequirements(existingScreening.job);
    const screening = await aiService.screenCandidate(parsedResume, jobRequirements);

    const updatedScreening = await prisma.screening.update({
      where: { id },
      data: {
        matchScore: screening.matchScore,
        recommendation: screening.recommendation,
        aiSummary: screening.aiSummary,
        strengths: screening.strengths,
        weaknesses: screening.weaknesses,
        missingSkills: screening.missingSkills,
        remarks: `Re-screened by ${session.name}`
      } as any
    });

    await logActivity(session.userId, session.name, 'Screening Re-run', {
      screeningId: id,
      candidateName: existingScreening.candidate.name,
      jobTitle: existingScreening.job.title,
      score: updatedScreening.matchScore
    });

    const scoring = calculateDetailedScore(parsedResume, jobRequirements);

    return NextResponse.json({
      success: true,
      screening: {
        ...updatedScreening,
        strengths: screening.strengths,
        weaknesses: screening.weaknesses,
        missingSkills: screening.missingSkills,
        categoryScores: scoring.categoryScores
      }
    });
  } catch (e: any) {
    console.error('Re-screen candidate error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const { hrStatus, hrNotes } = await req.json();

    const existingScreening = await prisma.screening.findUnique({
      where: { id },
      include: { candidate: true }
    });

    if (!existingScreening) {
      return NextResponse.json({ error: 'Evaluation profile not found' }, { status: 404 });
    }

    const updatedScreening = await prisma.screening.update({
      where: { id },
      data: {
        hrStatus: hrStatus !== undefined ? hrStatus : existingScreening.hrStatus,
        hrNotes: hrNotes !== undefined ? hrNotes : existingScreening.hrNotes
      }
    });

    // Audit candidate status change events
    if (hrStatus !== undefined && hrStatus !== existingScreening.hrStatus) {
      await logActivity(session.userId, session.name, 'Candidate Status Change', {
        candidateId: existingScreening.candidateId,
        candidateName: existingScreening.candidate.name,
        oldStatus: existingScreening.hrStatus,
        newStatus: hrStatus,
        screeningId: existingScreening.id
      });
    }

    return NextResponse.json({
      success: true,
      screening: updatedScreening
    });
  } catch (e: any) {
    console.error('Update screening error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
