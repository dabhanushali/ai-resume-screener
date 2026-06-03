import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { jsonArray } from '@/utils/json';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const templates = await prisma.jobTemplate.findMany({
      orderBy: { name: 'asc' }
    });

    // Auto-seed default templates if 0 templates exist
    if (templates.length === 0) {
      const defaultTemplates = [
        {
          name: 'React Developer',
          title: 'Frontend React Developer',
          department: 'Engineering',
          employmentType: 'Full-time',
          location: 'Remote',
          minExperience: 3,
          maxExperience: 8,
          requiredSkills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
          preferredSkills: ['Next.js', 'Redux', 'TailwindCSS'],
          minDegree: 'Bachelor',
          noticePeriod: 'Immediate',
          minMatchScore: 75
        },
        {
          name: 'QA Engineer',
          title: 'QA Automation Engineer',
          department: 'Quality Assurance',
          employmentType: 'Full-time',
          location: 'On-site',
          minExperience: 2,
          maxExperience: 5,
          requiredSkills: ['Selenium', 'Jest', 'Playwright', 'QA Methodologies'],
          preferredSkills: ['TypeScript', 'CI/CD', 'Docker'],
          minDegree: 'Bachelor',
          noticePeriod: '30 Days',
          minMatchScore: 70
        },
        {
          name: 'UI/UX Designer',
          title: 'Product Designer (UI/UX)',
          department: 'Design',
          employmentType: 'Full-time',
          location: 'Hybrid',
          minExperience: 3,
          maxExperience: 6,
          requiredSkills: ['Figma', 'Wireframing', 'Prototyping', 'User Research'],
          preferredSkills: ['Adobe Illustrator', 'HTML', 'CSS'],
          minDegree: 'Associate',
          noticePeriod: 'Immediate',
          minMatchScore: 70
        },
        {
          name: 'Project Manager',
          title: 'Technical Project Manager',
          department: 'Product Management',
          employmentType: 'Full-time',
          location: 'Remote',
          minExperience: 5,
          maxExperience: 10,
          requiredSkills: ['Agile', 'Scrum', 'Jira', 'Project Scheduling'],
          preferredSkills: ['PMP Certified', 'Software engineering background'],
          minDegree: 'Bachelor',
          noticePeriod: '30 Days',
          minMatchScore: 75
        },
        {
          name: 'HR Executive',
          title: 'HR Talent Acquisition Executive',
          department: 'Human Resources',
          employmentType: 'Full-time',
          location: 'On-site',
          minExperience: 2,
          maxExperience: 5,
          requiredSkills: ['Recruiting', 'Applicant Tracking Systems', 'Sourcing'],
          preferredSkills: ['Excel', 'LinkedIn Recruiter', 'Communication'],
          minDegree: 'Bachelor',
          noticePeriod: 'Immediate',
          minMatchScore: 70
        }
      ];

      for (const t of defaultTemplates) {
        await prisma.jobTemplate.create({ data: t as any });
      }

      const freshlySeeded = await prisma.jobTemplate.findMany({
        orderBy: { name: 'asc' }
      });

      const formatted = freshlySeeded.map((t: any) => ({
        ...t,
        sourceType: 'template',
        sourceId: t.id,
        isArchived: false,
        requiredSkills: jsonArray<string>(t.requiredSkills),
        preferredSkills: jsonArray<string>(t.preferredSkills),
        certifications: [],
        keywords: []
      }));

      const archivedJobs = await prisma.job.findMany({
        where: { isArchived: true },
        orderBy: { updatedAt: 'desc' }
      });

      const archivedJobTemplates = archivedJobs.map((j: any) => ({
        ...j,
        name: j.title,
        sourceType: 'archivedJob',
        sourceId: j.id,
        requiredSkills: jsonArray<string>(j.requiredSkills),
        preferredSkills: jsonArray<string>(j.preferredSkills),
        certifications: jsonArray<string>(j.certifications),
        keywords: jsonArray<string>(j.keywords)
      }));

      return NextResponse.json({ success: true, templates: [...archivedJobTemplates, ...formatted] });
    }

    const formattedTemplates = templates.map((t: any) => ({
      ...t,
      sourceType: 'template',
      sourceId: t.id,
      isArchived: false,
      requiredSkills: jsonArray<string>(t.requiredSkills),
      preferredSkills: jsonArray<string>(t.preferredSkills),
      certifications: [],
      keywords: []
    }));

    const archivedJobs = await prisma.job.findMany({
      where: { isArchived: true },
      orderBy: { updatedAt: 'desc' }
    });

    const archivedJobTemplates = archivedJobs.map((j: any) => ({
      ...j,
      name: j.title,
      sourceType: 'archivedJob',
      sourceId: j.id,
      requiredSkills: jsonArray<string>(j.requiredSkills),
      preferredSkills: jsonArray<string>(j.preferredSkills),
      certifications: jsonArray<string>(j.certifications),
      keywords: jsonArray<string>(j.keywords)
    }));

    return NextResponse.json({ success: true, templates: [...archivedJobTemplates, ...formattedTemplates] });
  } catch (e: any) {
    console.error('Fetch templates error:', e);
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
      name,
      title,
      department,
      employmentType,
      location,
      minExperience,
      maxExperience,
      requiredSkills,
      preferredSkills,
      minDegree,
      noticePeriod,
      minMatchScore
    } = data;

    if (!name || !title || !department || !employmentType || !location) {
      return NextResponse.json({ error: 'Missing template name, job title, department, employmentType, or location' }, { status: 400 });
    }

    const newTemplate = await prisma.jobTemplate.create({
      data: {
        name,
        title,
        department,
        employmentType,
        location,
        minExperience: parseInt(minExperience) || 0,
        maxExperience: parseInt(maxExperience) || 99,
        requiredSkills: requiredSkills || [],
        preferredSkills: preferredSkills || [],
        minDegree: minDegree || 'Bachelor',
        noticePeriod: noticePeriod || 'Immediate',
        minMatchScore: parseFloat(minMatchScore) || 70
      } as any
    });

    return NextResponse.json({
      success: true,
      template: {
        ...newTemplate,
        requiredSkills: jsonArray<string>(newTemplate.requiredSkills),
        preferredSkills: jsonArray<string>(newTemplate.preferredSkills)
      }
    });
  } catch (e: any) {
    console.error('Create template error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
