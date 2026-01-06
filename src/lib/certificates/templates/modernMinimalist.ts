/**
 * Modern Minimalist Certificate Template
 *
 * Clean, contemporary design with blue gradient and sans-serif fonts
 * Color scheme: Blue (#3B82F6) gradient header on white background
 */

import jsPDF from 'jspdf';
import { CertificateData, CertificateLayoutParams } from '@/types/certificate.types';
import {
  loadImageBase64,
  loadSignatureBase64,
  formatDate,
  generateCertificateId,
  truncateText,
} from '../shared';

/**
 * Generate Modern Minimalist certificate template
 */
export async function generateModernMinimalistCertificate(
  data: CertificateData,
  layoutParams?: CertificateLayoutParams
): Promise<Uint8Array> {
  // Load all logos in parallel
  const [pesoLogo, lguSeal, signatureBase64] = await Promise.all([
    loadImageBase64('logos/peso-logo.jpeg'),
    loadImageBase64('logos/lgu-asuncion-seal.jpeg'),
    data.certification.issued_by.signature_url
      ? loadSignatureBase64(data.certification.issued_by.signature_url)
      : Promise.resolve(null),
  ]);

  // Create PDF in landscape orientation
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // ===== BACKGROUND =====
  // Pure white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== GRADIENT HEADER =====
  // Blue gradient header (simulated with layered rectangles)
  const headerHeight = 50;
  const gradientSteps = 20;
  for (let i = 0; i < gradientSteps; i++) {
    const alpha = 1 - (i / gradientSteps) * 0.5; // Fade from full to 50%
    const brightness = 59 + (i / gradientSteps) * 100; // #3B82F6 to lighter
    doc.setFillColor(brightness, 130 + i * 2, 246);
    doc.rect(0, (i * headerHeight) / gradientSteps, pageWidth, headerHeight / gradientSteps, 'F');
  }

  // ===== LOGOS IN HEADER (Horizontal Alignment) =====
  let currentY = 15;
  const logoSize = 22;
  const logoSpacing = 35;
  // Center 2 logos (LGU and PESO only)
  const startX = centerX - (logoSpacing * 0.5);

  // LGU Seal (Left)
  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', startX, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  // PESO Logo (Right)
  if (pesoLogo) {
    try {
      doc.addImage(pesoLogo, 'JPEG', startX + logoSpacing, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // ===== HEADER TEXT (White on blue gradient) =====
  currentY = 45;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.text('PROVINCE OF ILOCOS NORTE • MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Public Employment Service Office (P.E.S.O.)', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE TITLE =====
  currentY = 70;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue color
  doc.text('CERTIFICATE OF COMPLETION', centerX, currentY, { align: 'center' });

  // Minimal underline
  currentY += 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(59, 130, 246);
  doc.line(centerX - 70, currentY, centerX + 70, currentY);

  // ===== CERTIFICATE BODY =====
  currentY += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('This certifies that', centerX, currentY, { align: 'center' });

  // Trainee Name (Large, Sans-serif)
  currentY += 10;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Minimal name underline
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(centerX - nameWidth / 2, currentY, centerX + nameWidth / 2, currentY);

  // Completion text
  currentY += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('has successfully completed the training program', centerX, currentY, { align: 'center' });

  // Program Title (Bold, Blue)
  currentY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  const programTitle = truncateText(doc, data.program.title, pageWidth - 80, 14);
  doc.text(programTitle, centerX, currentY, { align: 'center' });

  // ===== PROGRAM DETAILS BOX (Light gray background) =====
  currentY += 10;
  const boxHeight = 35;
  doc.setFillColor(248, 250, 252); // Very light gray
  doc.setDrawColor(226, 232, 240); // Border
  doc.setLineWidth(0.3);
  doc.roundedRect(40, currentY, pageWidth - 80, boxHeight, 2, 2, 'FD');

  // Details inside box
  let boxY = currentY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  // Date range
  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`Duration: ${startDate} - ${endDate} (${data.program.duration})`, centerX, boxY, { align: 'center' });

  // Speaker name (integrated)
  if (data.program.speaker_name) {
    boxY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`Facilitated by: ${data.program.speaker_name}`, centerX, boxY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
  }

  // Skills covered
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    boxY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Skills:', 45, boxY);
    boxY += 4;
    doc.setFont('helvetica', 'normal');
    const skills = data.program.skills_covered.slice(0, 5).join(', ');
    const skillsText = truncateText(doc, skills, pageWidth - 100, 9);
    doc.text(skillsText, 45, boxY);
  }

  // Assessment & Attendance
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    boxY += 5;
    let metricsText = '';
    if (data.completion.assessment_score !== null) {
      metricsText += `Assessment: ${data.completion.assessment_score.toFixed(1)}%`;
    }
    if (data.completion.attendance_percentage !== null) {
      if (metricsText) metricsText += ' | ';
      metricsText += `Attendance: ${data.completion.attendance_percentage.toFixed(1)}%`;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94); // Green for metrics
    doc.text(metricsText, centerX, boxY, { align: 'center' });
  }

  // ===== FOOTER SECTION =====
  currentY = pageHeight - 40;

  // Signature section
  const signatureX = centerX - 25;
  const signatureLineY = currentY + 10;

  // Add signature image if available
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, currentY, 22, 8);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line
  doc.setLineWidth(0.3);
  doc.setDrawColor(150, 150, 150);
  doc.line(signatureX, signatureLineY, signatureX + 50, signatureLineY);

  // Officer name and title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 9, { align: 'center' });

  // Certificate ID & Issue Date (bottom)
  currentY = pageHeight - 15;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId} • Issued on ${issueDate}`, centerX, currentY, { align: 'center' });

  // Minimal footer line
  doc.setLineWidth(0.2);
  doc.setDrawColor(220, 220, 220);
  doc.line(40, pageHeight - 20, pageWidth - 40, pageHeight - 20);

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
