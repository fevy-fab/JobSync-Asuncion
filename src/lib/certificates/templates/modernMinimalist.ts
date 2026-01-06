/**
 * Contemporary Elegance Certificate Template
 *
 * Sophisticated modern design with navy/gold accents and generous white space
 * Color scheme: Deep Navy (#1E3A8A) and Soft Gold (#D4AF37) on off-white background
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
 * Generate Contemporary Elegance certificate template
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
  // Warm off-white background
  doc.setFillColor(253, 253, 249); // #FDFDF9
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== ELEGANT BORDER FRAME =====
  // Outer border (Navy)
  doc.setLineWidth(1.5);
  doc.setDrawColor(30, 58, 138); // Deep Navy
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  // Inner border (Gold)
  doc.setLineWidth(0.6);
  doc.setDrawColor(212, 175, 55); // Soft Gold
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22, 'S');

  // Subtle corner brackets (Gold)
  const cornerSize = 8;
  const cornerOffset = 8;
  doc.setLineWidth(1);
  doc.setDrawColor(212, 175, 55);

  // Top-left corner
  doc.line(cornerOffset, cornerOffset + cornerSize, cornerOffset, cornerOffset);
  doc.line(cornerOffset, cornerOffset, cornerOffset + cornerSize, cornerOffset);

  // Top-right corner
  doc.line(pageWidth - cornerOffset - cornerSize, cornerOffset, pageWidth - cornerOffset, cornerOffset);
  doc.line(pageWidth - cornerOffset, cornerOffset, pageWidth - cornerOffset, cornerOffset + cornerSize);

  // Bottom-left corner
  doc.line(cornerOffset, pageHeight - cornerOffset - cornerSize, cornerOffset, pageHeight - cornerOffset);
  doc.line(cornerOffset, pageHeight - cornerOffset, cornerOffset + cornerSize, pageHeight - cornerOffset);

  // Bottom-right corner
  doc.line(pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset, pageWidth - cornerOffset, pageHeight - cornerOffset);
  doc.line(pageWidth - cornerOffset, pageHeight - cornerOffset - cornerSize, pageWidth - cornerOffset, pageHeight - cornerOffset);

  // ===== LOGOS (Centered) =====
  let currentY = 20;
  const logoSize = 20;
  const logoSpacing = 25;

  // Calculate total width and center position for both logos as a group
  const totalWidth = logoSize * 2 + logoSpacing;
  const startX = centerX - (totalWidth / 2);

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
      doc.addImage(pesoLogo, 'JPEG', startX + logoSize + logoSpacing, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // ===== HEADER TEXT =====
  currentY = 46;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(10);
  doc.text('PROVINCE OF ILOCOS NORTE • MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Medium gray
  doc.text('Public Employment Service Office (P.E.S.O.)', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE TITLE =====
  currentY += 18;
  doc.setFontSize(26);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  doc.text('CERTIFICATE OF COMPLETION', centerX, currentY, { align: 'center' });

  // Elegant gold underline
  currentY += 2;
  doc.setLineWidth(0.8);
  doc.setDrawColor(212, 175, 55); // #D4AF37 Soft Gold
  doc.line(centerX - 60, currentY, centerX + 60, currentY);

  // ===== CERTIFICATE BODY =====
  currentY += 16;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(45, 45, 45); // Charcoal
  doc.text('This certifies that', centerX, currentY, { align: 'center' });

  // Trainee Name (Elegant serif)
  currentY += 12;
  doc.setFontSize(22);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Subtle name underline
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55); // Gold
  doc.line(centerX - nameWidth / 2, currentY, centerX + nameWidth / 2, currentY);

  // Completion text
  currentY += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(45, 45, 45);
  doc.text('has successfully completed the training program', centerX, currentY, { align: 'center' });

  // Program Title (Navy, serif)
  currentY += 10;
  doc.setFontSize(16);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  const programTitle = truncateText(doc, data.program.title, pageWidth - 80, 16);
  doc.text(programTitle, centerX, currentY, { align: 'center' });

  // ===== PROGRAM DETAILS BOX (More distinct background with border) =====
  currentY += 10;
  const boxHeight = 28;
  const boxWidth = pageWidth - 100;
  const boxX = centerX - boxWidth / 2;

  // More visible background with subtle gold border
  doc.setFillColor(250, 248, 240); // #FAF8F0 More contrast
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55); // Gold
  doc.rect(boxX, currentY, boxWidth, boxHeight, 'FD');

  // Details inside box
  let boxY = currentY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99); // Gray

  // Date range
  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`Duration: ${startDate} - ${endDate} (${data.program.duration})`, centerX, boxY, { align: 'center' });

  // Speaker name
  if (data.program.speaker_name) {
    boxY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Navy
    doc.text(`Facilitated by: ${data.program.speaker_name}`, centerX, boxY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
  }

  // Skills covered
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    boxY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('Skills:', centerX, boxY, { align: 'center' });
    boxY += 5;
    doc.setFont('helvetica', 'normal');
    const skills = data.program.skills_covered.slice(0, 5).join(', ');
    const skillsText = truncateText(doc, skills, boxWidth - 20, 10);
    doc.text(skillsText, centerX, boxY, { align: 'center' });
  }

  // Assessment & Attendance
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    boxY += 6;
    let metricsText = '';
    if (data.completion.assessment_score !== null) {
      metricsText += `Assessment: ${data.completion.assessment_score.toFixed(1)}%`;
    }
    if (data.completion.attendance_percentage !== null) {
      if (metricsText) metricsText += ' | ';
      metricsText += `Attendance: ${data.completion.attendance_percentage.toFixed(1)}%`;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Navy instead of green
    doc.text(metricsText, centerX, boxY, { align: 'center' });
  }

  // ===== FOOTER SECTION =====
  currentY = pageHeight - 40;

  // Signature section
  const signatureWidth = 40;
  const signatureHeight = 14;
  const signatureX = centerX - (signatureWidth / 2);
  const signatureLineY = currentY + 12;

  // Add signature image if available
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, signatureLineY - 14, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line (gold)
  doc.setLineWidth(0.5);
  doc.setDrawColor(212, 175, 55); // Gold
  const lineWidth = signatureWidth;
  doc.line(centerX - lineWidth / 2, signatureLineY, centerX + lineWidth / 2, signatureLineY);

  // Officer name and title
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 5, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gray
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 9, { align: 'center' });

  // Certificate ID & Issue Date
  currentY = pageHeight - 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(156, 163, 175); // Light gray
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId} • Issued on ${issueDate}`, centerX, currentY, { align: 'center' });

  // Elegant double footer line
  doc.setLineWidth(0.5);
  doc.setDrawColor(212, 175, 55); // Gold
  doc.line(35, pageHeight - 18, pageWidth - 35, pageHeight - 18);
  doc.setLineWidth(0.2);
  doc.line(35, pageHeight - 17, pageWidth - 35, pageHeight - 17);

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
