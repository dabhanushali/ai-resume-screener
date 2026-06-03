import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { normalizeStringArray, parseFiniteNumber } from '@/utils/validation';
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
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        screenings: {
          include: { job: true }
        }
      }
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const formattedCandidate = {
      ...candidate,
      skills: jsonArray<string>(candidate.skills),
      certifications: jsonArray<string>(candidate.certifications),
      education: jsonArray(candidate.education),
      employmentHistory: jsonArray(candidate.employmentHistory),
      projects: jsonArray(candidate.projects),
      screenings: candidate.screenings.map((s: any) => ({
        ...s,
        strengths: jsonArray<string>(s.strengths),
        weaknesses: jsonArray<string>(s.weaknesses),
        missingSkills: jsonArray<string>(s.missingSkills),
        job: {
          ...s.job,
          requiredSkills: jsonArray<string>(s.job.requiredSkills),
          preferredSkills: jsonArray<string>(s.job.preferredSkills)
        }
      }))
    };

    return NextResponse.json({ success: true, candidate: formattedCandidate });
  } catch (e: any) {
    console.error('Fetch candidate detail error:', e);
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
    const existing = await prisma.candidate.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const existingNoticePeriod = (existing as any).noticePeriod || '';
    const nextEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : existing.email;
    if (!nextEmail) {
      return NextResponse.json({ error: 'Candidate email is required' }, { status: 400 });
    }

    const duplicateEmail = await prisma.candidate.findFirst({
      where: {
        email: nextEmail,
        NOT: { id }
      }
    });

    if (duplicateEmail) {
      return NextResponse.json({ error: 'Another candidate already uses this email' }, { status: 400 });
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : existing.name,
        email: nextEmail,
        phone: typeof data.phone === 'string' ? data.phone.trim() : existing.phone,
        location: typeof data.location === 'string' ? data.location.trim() : existing.location,
        linkedinUrl: typeof data.linkedinUrl === 'string' ? data.linkedinUrl.trim() || null : existing.linkedinUrl,
        portfolioUrl: typeof data.portfolioUrl === 'string' ? data.portfolioUrl.trim() || null : existing.portfolioUrl,
        currentDesignation: typeof data.currentDesignation === 'string' ? data.currentDesignation.trim() || null : existing.currentDesignation,
        currentCompany: typeof data.currentCompany === 'string' ? data.currentCompany.trim() || null : existing.currentCompany,
        totalExperience: data.totalExperience !== undefined ? parseFiniteNumber(data.totalExperience, existing.totalExperience) : existing.totalExperience,
        noticePeriod: typeof data.noticePeriod === 'string' ? data.noticePeriod.trim() : existingNoticePeriod,
        skills: data.skills !== undefined ? normalizeStringArray(data.skills) : existing.skills,
        certifications: data.certifications !== undefined ? normalizeStringArray(data.certifications) : existing.certifications
      } as any
    });

    return NextResponse.json({
      success: true,
      candidate: {
        ...updated,
        skills: jsonArray<string>(updated.skills),
        certifications: jsonArray<string>(updated.certifications),
        education: jsonArray(updated.education),
        employmentHistory: jsonArray(updated.employmentHistory),
        projects: jsonArray(updated.projects)
      }
    });
  } catch (e: any) {
    console.error('Update candidate error:', e);
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
    const targetCandidate = await prisma.candidate.findUnique({
      where: { id }
    });

    if (!targetCandidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Deletes candidate (which cascades to delete screening records)
    await prisma.candidate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Candidate deleted successfully from talent pool' });
  } catch (e: any) {
    console.error('Delete candidate error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
