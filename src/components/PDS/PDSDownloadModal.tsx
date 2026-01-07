'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui';
import { FileText, Download, CheckCircle2, FileSpreadsheet, FileCheck } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface PDSDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdsId: string;
}

export function PDSDownloadModal({ isOpen, onClose, pdsId }: PDSDownloadModalProps) {
  const { showToast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<'template' | 'official' | 'csc' | 'modern' | 'excel'>('template');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [useCurrentDate, setUseCurrentDate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        format: selectedFormat,
        includeSignature: includeSignature.toString(),
        useCurrentDate: useCurrentDate.toString(),
      });

      // Call download API
      const response = await fetch(`/api/pds/${pdsId}/download?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download PDS');
      }

      // Get the file blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename based on format
      if (selectedFormat === 'excel') {
        // Excel filename from backend Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'PDS_2025.xlsx'; // fallback

        if (contentDisposition) {
          // Use non-greedy regex to avoid capturing quotes
          const match = contentDisposition.match(/filename="([^"]+)"/i);
          if (match && match[1]) {
            filename = match[1];
          }
        }
        link.download = filename;
      } else {
        const formatLabel = selectedFormat === 'template' ? 'Official_Template' : selectedFormat === 'official' ? 'Official_CSC' : selectedFormat === 'csc' ? 'CSC' : 'Modern';
        link.download = `PDS_${formatLabel}_${new Date().toISOString().split('T')[0]}.pdf`;
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Close modal after successful download
      showToast(`PDS downloaded successfully as ${selectedFormat === 'excel' ? 'Excel' : 'PDF'}!`, 'success');
      onClose();
    } catch (error) {
      console.error('Error downloading PDS:', error);
      showToast('Failed to download PDS. Please try again.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Download Personal Data Sheet"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Format:</h3>
          <div className="grid grid-cols-3 gap-3">
            {/* NEW: Official Template (Real PDF) Option */}
            <button
              onClick={() => setSelectedFormat('template')}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                selectedFormat === 'template'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedFormat === 'template' ? 'bg-purple-500' : 'bg-gray-200'
                }`}>
                  <FileCheck className={`w-5 h-5 ${
                    selectedFormat === 'template' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Real Template PDF</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Uses Actual PDF Form
                  </p>
                </div>
                {selectedFormat === 'template' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  </div>
                )}
              </div>
            </button>

            {/* Official CSC (Programmatic) Option */}
            <button
              onClick={() => setSelectedFormat('official')}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                selectedFormat === 'official'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedFormat === 'official' ? 'bg-emerald-500' : 'bg-gray-200'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    selectedFormat === 'official' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Official CSC PDF</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    CSC-Compliant Layout
                  </p>
                </div>
                {selectedFormat === 'official' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
              </div>
            </button>

            {/* CSC Format Option */}
            <button
              onClick={() => setSelectedFormat('csc')}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                selectedFormat === 'csc'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedFormat === 'csc' ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    selectedFormat === 'csc' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Box-based PDS Form (PDF)</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    JobSync Layout
                  </p>
                </div>
                {selectedFormat === 'csc' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
            </button>

            {/* Modern Format Option */}
            <button
              onClick={() => setSelectedFormat('modern')}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                selectedFormat === 'modern'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedFormat === 'modern' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    selectedFormat === 'modern' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Modern PDS Form (PDF)</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Clean Table Design
                  </p>
                </div>
                {selectedFormat === 'modern' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  </div>
                )}
              </div>
            </button>

            {/* Excel Format Option */}
            <button
              onClick={() => setSelectedFormat('excel')}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                selectedFormat === 'excel'
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedFormat === 'excel' ? 'bg-teal-500' : 'bg-gray-200'
                }`}>
                  <FileSpreadsheet className={`w-5 h-5 ${
                    selectedFormat === 'excel' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Official CS PDS Form (Excel)</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    CSC Form No. 212, 2025
                  </p>
                </div>
                {selectedFormat === 'excel' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-500" />
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Download Options */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Download Options:</h3>
          <div className="space-y-2">
            {/* Include Signature – PDF only */}
            {selectedFormat !== 'excel' && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignature}
                  onChange={(e) => setIncludeSignature(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Include Digital Signature</span>
              </label>
            )}

            {/* Use Current Date – works for all formats, including Excel */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCurrentDate}
                onChange={(e) => setUseCurrentDate(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                Use Current Date (instead of saved PDS date)
              </span>
            </label>
          </div>
        </div>

        {/* Format Description */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            {selectedFormat === 'template'
              ? 'Real Template PDF (NEW!)'
              : selectedFormat === 'official'
              ? 'Official CSC PDF'
              : selectedFormat === 'csc'
              ? 'Box-based PDS Form'
              : selectedFormat === 'excel'
              ? 'Official Excel 2025 Format'
              : 'Modern PDS Format'}
          </h4>
          <p className="text-xs text-gray-600">
            {selectedFormat === 'template'
              ? '🆕 Uses the ACTUAL CS Form 212 PDF template file with data overlaid at precise coordinates. This is the real government PDF form with your information filled in programmatically. Most authentic format available!'
              : selectedFormat === 'official'
              ? 'Official CS Form No. 212, Revised 2025 using PDF template overlay. Data is precisely positioned on the authentic government form template with perfect field alignment. Recommended for CSC compliance and government submissions.'
              : selectedFormat === 'csc'
              ? 'Box-based layout format with structured sections. Provides a traditional form-style presentation with clearly defined boxes and fields. Ideal for formal submissions and traditional document formats.'
              : selectedFormat === 'excel'
              ? 'Official government format (CS Form No. 212, Revised 2025). Recommended for submission to government panels and HR offices requiring CSC compliance. Editable spreadsheet format.'
              : 'Streamlined table-based design optimized for readability. Clean layout ideal for internal reviews, portfolio purposes, and digital archiving.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${
              selectedFormat === 'excel' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Downloading...' : `Download ${selectedFormat === 'excel' ? 'Excel' : 'PDF'}`}
          </button>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Info Note */}
        <div className="text-xs text-gray-500 italic">
          <p>Note: The {selectedFormat === 'excel' ? 'Excel file' : 'PDF'} will be generated with the selected format{selectedFormat !== 'excel' ? ' and options' : ''}. Large files may take a few seconds to download.</p>
        </div>
      </div>
    </Modal>
  );
}
