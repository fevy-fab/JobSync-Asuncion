/**
 * Colorful Achievement Certificate Template
 *
 * Vibrant, celebratory design with multi-color gradient and decorative elements
 * Color scheme: Multi-color gradient (Purple #8B5CF6, Pink #EC4899, Orange #F97316)
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
 * Generate Colorful Achievement certificate template
 */
export async function generateColorfulAchievementCertificate(
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

  // ===== BACKGROUND WITH GRADIENT =====
  // Light gradient background (simulated)
  const gradientSteps = 50;
  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / gradientSteps;
    // Transition from light purple to light pink to light orange
    let r, g, b;
    if (ratio < 0.33) {
      // Purple to Pink
      const t = ratio / 0.33;
      r = 220 + t * 15;
      g = 200 + t * 20;
      b = 250 - t * 30;
    } else if (ratio < 0.66) {
      // Pink to Orange
      const t = (ratio - 0.33) / 0.33;
      r = 235 + t * 15;
      g = 220 - t * 30;
      b = 220 + t * 20;
    } else {
      // Orange fade
      const t = (ratio - 0.66) / 0.34;
      r = 250;
      g = 190 + t * 30;
      b = 240 - t * 60;
    }
    doc.setFillColor(r, g, b);
    doc.rect(0, (i * pageHeight) / gradientSteps, pageWidth, pageHeight / gradientSteps, 'F');
  }

  // ===== DECORATIVE BORDER (Rainbow style) =====
  doc.setLineWidth(3);
  doc.setDrawColor(139, 92, 246); // Purple
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  doc.setLineWidth(2);
  doc.setDrawColor(236, 72, 153); // Pink
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22, 'S');

  doc.setLineWidth(1);
  doc.setDrawColor(249, 115, 22); // Orange
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28, 'S');

  // ===== DECORATIVE CORNER STARS =====
  doc.setFontSize(20);
  doc.setTextColor(255, 215, 0); // Gold stars
  doc.text('★', 12, 15);
  doc.text('★', pageWidth - 16, 15);
  doc.text('★', 12, pageHeight - 8);
  doc.text('★', pageWidth - 16, pageHeight - 8);

  // ===== LOGOS (Top arrangement) =====
  let currentY = 18;
  const logoSize = 20;

  // LGU Seal (Top Left)
  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', 25, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  // PESO Logo (Top Right)
  if (pesoLogo) {
    try {
      doc.addImage(pesoLogo, 'JPEG', pageWidth - 45, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // ===== HEADER =====
  currentY = 25;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246); // Purple
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(9);
  doc.setTextColor(236, 72, 153); // Pink
  doc.text('PROVINCE OF ILOCOS NORTE • MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(8);
  doc.setTextColor(249, 115, 22); // Orange
  doc.text('Public Employment Service Office (P.E.S.O.)', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE TITLE (Large & Colorful) =====
  currentY += 15;
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(236, 72, 153); // Pink
  doc.text('CERTIFICATE', centerX, currentY, { align: 'center' });

  currentY += 8;
  doc.setFontSize(20);
  doc.setTextColor(139, 92, 246); // Purple
  doc.text('OF ACHIEVEMENT', centerX, currentY, { align: 'center' });

  // Decorative wave line
  currentY += 3;
  doc.setLineWidth(1.5);
  doc.setDrawColor(249, 115, 22); // Orange
  doc.line(80, currentY, pageWidth - 80, currentY);

  // ===== CELEBRATION BADGE =====
  currentY += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 215, 0); // Gold
  doc.text('★ CONGRATULATIONS! ★', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE BODY =====
  currentY += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('This certificate is proudly presented to', centerX, currentY, { align: 'center' });

  // Trainee Name (Extra Large, Colorful)
  currentY += 12;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(236, 72, 153); // Pink
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Decorative name underline (rainbow)
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(1);
  doc.setDrawColor(139, 92, 246);
  doc.line(centerX - nameWidth / 2 - 10, currentY, centerX - nameWidth / 2 + nameWidth / 3 - 10, currentY);
  doc.setDrawColor(236, 72, 153);
  doc.line(centerX - nameWidth / 2 + nameWidth / 3 - 10, currentY, centerX - nameWidth / 2 + (2 * nameWidth) / 3 - 10, currentY);
  doc.setDrawColor(249, 115, 22);
  doc.line(centerX - nameWidth / 2 + (2 * nameWidth) / 3 - 10, currentY, centerX + nameWidth / 2 + 10, currentY);

  // Achievement text
  currentY += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('For successfully completing the training program', centerX, currentY, { align: 'center' });

  // Program Title (Large, Multi-color)
  currentY += 10;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246); // Purple
  const programTitle = truncateText(doc, data.program.title, pageWidth - 100, 16);
  doc.text(programTitle, centerX, currentY, { align: 'center' });

  // ===== ACHIEVEMENT DETAILS BOX (Colorful border) =====
  currentY += 12;
  const boxHeight = 28;
  const boxWidth = pageWidth - 120;
  const boxX = centerX - boxWidth / 2;

  // Multi-color border
  doc.setLineWidth(2);
  doc.setDrawColor(139, 92, 246);
  doc.line(boxX, currentY, boxX + boxWidth / 3, currentY);
  doc.setDrawColor(236, 72, 153);
  doc.line(boxX + boxWidth / 3, currentY, boxX + (2 * boxWidth) / 3, currentY);
  doc.setDrawColor(249, 115, 22);
  doc.line(boxX + (2 * boxWidth) / 3, currentY, boxX + boxWidth, currentY);

  doc.setLineWidth(2);
  doc.setDrawColor(139, 92, 246);
  doc.line(boxX, currentY + boxHeight, boxX + boxWidth / 3, currentY + boxHeight);
  doc.setDrawColor(236, 72, 153);
  doc.line(boxX + boxWidth / 3, currentY + boxHeight, boxX + (2 * boxWidth) / 3, currentY + boxHeight);
  doc.setDrawColor(249, 115, 22);
  doc.line(boxX + (2 * boxWidth) / 3, currentY + boxHeight, boxX + boxWidth, currentY + boxHeight);

  doc.setLineWidth(2);
  doc.setDrawColor(139, 92, 246);
  doc.line(boxX, currentY, boxX, currentY + boxHeight);
  doc.line(boxX + boxWidth, currentY, boxX + boxWidth, currentY + boxHeight);

  // Box content
  currentY += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`${startDate} - ${endDate} • ${data.program.duration}`, centerX, currentY, { align: 'center' });

  if (data.program.speaker_name) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 115, 22); // Orange
    doc.text(`✦ Facilitated by ${data.program.speaker_name} ✦`, centerX, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }

  // Skills with colorful bullets
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    currentY += 6;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const skills = data.program.skills_covered.slice(0, 5).join(' ★ ');
    const skillsText = truncateText(doc, skills, boxWidth - 10, 8);
    doc.text(skillsText, centerX, currentY, { align: 'center' });
  }

  // Performance with icons
  currentY += 5;
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    let metricsText = '';
    if (data.completion.assessment_score !== null) {
      metricsText += `⬆ Score: ${data.completion.assessment_score.toFixed(1)}%`;
    }
    if (data.completion.attendance_percentage !== null) {
      if (metricsText) metricsText += '  •  ';
      metricsText += `✓ Attendance: ${data.completion.attendance_percentage.toFixed(1)}%`;
    }
    doc.setTextColor(34, 197, 94); // Green
    doc.text(metricsText, centerX, currentY, { align: 'center' });
  }

  // ===== FOOTER SECTION =====
  currentY = pageHeight - 38;

  // Certificate ID & Date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId} • Issued: ${issueDate}`, centerX, currentY, { align: 'center' });

  // Signature section
  currentY += 8;
  const signatureX = centerX - 25;
  const signatureLineY = currentY + 8;

  // Add signature image
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, currentY, 22, 8);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line (colorful)
  doc.setLineWidth(0.5);
  doc.setDrawColor(236, 72, 153);
  doc.line(signatureX, signatureLineY, signatureX + 50, signatureLineY);

  // Officer details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 9, { align: 'center' });

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
