import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { logActivity } from '@/utils/audit';
import { normalizeStringArray, parseFiniteNumber, validateScoringSettings } from '@/utils/validation';
import { jsonArray } from '@/utils/json';

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
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        screenings: {
          include: {
            candidate: true
          },
          orderBy: { matchScore: 'desc' }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const formattedJob = {
      ...job,
      requiredSkills: jsonArray<string>(job.requiredSkills),
      preferredSkills: jsonArray<string>(job.preferredSkills),
      certifications: jsonArray<string>(job.certifications),
      keywords: jsonArray<string>(job.keywords),
      screenings: job.screenings.map((s: any) => ({
        ...s,
        strengths: jsonArray<string>(s.strengths),
        weaknesses: jsonArray<string>(s.weaknesses),
        missingSkills: jsonArray<string>(s.missingSkills),
        candidate: {
          ...s.candidate,
          skills: jsonArray<string>(s.candidate.skills),
          certifications: jsonArray<string>(s.candidate.certifications),
          education: jsonArray(s.candidate.education),
          employmentHistory: jsonArray(s.candidate.employmentHistory),
          projects: jsonArray(s.candidate.projects)
        }
      }))
    };

    return NextResponse.json({ success: true, job: formattedJob });
  } catch (e: any) {
    console.error('Fetch job detail error:', e);
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
    const data = await req.json();
    const {
      title,
      department,
      employmentType,
      location,
      minExperience,
      maxExperience,
      requiredSkills,
      preferredSkills,
      minDegree,
      minGpa,
      noticePeriod,
      certifications,
      keywords,
      minMatchScore,
      weightSkills,
      weightExperience,
      weightRelevance,
      weightPreferred,
      weightEducation,
      weightNoticePeriod,
      thresholdShortlist,
      thresholdReview,
      isArchived
    } = data;

    const existingJob = await prisma.job.findUnique({
      where: { id }
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const nextMinExperience = minExperience !== undefined ? parseFiniteNumber(minExperience, existingJob.minExperience) : existingJob.minExperience;
    const nextMaxExperience = maxExperience !== undefined ? parseFiniteNumber(maxExperience, existingJob.maxExperience) : existingJob.maxExperience;
    const nextWeights = {
      weightSkills: weightSkills !== undefined ? parseFiniteNumber(weightSkills, existingJob.weightSkills) : existingJob.weightSkills,
      weightExperience: weightExperience !== undefined ? parseFiniteNumber(weightExperience, existingJob.weightExperience) : existingJob.weightExperience,
      weightRelevance: weightRelevance !== undefined ? parseFiniteNumber(weightRelevance, existingJob.weightRelevance) : existingJob.weightRelevance,
      weightPreferred: weightPreferred !== undefined ? parseFiniteNumber(weightPreferred, existingJob.weightPreferred) : existingJob.weightPreferred,
      weightEducation: weightEducation !== undefined ? parseFiniteNumber(weightEducation, existingJob.weightEducation) : existingJob.weightEducation,
      weightNoticePeriod: weightNoticePeriod !== undefined ? parseFiniteNumber(weightNoticePeriod, existingJob.weightNoticePeriod) : existingJob.weightNoticePeriod,
      thresholdShortlist: thresholdShortlist !== undefined ? parseFiniteNumber(thresholdShortlist, existingJob.thresholdShortlist) : existingJob.thresholdShortlist,
      thresholdReview: thresholdReview !== undefined ? parseFiniteNumber(thresholdReview, existingJob.thresholdReview) : existingJob.thresholdReview,
      minExperience: nextMinExperience,
      maxExperience: nextMaxExperience
    };

    const shouldValidateScoring = [
      minExperience,
      maxExperience,
      weightSkills,
      weightExperience,
      weightRelevance,
      weightPreferred,
      weightEducation,
      weightNoticePeriod,
      thresholdShortlist,
      thresholdReview
    ].some((value) => value !== undefined);

    if (shouldValidateScoring) {
      const validationError = validateScoringSettings(nextWeights);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingJob.title,
        department: department !== undefined ? department : existingJob.department,
        employmentType: employmentType !== undefined ? employmentType : existingJob.employmentType,
        location: location !== undefined ? location : existingJob.location,
        minExperience: Math.round(nextMinExperience),
        maxExperience: Math.round(nextMaxExperience),
        requiredSkills: requiredSkills !== undefined ? normalizeStringArray(requiredSkills) : existingJob.requiredSkills,
        preferredSkills: preferredSkills !== undefined ? normalizeStringArray(preferredSkills) : existingJob.preferredSkills,
        minDegree: minDegree !== undefined ? minDegree : existingJob.minDegree,
        minGpa: minGpa !== undefined ? minGpa : existingJob.minGpa,
        noticePeriod: noticePeriod !== undefined ? noticePeriod : existingJob.noticePeriod,
        certifications: certifications !== undefined ? normalizeStringArray(certifications) : existingJob.certifications,
        keywords: keywords !== undefined ? normalizeStringArray(keywords) : existingJob.keywords,
        minMatchScore: minMatchScore !== undefined ? parseFiniteNumber(minMatchScore, existingJob.minMatchScore) : existingJob.minMatchScore,
        isArchived: isArchived !== undefined ? isArchived : existingJob.isArchived,

        weightSkills: nextWeights.weightSkills,
        weightExperience: nextWeights.weightExperience,
        weightRelevance: nextWeights.weightRelevance,
        weightPreferred: nextWeights.weightPreferred,
        weightEducation: nextWeights.weightEducation,
        weightNoticePeriod: nextWeights.weightNoticePeriod,

        thresholdShortlist: nextWeights.thresholdShortlist,
        thresholdReview: nextWeights.thresholdReview,
      } as any
    });

    // Create a Job Modification Audit Log
    await logActivity(session.userId, session.name, 'Job Modification', {
      jobId: updatedJob.id,
      jobTitle: updatedJob.title,
      isArchivedChange: isArchived !== undefined ? isArchived : false
    });

    return NextResponse.json({
      success: true,
      job: {
        ...updatedJob,
        requiredSkills: jsonArray<string>(updatedJob.requiredSkills),
        preferredSkills: jsonArray<string>(updatedJob.preferredSkills),
        certifications: jsonArray<string>(updatedJob.certifications),
        keywords: jsonArray<string>(updatedJob.keywords)
      }
    });
  } catch (e: any) {
    console.error('Update job error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const targetJob = await prisma.job.findUnique({
      where: { id }
    });

    if (!targetJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Cascade deletion of the job
    await prisma.job.delete({
      where: { id }
    });

    // Create audit trail for deletion
    await logActivity(session.userId, session.name, 'Job Modification', {
      jobId: id,
      jobTitle: targetJob.title,
      operation: 'DELETE'
    });

    return NextResponse.json({ success: true, message: 'Job deleted successfully' });
  } catch (e: any) {
    console.error('Delete job error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
