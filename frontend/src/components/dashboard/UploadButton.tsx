'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeContract } from '@/lib/api';
import { UploadModal } from './UploadModal';

interface UploadButtonProps {
  onUploadComplete?: () => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
  }, []);

  const startStepAnimation = useCallback(() => {
    let step = 1;
    setCurrentStep(1);

    stepIntervalRef.current = setInterval(() => {
      step += 1;
      if (step <= 5) {
        setCurrentStep(step);
      }
    }, 1500);
  }, []);

  const stopStepAnimation = useCallback(() => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }, []);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input for next selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file');
      setIsModalOpen(true);
      return;
    }

    // Start upload process
    setError(null);
    setCurrentStep(1);
    setIsUploading(true);
    setIsModalOpen(true);
    startStepAnimation();

    try {
      const result = await analyzeContract(file);

      stopStepAnimation();

      if (result.success && result.contract_id) {
        // Show final step
        setCurrentStep(6);

        // Navigate after brief delay
        setTimeout(() => {
          setIsModalOpen(false);
          setIsUploading(false);
          setCurrentStep(1);
          router.push(`/contracts/${result.contract_id}`);
          onUploadComplete?.();
        }, 600);
      } else {
        setError(result.error || 'Failed to analyze contract');
        setIsUploading(false);
      }
    } catch (err) {
      stopStepAnimation();
      setError(err instanceof Error ? err.message : 'Failed to analyze contract');
      setIsUploading(false);
    }
  };

  const handleModalClose = () => {
    if (!isUploading) {
      setIsModalOpen(false);
      setError(null);
      setCurrentStep(1);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Analyzing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload & Decode
          </>
        )}
      </button>

      <UploadModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        currentStep={currentStep}
        error={error}
      />
    </>
  );
}

export { UploadButton };
