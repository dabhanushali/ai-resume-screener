import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { parsePdf, parseDocx, computeHash } from '@/utils/parser';
import { aiService } from '@/utils/ai';
import { logActivity } from '@/utils/audit';
import { validateFileSize } from '@/utils/validation';
import { jsonArray } from '@/utils/json';

export const maxDuration = 60; // Allow enough time for LLM parsing

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const jobId = formData.get('jobId') as string | null;
    const overrideDuplicate = formData.get('overrideDuplicate') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No resume file uploaded' }, { status: 400 });
    }

    if (!jobId) {
      return NextResponse.json({ error: 'Missing target jobId' }, { status: 400 });
    }

    // Validation: Empty, oversized, or unsupported files
    const fileSizeError = validateFileSize(file);
    if (fileSizeError) {
      return NextResponse.json({ error: fileSizeError }, { status: 400 });
    }

    const filename = file.name;
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (extension !== 'pdf' && extension !== 'docx' && extension !== 'doc') {
      return NextResponse.json({ error: 'Unsupported file format. Please upload PDF, DOC, or DOCX.' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Text Parsing
    let text = '';
    try {
      if (extension === 'pdf') {
        text = await parsePdf(buffer);
      } else {
        // Doc/Docx parsing
        text = await parseDocx(buffer);
      }
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Corrupted or unreadable file content.' }, { status: 400 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Resume contains no readable text content.' }, { status: 400 });
    }

    // 2. Hash Calculation
    const hash = computeHash(text);

    // 3. AI Profile Extraction
    let extractedDetails;
    try {
      extractedDetails = await aiService.parseResume(text);
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed to extract structured details from resume: ' + e.message }, { status: 500 });
    }

    const extractedEmail = (extractedDetails.email || '').trim().toLowerCase();
    const email = extractedEmail || `resume-${hash.slice(0, 12)}@no-email.local`;
    const phone = (extractedDetails.phone || '').trim();
    const skills = (extractedDetails.skills || []).map((skill: any) =>
      typeof skill === 'string' ? skill : skill?.name
    ).filter(Boolean);

    // 4. Duplicate Check
    const duplicateChecks = [
      ...(extractedEmail ? [{ email }] : []),
      { resumeHash: hash },
      ...(phone.length > 7 ? [{ phone }] : [])
    ];

    const existingCandidate = await prisma.candidate.findFirst({
      where: { OR: duplicateChecks }
    });

    const existingNoticePeriod = existingCandidate ? ((existingCandidate as any).noticePeriod || '') : '';

    if (existingCandidate && !overrideDuplicate) {
      // Return warning modal response
      return NextResponse.json({
        duplicate: true,
        candidateDetails: extractedDetails,
        existingCandidate: {
          id: existingCandidate.id,
          name: existingCandidate.name,
          email: existingCandidate.email,
          phone: existingCandidate.phone,
          location: existingCandidate.location,
          currentDesignation: existingCandidate.currentDesignation,
          currentCompany: existingCandidate.currentCompany,
          totalExperience: existingCandidate.totalExperience,
          skills: jsonArray<string>(existingCandidate.skills),
          certifications: jsonArray<string>(existingCandidate.certifications),
          noticePeriod: existingNoticePeriod
        }
      });
    }

    // 5. Retrieve job details to run match scoring.
    // Original PDF/DOC/DOCX files are intentionally not persisted.
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job requirement not found' }, { status: 404 });
    }

    const jobRequirements = {
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

    // 6. Run Match Screening Evaluation
    const screening = await aiService.screenCandidate(extractedDetails, jobRequirements);

    // 7. Create or Update Candidate Profile
    let candidate;
    if (existingCandidate) {
      // Overwrite/Update existing profile
      candidate = await prisma.candidate.update({
        where: { id: existingCandidate.id },
        data: {
          name: extractedDetails.name || existingCandidate.name,
          email: extractedEmail ? email : existingCandidate.email,
          phone: phone || existingCandidate.phone,
          location: extractedDetails.location || existingCandidate.location,
          linkedinUrl: extractedDetails.linkedinUrl || existingCandidate.linkedinUrl,
          portfolioUrl: extractedDetails.portfolioUrl || existingCandidate.portfolioUrl,
          currentDesignation: extractedDetails.currentRole || existingCandidate.currentDesignation,
          currentCompany: extractedDetails.currentCompany || existingCandidate.currentCompany,
          totalExperience: extractedDetails.totalExperience || existingCandidate.totalExperience,
          skills,
          certifications: extractedDetails.certifications,
          education: extractedDetails.education,
          employmentHistory: extractedDetails.employmentHistory,
          projects: extractedDetails.projects,
          noticePeriod: extractedDetails.noticePeriod || existingNoticePeriod,
          resumeHash: hash
        } as any
      });
    } else {
      // Create new candidate
      candidate = await prisma.candidate.create({
        data: {
          name: extractedDetails.name || 'Candidate',
          email: email,
          phone: phone,
          location: extractedDetails.location || '',
          linkedinUrl: extractedDetails.linkedinUrl,
          portfolioUrl: extractedDetails.portfolioUrl,
          currentDesignation: extractedDetails.currentRole,
          currentCompany: extractedDetails.currentCompany,
          totalExperience: extractedDetails.totalExperience,
          skills,
          certifications: extractedDetails.certifications,
          education: extractedDetails.education,
          employmentHistory: extractedDetails.employmentHistory,
          projects: extractedDetails.projects,
          noticePeriod: extractedDetails.noticePeriod || '',
          resumeHash: hash
        } as any
      });
    }

    // 8. Save Screening Result (upsert to handle re-screening duplicates)
    const screeningResult = await prisma.screening.upsert({
      where: {
        jobId_candidateId: {
          jobId: jobId,
          candidateId: candidate.id
        }
      },
      update: {
        matchScore: screening.matchScore,
        recommendation: screening.recommendation,
        aiSummary: screening.aiSummary,
        strengths: screening.strengths,
        weaknesses: screening.weaknesses,
        missingSkills: screening.missingSkills,
        hrStatus: 'PENDING',
        remarks: `Auto-screened on upload. File: ${filename}`
      } as any,
      create: {
        jobId: jobId,
        candidateId: candidate.id,
        matchScore: screening.matchScore,
        recommendation: screening.recommendation,
        aiSummary: screening.aiSummary,
        strengths: screening.strengths,
        weaknesses: screening.weaknesses,
        missingSkills: screening.missingSkills,
        hrStatus: 'PENDING',
        remarks: `Auto-screened on upload. File: ${filename}`
      } as any
    });

    // 9. Audit Logging
    await logActivity(session.userId, session.name, 'Resume Upload', {
      candidateId: candidate.id,
      candidateName: candidate.name,
      filename,
      jobId
    });
    
    await logActivity(session.userId, session.name, 'Screening Execution', {
      screeningId: screeningResult.id,
      candidateName: candidate.name,
      jobTitle: job.title,
      score: screeningResult.matchScore
    });

    return NextResponse.json({
      success: true,
      candidate: {
        ...candidate,
        skills,
        certifications: extractedDetails.certifications,
        education: extractedDetails.education,
        employmentHistory: extractedDetails.employmentHistory,
        projects: extractedDetails.projects
      },
      screening: {
        ...screeningResult,
        strengths: screening.strengths,
        weaknesses: screening.weaknesses,
        missingSkills: screening.missingSkills
      }
    });
  } catch (e: any) {
    console.error('Resume upload endpoint error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
