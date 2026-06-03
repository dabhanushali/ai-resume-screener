import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { prisma } from '@/utils/db';
import { jsonArray } from '@/utils/json';

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
    const existingTemplate = await prisma.jobTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updatedTemplate = await prisma.jobTemplate.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : existingTemplate.name,
        title: data.title !== undefined ? data.title : existingTemplate.title,
        department: data.department !== undefined ? data.department : existingTemplate.department,
        employmentType: data.employmentType !== undefined ? data.employmentType : existingTemplate.employmentType,
        location: data.location !== undefined ? data.location : existingTemplate.location,
        minExperience: data.minExperience !== undefined ? parseInt(data.minExperience) : existingTemplate.minExperience,
        maxExperience: data.maxExperience !== undefined ? parseInt(data.maxExperience) : existingTemplate.maxExperience,
        requiredSkills: data.requiredSkills !== undefined ? data.requiredSkills : existingTemplate.requiredSkills,
        preferredSkills: data.preferredSkills !== undefined ? data.preferredSkills : existingTemplate.preferredSkills,
        minDegree: data.minDegree !== undefined ? data.minDegree : existingTemplate.minDegree,
        minGpa: data.minGpa !== undefined ? data.minGpa : existingTemplate.minGpa,
        noticePeriod: data.noticePeriod !== undefined ? data.noticePeriod : existingTemplate.noticePeriod,
        minMatchScore: data.minMatchScore !== undefined ? parseFloat(data.minMatchScore) : existingTemplate.minMatchScore
      } as any
    });

    return NextResponse.json({
      success: true,
      template: {
        ...updatedTemplate,
        sourceType: 'template',
        sourceId: updatedTemplate.id,
        isArchived: false,
        requiredSkills: jsonArray<string>(updatedTemplate.requiredSkills),
        preferredSkills: jsonArray<string>(updatedTemplate.preferredSkills),
        certifications: [],
        keywords: []
      }
    });
  } catch (e: any) {
    console.error('Update template error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
