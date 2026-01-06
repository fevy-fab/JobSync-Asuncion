// src/app/api/pds/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

import { generatePDSPDF as generateModernPDF } from '@/lib/pds/pdfGenerator';
import { generateCSCFormatPDF } from '@/lib/pds/pdfGeneratorCSC';
import { generateOfficialPDF } from '@/lib/pds/pdfGeneratorOfficial';

import { generatePDSExcel, generatePDSFilename } from '@/lib/pds/pdsExcelGenerator';
import { transformPDSFromDatabase } from '@/lib/utils/dataTransformers';
import { Buffer } from 'buffer';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // 1️⃣ Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2️⃣ Fetch PDS record
    const { data: pdsData, error: pdsError } = await supabase
      .from('applicant_pds')
      .select('*')
      .eq('id', id)
      .single();
    if (pdsError || !pdsData) {
      return NextResponse.json({ success: false, error: 'PDS not found' }, { status: 404 });
    }

    // 3️⃣ Role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'APPLICANT';
    const isOwner = pdsData.user_id === user.id;
    const isHR = userRole === 'HR';
    const isAdmin = userRole === 'ADMIN';
    const isAuthorized = isOwner || isHR || isAdmin;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to download this PDS' },
        { status: 403 }
      );
    }

    // 4️⃣ Applicant name fallback
    const { data: applicantProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', pdsData.user_id)
      .single();
    const applicantName = applicantProfile?.full_name || 'Unknown Applicant';

    // 5️⃣ Query params
    const rawFormat = request.nextUrl.searchParams.get('format') || 'modern';
    const format = rawFormat === 'pds_pdf' ? 'csc' : rawFormat;

    const includeSignatureParam =
      request.nextUrl.searchParams.get('includeSignature') === 'true';
    const useCurrentDateParam =
      request.nextUrl.searchParams.get('useCurrentDate') === 'true';

    // ✅ Everyone follows frontend toggles
    const includeSignature = includeSignatureParam;
    const useCurrentDate = useCurrentDateParam;

    // 6️⃣ Transform database data
    const transformedPDSData: any = transformPDSFromDatabase(pdsData);

    // 7️⃣ Embed applicant’s signature if available
    if (pdsData.signature_url) {
      try {
        const { data: signedUrlData } = await adminClient.storage
          .from('pds-signatures')
          .createSignedUrl(pdsData.signature_url, 60);
        if (signedUrlData?.signedUrl) {
          const imageRes = await fetch(signedUrlData.signedUrl);
          if (imageRes.ok) {
            const arrayBuf = await imageRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuf).toString('base64');
            const contentType = imageRes.headers.get('content-type') || 'image/png';
            const dataUrl = `data:${contentType};base64,${base64}`;

            transformedPDSData.otherInformation = transformedPDSData.otherInformation || {};
            transformedPDSData.otherInformation.declaration =
              transformedPDSData.otherInformation.declaration || {};
            transformedPDSData.otherInformation.declaration.signatureData = dataUrl;
          }
        }
      } catch (err) {
        console.error('❌ Signature embedding failed:', err);
      }
    }

    // -------------------------------
    // 🧾 EXCEL EXPORT
    // -------------------------------
    if (format === 'excel') {
      try {
        const excelBuffer = await generatePDSExcel(transformedPDSData, { useCurrentDate });
        const fileName = generatePDSFilename(transformedPDSData.personalInfo);
        const arrayBuffer = excelBuffer.buffer.slice(
          excelBuffer.byteOffset,
          excelBuffer.byteOffset + excelBuffer.byteLength
        );
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': excelBuffer.length.toString(),
          },
        });
      } catch (error) {
        console.error('❌ Error generating Excel PDS:', error);
        return NextResponse.json(
          { success: false, error: `Failed to generate Excel: ${error}` },
          { status: 500 }
        );
      }
    }

    // -------------------------------
    // 📄 PDF EXPORT (CSC | MODERN | OFFICIAL)
    // -------------------------------
    try {
      let pdfBytes: Uint8Array | null = null;

      if (format === 'csc') {
        const doc = await generateCSCFormatPDF(
          transformedPDSData,
          includeSignature,
          true, // ⚙️ required for generator signature compatibility
          useCurrentDate // ✅ controlled by checkbox
        );
        const arrBuf = await doc.output('arraybuffer');
        pdfBytes = new Uint8Array(arrBuf);
      } else if (format === 'modern') {
        const doc = await generateModernPDF(
          transformedPDSData,
          includeSignature,
          true, // ⚙️ required
          useCurrentDate // ✅ checkbox value
        );
        const arrBuf = await doc.output('arraybuffer');
        pdfBytes = new Uint8Array(arrBuf);
      } else if (format === 'official') {
        const result = await generateOfficialPDF(transformedPDSData, {
          includeSignature,
          useCurrentDate,
          returnBytes: true,
        });
        if (result instanceof Uint8Array) pdfBytes = result;
      }

      if (!pdfBytes) {
        return NextResponse.json(
          { success: false, error: `Failed to generate ${format.toUpperCase()} PDF.` },
          { status: 500 }
        );
      }

      // -------------------------------
      // 🏷️ File naming
      // -------------------------------
      const surname =
        transformedPDSData.personalInfo?.surname ||
        applicantName.split(' ')[0] ||
        'Unknown';
      const year = new Date().getFullYear();
      const formatLabel =
        format === 'official'
          ? 'Official'
          : format === 'csc'
          ? 'CSC'
          : 'Modern';
      const fileName = `${surname}_${formatLabel}_PDS_${year}.pdf`;

      return new NextResponse(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': pdfBytes.byteLength.toString(),
        },
      });
    } catch (pdfErr) {
      console.error('❌ PDF generation error:', pdfErr);
      return NextResponse.json(
        {
          success: false,
          error: `PDF generation failed: ${
            pdfErr instanceof Error ? pdfErr.message : String(pdfErr)
          }`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Global PDS generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate PDS: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
