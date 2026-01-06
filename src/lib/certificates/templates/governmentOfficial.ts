/**
 * Government Official Certificate Template
 *
 * Formal government document style with seal-heavy design and multiple signature blocks
 * Color scheme: Navy (#1E3A8A) and Gold (#F59E0B) on off-white background
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
 * Generate Government Official certificate template
 */
export async function generateGovernmentOfficialCertificate(
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

  // Create PDF in portrait orientation (government document standard)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const margin = 15;

  // ===== BACKGROUND & BORDERS =====
  // Off-white background
  doc.setFillColor(252, 251, 245); // #FCFBF5
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border (Navy)
  doc.setLineWidth(2.5);
  doc.setDrawColor(30, 58, 138); // #1E3A8A
  doc.rect(margin - 3, margin - 3, pageWidth - (margin - 3) * 2, pageHeight - (margin - 3) * 2, 'S');

  // Inner border (Gold)
  doc.setLineWidth(0.5);
  doc.setDrawColor(245, 158, 11); // #F59E0B
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'S');

  // ===== LARGE CENTRAL SEAL (Government style) =====
  const sealSize = 45;
  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', centerX - sealSize / 2, 20, sealSize, sealSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  // ===== HEADER =====
  let currentY = 70;

  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(9);
  doc.text('PROVINCE OF ILOCOS NORTE', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(10);
  doc.text('MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(8);
  doc.setFont('times', 'italic');
  doc.setTextColor(245, 158, 11);
  doc.text('Office of the Public Employment Service', centerX, currentY, { align: 'center' });

  // Decorative double line
  currentY += 7;
  doc.setLineWidth(1);
  doc.setDrawColor(30, 58, 138);
  doc.line(margin + 10, currentY, pageWidth - margin - 10, currentY);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, currentY + 1.5, pageWidth - margin - 10, currentY + 1.5);

  // ===== CERTIFICATE TITLE =====
  currentY += 12;
  doc.setFontSize(22);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('CERTIFICATE', centerX, currentY, { align: 'center' });

  currentY += 6;
  doc.setFontSize(14);
  doc.text('OF TRAINING COMPLETION', centerX, currentY, { align: 'center' });

  // Gold border around title
  currentY += 3;
  doc.setLineWidth(0.8);
  doc.setDrawColor(245, 158, 11);
  doc.line(margin + 20, currentY, pageWidth - margin - 20, currentY);

  // ===== DOCUMENT NUMBER (Official style) =====
  currentY += 8;
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.setTextColor(100, 100, 100);
  const certId = data.certification.certificate_id || generateCertificateId();
  doc.text(`Document No. ${certId}`, centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE BODY =====
  currentY += 12;
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('TO WHOM IT MAY CONCERN:', margin + 10, currentY);

  currentY += 10;
  const bodyX = margin + 10;
  const bodyWidth = pageWidth - margin * 2 - 20;

  // First paragraph
  doc.setFontSize(10);
  const para1 = `This is to certify that ${data.trainee.full_name.toUpperCase()} has satisfactorily completed `;
  doc.text(para1, bodyX, currentY, { maxWidth: bodyWidth });
  currentY += 10;

  const para2 = `the training program entitled "${data.program.title}" conducted by the Public Employment Service Office `;
  doc.text(para2, bodyX, currentY, { maxWidth: bodyWidth });
  currentY += 10;

  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Present';
  const para3 = `of the Municipality of Asuncion, Province of Ilocos Norte, from ${startDate} to ${endDate}.`;
  doc.text(para3, bodyX, currentY, { maxWidth: bodyWidth });

  // Program details box
  currentY += 15;
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  const boxHeight = 30;
  doc.rect(bodyX, currentY, bodyWidth, boxHeight, 'FD');

  currentY += 6;
  doc.setFontSize(9);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TRAINING DETAILS', bodyX + 5, currentY);

  currentY += 5;
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Duration: ${data.program.duration}`, bodyX + 5, currentY);

  if (data.program.speaker_name) {
    currentY += 5;
    doc.setFont('times', 'italic');
    doc.setTextColor(245, 158, 11);
    doc.text(`Resource Speaker: ${data.program.speaker_name}`, bodyX + 5, currentY);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
  }

  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    currentY += 5;
    doc.setFont('times', 'bold');
    doc.text('Competencies Acquired:', bodyX + 5, currentY);
    currentY += 4;
    doc.setFont('times', 'normal');
    const skills = data.program.skills_covered.slice(0, 4).join(', ');
    const skillsText = truncateText(doc, skills, bodyWidth - 10, 9);
    doc.text(skillsText, bodyX + 5, currentY);
  }

  // Performance metrics
  currentY += boxHeight - 18;
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    currentY += 8;
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('PERFORMANCE RATING', bodyX, currentY);

    currentY += 5;
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    if (data.completion.assessment_score !== null) {
      doc.text(`Assessment Score: ${data.completion.assessment_score.toFixed(1)}%`, bodyX + 5, currentY);
      currentY += 5;
    }
    if (data.completion.attendance_percentage !== null) {
      doc.text(`Attendance: ${data.completion.attendance_percentage.toFixed(1)}%`, bodyX + 5, currentY);
    }
  }

  // Closing statement
  currentY += 12;
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`This certificate is issued this ${issueDate} at the Municipality of Asuncion,`, bodyX, currentY, { maxWidth: bodyWidth });
  currentY += 5;
  doc.text('Ilocos Norte, Philippines.', bodyX, currentY);

  // ===== SIGNATURE SECTION (Government multi-block style) =====
  currentY = pageHeight - 65;

  // Primary signature (Issuing Officer)
  const sigX = centerX - 30;

  // Add signature image
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', sigX, currentY, 25, 8);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  currentY += 10;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(sigX - 10, currentY, sigX + 50, currentY);

  currentY += 4;
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.certification.issued_by.name.toUpperCase(), centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.text(data.certification.issued_by.title, centerX, currentY, { align: 'center' });

  // Official seal stamp placeholder (bottom right)
  currentY = pageHeight - 30;
  doc.setFontSize(6);
  doc.setFont('times', 'italic');
  doc.setTextColor(200, 200, 200);
  doc.text('NOT VALID WITHOUT OFFICIAL SEAL', pageWidth - margin - 5, currentY, { align: 'right' });

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
