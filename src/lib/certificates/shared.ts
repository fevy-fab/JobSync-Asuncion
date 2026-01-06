/**
 * Shared utilities for certificate generation
 * Functions used across all certificate templates
 */

/**
 * Load image as base64 from public folder
 * Supports both PNG and JPEG formats
 *
 * @param imagePath - Relative path from public folder (e.g., 'logos/peso-logo.jpeg')
 * @returns Base64 data URI or null if loading fails
 */
export async function loadImageBase64(imagePath: string): Promise<string | null> {
  try {
    // Check if we're in browser or Node.js environment
    if (typeof window !== 'undefined') {
      // Browser environment - use fetch
      const response = await fetch(`/${imagePath}`);
      if (!response.ok) {
        console.warn(`Image file not found at /${imagePath}`);
        return null;
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Node.js environment - use fs
      const fs = await import('fs');
      const path = await import('path');
      const fullPath = path.join(process.cwd(), 'public', imagePath);

      if (!fs.existsSync(fullPath)) {
        console.warn(`Image file not found at ${fullPath}`);
        return null;
      }

      const imageBuffer = fs.readFileSync(fullPath);
      const base64Image = imageBuffer.toString('base64');

      // Detect file extension for proper MIME type
      const ext = imagePath.toLowerCase().split('.').pop();
      const mimeType = ext === 'png' ? 'image/png' :
                       ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       'image/png'; // default to PNG

      return `data:${mimeType};base64,${base64Image}`;
    }
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    return null;
  }
}

/**
 * Load signature image from Supabase Storage as base64
 * Uses service role to access private officer-signatures bucket
 */
export async function loadSignatureBase64(signatureUrl: string): Promise<string | null> {
  try {
    // Certificate generation happens server-side (API route), so we use Node.js path
    if (typeof window !== 'undefined') {
      // Browser environment should not happen for certificate generation
      console.warn('Certificate generation should be server-side only');
      return null;
    } else {
      // Node.js environment - use Supabase service client to download from private bucket
      const { createClient } = await import('@supabase/supabase-js');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials for signature loading');
        return null;
      }

      // Create service client (bypasses RLS policies)
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Download signature file from private bucket
      const { data, error } = await supabase.storage
        .from('officer-signatures')
        .download(signatureUrl);

      if (error || !data) {
        console.warn(`Signature file not found: ${signatureUrl}`, error);
        return null;
      }

      // Convert blob to base64
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      // Determine MIME type (default to PNG if not specified)
      const mimeType = data.type || 'image/png';

      // Return data URI for jsPDF
      return `data:${mimeType};base64,${base64}`;
    }
  } catch (error) {
    console.error('Error loading signature:', error);
    return null;
  }
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate unique certificate ID
 */
export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const municipality = 'ASUNCION';
  const sequence = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${year}-${municipality}-${sequence}`;
}

/**
 * Add decorative corner elements to PDF
 * Used in formal certificate templates
 */
export function addCornerDecorations(
  doc: any,
  pageWidth: number,
  pageHeight: number,
  color: [number, number, number] = [34, 165, 85]
): void {
  const [r, g, b] = color;
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(1);

  const cornerSize = 15;
  const margin = 10;

  // Top-left corner
  doc.line(margin, margin, margin + cornerSize, margin);
  doc.line(margin, margin, margin, margin + cornerSize);

  // Top-right corner
  doc.line(pageWidth - margin, margin, pageWidth - margin - cornerSize, margin);
  doc.line(pageWidth - margin, margin, pageWidth - margin, margin + cornerSize);

  // Bottom-left corner
  doc.line(margin, pageHeight - margin, margin + cornerSize, pageHeight - margin);
  doc.line(margin, pageHeight - margin, margin, pageHeight - margin - cornerSize);

  // Bottom-right corner
  doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin - cornerSize, pageHeight - margin);
  doc.line(pageWidth - margin, pageHeight - margin, pageWidth - margin, pageHeight - margin - cornerSize);
}

/**
 * Truncate text to fit within specified width
 */
export function truncateText(
  doc: any,
  text: string,
  maxWidth: number,
  fontSize: number
): string {
  doc.setFontSize(fontSize);
  const width = doc.getTextWidth(text);

  if (width <= maxWidth) {
    return text;
  }

  // Truncate and add ellipsis
  let truncated = text;
  while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + '...';
}
