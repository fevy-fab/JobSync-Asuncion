/**
 * Executive Modern Certificate Template
 *
 * Contemporary executive style with centered layout and refined color palette
 * Color scheme: Deep Charcoal (#1F2937) with subtle teal accents on white background
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
 * Generate Executive Modern certificate template
 */
export async function generateProfessionalBusinessCertificate(
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
  // Clean white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== SUBTLE LEFT ACCENT (Optional, thin) =====
  // Very thin teal accent bar (2mm)
  doc.setFillColor(20, 184, 166); // #14B8A6
  doc.rect(0, 0, 2, pageHeight, 'F');

  // ===== HEADER (Centered) =====
  let currentY = 20;

  // Logo row (centered horizontally)
  const logoSize = 18;
  const logoSpacing = 28;
  const startX = centerX - (logoSpacing * 0.5);

  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', startX, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  if (pesoLogo) {
    try {
      doc.addImage(pesoLogo, 'JPEG', startX + logoSpacing, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // Header text (centered)
  currentY += 24;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 59); // Deep Charcoal
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.text('PROVINCE OF ILOCOS NORTE', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.text('MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 184, 166); // Teal accent
  doc.text('Public Employment Service Office', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE TITLE (Centered) =====
  currentY += 14;
  doc.setFontSize(24);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59); // Charcoal
  doc.text('CERTIFICATE OF COMPLETION', centerX, currentY, { align: 'center' });

  // Minimal teal underline
  currentY += 3;
  doc.setLineWidth(1);
  doc.setDrawColor(20, 184, 166);
  doc.line(centerX - 65, currentY, centerX + 65, currentY);

  // ===== CERTIFICATE BODY (Centered) =====
  currentY += 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('This certifies that', centerX, currentY, { align: 'center' });

  // Trainee Name (Large, Bold, Charcoal)
  currentY += 11;
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59);
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Simple underline
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(100, 116, 139);
  doc.line(centerX - nameWidth / 2, currentY, centerX + nameWidth / 2, currentY);

  // Completion statement
  currentY += 13;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('has successfully completed the professional training program', centerX, currentY, { align: 'center' });

  // Program Title (Medium, Bold)
  currentY += 10;
  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59);
  const programTitle = truncateText(doc, data.program.title, pageWidth - 80, 13);
  doc.text(programTitle, centerX, currentY, { align: 'center' });

  // ===== PROGRAM DETAILS (Clean box, centered) =====
  currentY += 14;
  const detailsBoxWidth = pageWidth - 100;
  const detailsBoxX = centerX - detailsBoxWidth / 2;
  const rowHeight = 8;

  // Background for details section
  doc.setFillColor(249, 250, 251); // Very light gray
  doc.rect(detailsBoxX, currentY, detailsBoxWidth, 38, 'F');

  currentY += 8;
  const labelX = detailsBoxX + 20;

  // Duration
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Duration:', labelX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 59);
  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`${startDate} - ${endDate} (${data.program.duration})`, labelX + 25, currentY);

  // Speaker
  if (data.program.speaker_name) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Facilitator:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 59);
    doc.text(data.program.speaker_name, labelX + 25, currentY);
  }

  // Skills
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Competencies:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 59);
    const skills = data.program.skills_covered.slice(0, 5).join(', ');
    const skillsText = truncateText(doc, skills, detailsBoxWidth - 60, 9);
    doc.text(skillsText, labelX + 25, currentY);
  }

  // Performance metrics
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Performance:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 59);
    let metricsText = '';
    if (data.completion.assessment_score !== null) {
      metricsText += `Assessment ${data.completion.assessment_score.toFixed(1)}%`;
    }
    if (data.completion.attendance_percentage !== null) {
      if (metricsText) metricsText += ' • ';
      metricsText += `Attendance ${data.completion.attendance_percentage.toFixed(1)}%`;
    }
    doc.text(metricsText, labelX + 25, currentY);
  }

  // ===== FOOTER SECTION =====
  currentY = pageHeight - 42;

  // Certificate metadata
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId}`, centerX, currentY, { align: 'center' });
  doc.text(`Issue Date: ${issueDate}`, centerX, currentY + 4, { align: 'center' });

  // Signature section (Centered)
  currentY += 12;
  const signatureWidth = 40;
  const signatureHeight = 14;
  const signatureX = centerX - (signatureWidth / 2);
  const signatureLineY = currentY + 12;

  // Add signature image
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, signatureLineY - 14, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line
  doc.setLineWidth(0.5);
  doc.setDrawColor(100, 116, 139);
  const lineWidth = signatureWidth;
  doc.line(centerX - lineWidth / 2, signatureLineY, centerX + lineWidth / 2, signatureLineY);

  // Officer details
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59);
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 9, { align: 'center' });

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
