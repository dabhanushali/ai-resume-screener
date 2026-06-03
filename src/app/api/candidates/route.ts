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
  const q = searchParams.get('q') || ''; // General advanced search
  const name = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';
  const phone = searchParams.get('phone') || '';
  const skills = searchParams.get('skills') || '';
  const minExp = parseFloat(searchParams.get('minExp') || '0');
  const company = searchParams.get('company') || '';
  const location = searchParams.get('location') || '';
  const education = searchParams.get('education') || '';

  try {
    const where: any = { AND: [] };

    if (name) where.AND.push({ name: { contains: name, mode: 'insensitive' } });
    if (email) where.AND.push({ email: { contains: email, mode: 'insensitive' } });
    if (phone) where.AND.push({ phone: { contains: phone, mode: 'insensitive' } });
    if (company) where.AND.push({ currentCompany: { contains: company, mode: 'insensitive' } });
    if (location) where.AND.push({ location: { contains: location, mode: 'insensitive' } });
    if (minExp > 0) where.AND.push({ totalExperience: { gte: minExp } });

    if (q.trim() && !q.toLowerCase().includes(' and ') && !q.toLowerCase().includes(' or ') && !q.toLowerCase().includes('years')) {
      where.AND.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { currentDesignation: { contains: q, mode: 'insensitive' } },
          { currentCompany: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { noticePeriod: { contains: q, mode: 'insensitive' } }
        ]
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 200,
      include: {
        screenings: {
          include: { job: true }
        }
      }
    });

    let filtered = candidates.map((c: any) => {
      return {
        ...c,
        skills: jsonArray<string>(c.skills),
        certifications: jsonArray<string>(c.certifications),
        education: jsonArray(c.education),
        employmentHistory: jsonArray(c.employmentHistory),
        projects: jsonArray(c.projects),
        screenings: c.screenings.map((s: any) => ({
          ...s,
          strengths: jsonArray<string>(s.strengths),
          weaknesses: jsonArray<string>(s.weaknesses),
          missingSkills: jsonArray<string>(s.missingSkills)
        }))
      };
    });

    // Apply strict filters if provided
    if (name) {
      filtered = filtered.filter((c: any) => c.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (email) {
      filtered = filtered.filter((c: any) => c.email.toLowerCase().includes(email.toLowerCase()));
    }
    if (phone) {
      filtered = filtered.filter((c: any) => c.phone.toLowerCase().includes(phone.toLowerCase()));
    }
    if (company) {
      filtered = filtered.filter((c: any) => c.currentCompany?.toLowerCase().includes(company.toLowerCase()));
    }
    if (location) {
      filtered = filtered.filter((c: any) => c.location.toLowerCase().includes(location.toLowerCase()));
    }
    if (minExp > 0) {
      filtered = filtered.filter((c: any) => c.totalExperience >= minExp);
    }
    if (skills) {
      const skillsList = skills.split(',').map((s: string) => s.trim().toLowerCase());
      filtered = filtered.filter((c: any) => skillsList.every((sl: string) => c.skills.some((cs: string) => cs.toLowerCase().includes(sl))));
    }
    if (education) {
      filtered = filtered.filter((c: any) => c.education.some((e: any) => e.degree.toLowerCase().includes(education.toLowerCase()) || e.institution.toLowerCase().includes(education.toLowerCase())));
    }

    // Advanced search parser supporting Boolean operations
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      
      // A. "AND" Boolean Query (e.g., "React AND Next.js")
      if (query.includes(' and ')) {
        const tokens = query.split(' and ').map((t: string) => t.trim());
        filtered = filtered.filter((c: any) => {
          const searchableText = `${c.name} ${c.email} ${c.currentDesignation} ${c.currentCompany} ${c.noticePeriod} ${c.skills.join(' ')}`.toLowerCase();
          return tokens.every((tok: string) => searchableText.includes(tok));
        });
      }
      // B. "OR" Boolean Query
      else if (query.includes(' or ')) {
        const tokens = query.split(' or ').map((t: string) => t.trim());
        filtered = filtered.filter((c: any) => {
          const searchableText = `${c.name} ${c.email} ${c.currentDesignation} ${c.currentCompany} ${c.noticePeriod} ${c.skills.join(' ')}`.toLowerCase();
          return tokens.some((tok: string) => searchableText.includes(tok));
        });
      }
      // C. Exact Keyword Matches or Fallbacks
      else {
        filtered = filtered.filter((c: any) => {
          const searchableText = `${c.name} ${c.email} ${c.currentDesignation} ${c.currentCompany} ${c.noticePeriod} ${c.skills.join(' ')}`.toLowerCase();
          
          // 1. "X+ years experience" format
          if (query.includes('years experience') || query.includes('years exp')) {
            const expNum = parseInt(query.match(/\d+/)?.join('') || '0');
            return c.totalExperience >= expNum;
          }
          
          // 2. "Immediate Joiner"
          if (query.includes('immediate') || query.includes('joiner')) {
            return c.noticePeriod?.toLowerCase().includes('immediate');
          }
          
          return searchableText.includes(query);
        });
      }
    }

    return NextResponse.json({ success: true, candidates: filtered });
  } catch (e: any) {
    console.error('Fetch candidates list error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
