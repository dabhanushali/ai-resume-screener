import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { logActivity } from '@/utils/audit';
import { normalizeStringArray, parseFiniteNumber, validateScoringSettings } from '@/utils/validation';
import { jsonArray } from '@/utils/json';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get('archived') === 'true';

  try {
    const jobs = await prisma.job.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { screenings: true }
        }
      }
    });

    const formattedJobs = jobs.map((j: any) => ({
      ...j,
      requiredSkills: jsonArray<string>(j.requiredSkills),
      preferredSkills: jsonArray<string>(j.preferredSkills),
      certifications: jsonArray<string>(j.certifications),
      keywords: jsonArray<string>(j.keywords),
    }));

    return NextResponse.json({ success: true, jobs: formattedJobs });
  } catch (e: any) {
    console.error('Fetch jobs error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      thresholdReview
    } = data;

    if (!title || !department || !employmentType || !location) {
      return NextResponse.json({ error: 'Missing title, department, employmentType, or location' }, { status: 400 });
    }

    const normalizedRequiredSkills = normalizeStringArray(requiredSkills);
    const normalizedPreferredSkills = normalizeStringArray(preferredSkills);
    const normalizedCertifications = normalizeStringArray(certifications);
    const normalizedKeywords = normalizeStringArray(keywords);

    const normalizedMinExperience = Math.round(parseFiniteNumber(minExperience, 0));
    const normalizedMaxExperience = Math.round(parseFiniteNumber(maxExperience, 99));
    const normalizedWeights = {
      weightSkills: parseFiniteNumber(weightSkills, 40),
      weightExperience: parseFiniteNumber(weightExperience, 25),
      weightRelevance: parseFiniteNumber(weightRelevance, 15),
      weightPreferred: parseFiniteNumber(weightPreferred, 10),
      weightEducation: parseFiniteNumber(weightEducation, 5),
      weightNoticePeriod: parseFiniteNumber(weightNoticePeriod, 5),
      thresholdShortlist: parseFiniteNumber(thresholdShortlist, 75),
      thresholdReview: parseFiniteNumber(thresholdReview, 50),
      minExperience: normalizedMinExperience,
      maxExperience: normalizedMaxExperience
    };

    const validationError = validateScoringSettings(normalizedWeights);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const newJob = await prisma.job.create({
      data: {
        title,
        department,
        employmentType,
        location,
        minExperience: normalizedMinExperience,
        maxExperience: normalizedMaxExperience,
        requiredSkills: normalizedRequiredSkills,
        preferredSkills: normalizedPreferredSkills,
        minDegree: minDegree || 'Bachelor',
        minGpa: minGpa || '',
        noticePeriod: noticePeriod || 'Immediate',
        certifications: normalizedCertifications,
        keywords: normalizedKeywords,
        minMatchScore: parseFiniteNumber(minMatchScore, 70),
        
        weightSkills: normalizedWeights.weightSkills,
        weightExperience: normalizedWeights.weightExperience,
        weightRelevance: normalizedWeights.weightRelevance,
        weightPreferred: normalizedWeights.weightPreferred,
        weightEducation: normalizedWeights.weightEducation,
        weightNoticePeriod: normalizedWeights.weightNoticePeriod,

        thresholdShortlist: normalizedWeights.thresholdShortlist,
        thresholdReview: normalizedWeights.thresholdReview,
      } as any
    });

    // Create a Job Creation Audit Log
    await logActivity(session.userId, session.name, 'Job Creation', {
      jobId: newJob.id,
      jobTitle: newJob.title
    });

    return NextResponse.json({
      success: true,
      job: {
        ...newJob,
        requiredSkills: jsonArray<string>(newJob.requiredSkills),
        preferredSkills: jsonArray<string>(newJob.preferredSkills),
        certifications: jsonArray<string>(newJob.certifications),
        keywords: jsonArray<string>(newJob.keywords)
      }
    });
  } catch (e: any) {
    console.error('Create job error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
