/**
 * Professional Business Certificate Template
 *
 * Corporate minimal style with left-aligned layout and clean typography
 * Color scheme: Teal (#14B8A6) and Gray (#64748B) on white background
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
 * Generate Professional Business certificate template
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
  const leftMargin = 25;
  const rightMargin = 25;

  // ===== BACKGROUND =====
  // Pure white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Left accent bar (Teal)
  doc.setFillColor(20, 184, 166); // #14B8A6
  doc.rect(0, 0, 8, pageHeight, 'F');

  // Subtle right border
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240); // Light gray
  doc.line(pageWidth - 1, 0, pageWidth - 1, pageHeight);

  // ===== HEADER (Left-aligned, Professional) =====
  let currentY = 20;

  // Logo row (horizontal, left-aligned)
  const logoSize = 18;
  const logoSpacing = 25;
  let logoX = leftMargin;

  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', logoX, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  logoX += logoSpacing;
  if (pesoLogo) {
    try {
      doc.addImage(pesoLogo, 'JPEG', logoX, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // Header text (right side of logos)
  const textX = leftMargin + 90;
  currentY += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // Gray
  doc.text('REPUBLIC OF THE PHILIPPINES', textX, currentY);

  currentY += 4;
  doc.setFontSize(8);
  doc.text('PROVINCE OF ILOCOS NORTE', textX, currentY);

  currentY += 4;
  doc.text('MUNICIPALITY OF ASUNCION', textX, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 184, 166); // Teal
  doc.text('Public Employment Service Office', textX, currentY);

  // Horizontal divider line
  currentY += 10;
  doc.setLineWidth(1.5);
  doc.setDrawColor(20, 184, 166);
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);

  // ===== CERTIFICATE TITLE (Left-aligned) =====
  currentY += 15;
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Dark slate
  doc.text('CERTIFICATE OF COMPLETION', leftMargin, currentY);

  currentY += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Professional Training Certification', leftMargin, currentY);

  // ===== CERTIFICATE BODY (Left-aligned, Professional spacing) =====
  currentY += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('This certifies that', leftMargin, currentY);

  // Trainee Name (Large, Bold, Teal)
  currentY += 10;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 184, 166);
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, leftMargin, currentY);

  // Simple underline
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(20, 184, 166);
  doc.line(leftMargin, currentY, leftMargin + nameWidth, currentY);

  // Completion statement
  currentY += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('has successfully completed the professional training program', leftMargin, currentY);

  // Program Title (Medium, Bold)
  currentY += 8;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  const programTitle = truncateText(doc, data.program.title, pageWidth - leftMargin - rightMargin, 13);
  doc.text(programTitle, leftMargin, currentY);

  // ===== PROGRAM DETAILS (Professional table-like layout) =====
  currentY += 12;
  const detailsBoxX = leftMargin;
  const detailsBoxWidth = pageWidth - leftMargin - rightMargin;
  const rowHeight = 8;

  // Background for details section
  doc.setFillColor(249, 250, 251); // Very light gray
  doc.rect(detailsBoxX, currentY, detailsBoxWidth, 40, 'F');

  // Left border accent
  doc.setFillColor(20, 184, 166);
  doc.rect(detailsBoxX, currentY, 3, 40, 'F');

  currentY += 7;
  const labelX = detailsBoxX + 10;
  const valueX = labelX + 50;

  // Duration
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DURATION:', labelX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`${startDate} - ${endDate} (${data.program.duration})`, valueX, currentY);

  // Speaker
  if (data.program.speaker_name) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('FACILITATOR:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(data.program.speaker_name, valueX, currentY);
  }

  // Skills
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('COMPETENCIES:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const skills = data.program.skills_covered.slice(0, 5).join(', ');
    const skillsText = truncateText(doc, skills, detailsBoxWidth - 70, 9);
    doc.text(skillsText, valueX, currentY);
  }

  // Performance metrics
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PERFORMANCE:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    let metricsText = '';
    if (data.completion.assessment_score !== null) {
      metricsText += `Assessment ${data.completion.assessment_score.toFixed(1)}%`;
    }
    if (data.completion.attendance_percentage !== null) {
      if (metricsText) metricsText += ' • ';
      metricsText += `Attendance ${data.completion.attendance_percentage.toFixed(1)}%`;
    }
    doc.text(metricsText, valueX, currentY);
  }

  // ===== FOOTER SECTION =====
  currentY = pageHeight - 45;

  // Certificate metadata
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId}`, leftMargin, currentY);
  doc.text(`Issue Date: ${issueDate}`, leftMargin, currentY + 4);

  // Signature section (Professional, left-aligned)
  currentY += 15;
  const signatureX = leftMargin;

  // Signature label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Digitally Certified By:', signatureX, currentY);

  currentY += 5;

  // Add signature image
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, currentY, 25, 8);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  currentY += 10;

  // Signature line
  doc.setLineWidth(0.5);
  doc.setDrawColor(20, 184, 166);
  doc.line(signatureX, currentY, signatureX + 60, currentY);

  // Officer details
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(data.certification.issued_by.name.toUpperCase(), signatureX, currentY);

  currentY += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(data.certification.issued_by.title, signatureX, currentY);

  // Bottom accent line
  doc.setLineWidth(2);
  doc.setDrawColor(20, 184, 166);
  doc.line(0, pageHeight - 1, pageWidth, pageHeight - 1);

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
