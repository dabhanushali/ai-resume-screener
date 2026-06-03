import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/utils/auth';
import { parseJobDescriptionWithAI } from '@/utils/ai';
import { parsePdf, parseDocx, } from '@/utils/parser';
import { logActivity } from '@/utils/audit';
import { validateFileSize } from '@/utils/validation';

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let jdText = '';
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // PDF or DOCX file upload
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
      }

      const fileSizeError = validateFileSize(file);
      if (fileSizeError) {
        return NextResponse.json({ error: fileSizeError }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.pdf')) {
        jdText = await parsePdf(buffer);
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        jdText = await parseDocx(buffer);
      } else {
        return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or DOCX.' }, { status: 400 });
      }
    } else {
      // Plain JSON body with jdText field
      const body = await req.json();
      jdText = (body.jdText || '').trim();
    }

    if (!jdText || jdText.length < 30) {
      return NextResponse.json({ error: 'Job description text is too short or empty.' }, { status: 400 });
    }

    // Run AI parser on the JD text
    const parsed = await parseJobDescriptionWithAI(jdText);

    await logActivity(session.userId, session.name, 'Job Draft Parsed', {
      jobTitle: parsed.title,
      source: contentType.includes('multipart') ? 'file_upload' : 'text_paste'
    });

    return NextResponse.json({
      success: true,
      parsed
    });
  } catch (e: any) {
    console.error('parse-jd error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
