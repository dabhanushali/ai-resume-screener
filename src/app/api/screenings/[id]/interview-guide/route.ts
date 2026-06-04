import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/utils/db';
import { aiService } from '@/utils/ai';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const screeningId = resolvedParams.id;

    if (!screeningId) {
      return NextResponse.json({ success: false, error: 'Missing screening ID' }, { status: 400 });
    }

    const screening = await prisma.screening.findUnique({
      where: { id: screeningId },
      include: {
        job: true,
        candidate: true
      }
    });

    if (!screening) {
      return NextResponse.json({ success: false, error: 'Screening not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const isRegenerate = !!body.regenerate;

    // If we already have generated questions, return them directly to save API calls
    const existingQuestions = (screening as any).interviewQuestions;
    if (!isRegenerate && existingQuestions && Array.isArray(existingQuestions) && existingQuestions.length > 0) {
      return NextResponse.json({ success: true, questions: existingQuestions });
    }

    // Reconstruct the ParsedResume from Candidate model
    const parsedResume = {
      name: screening.candidate.name,
      email: screening.candidate.email,
      phone: screening.candidate.phone,
      location: screening.candidate.location,
      linkedinUrl: screening.candidate.linkedinUrl || undefined,
      portfolioUrl: screening.candidate.portfolioUrl || undefined,
      currentRole: screening.candidate.currentDesignation || undefined,
      currentCompany: screening.candidate.currentCompany || undefined,
      totalExperience: screening.candidate.totalExperience,
      skills: screening.candidate.skills as string[],
      certifications: screening.candidate.certifications as string[],
      education: screening.candidate.education as any[],
      employmentHistory: screening.candidate.employmentHistory as any[],
      projects: screening.candidate.projects as any[],
      noticePeriod: screening.candidate.noticePeriod || undefined
    };

    // Construct JobRequirements from Job model
    const jobRequirements = {
      title: screening.job.title,
      department: screening.job.department,
      employmentType: screening.job.employmentType,
      location: screening.job.location,
      minExperience: screening.job.minExperience,
      maxExperience: screening.job.maxExperience,
      requiredSkills: screening.job.requiredSkills as string[],
      preferredSkills: screening.job.preferredSkills as string[],
      minDegree: screening.job.minDegree,
      minGpa: screening.job.minGpa || undefined,
      noticePeriod: screening.job.noticePeriod,
      certifications: screening.job.certifications as string[],
      keywords: screening.job.keywords as string[]
    };

    // Generate questions via AI
    const questions = await aiService.generateInterviewQuestions(parsedResume, jobRequirements, isRegenerate ? existingQuestions : undefined);

    // Persist questions to DB
    await prisma.screening.update({
      where: { id: screeningId },
      data: {
        interviewQuestions: questions
      } as any
    });

    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error('Error generating interview guide:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
