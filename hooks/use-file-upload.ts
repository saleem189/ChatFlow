// ================================
// useFileUpload Hook
// ================================
// Centralized hook for file upload with image compression
// Handles file validation, compression, and upload

"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export interface FileUploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface UseFileUploadOptions {
  maxSize?: number; // Max file size in bytes (default: 10MB)
  compressImages?: boolean; // Compress images before upload (default: true)
  maxImageWidth?: number; // Max image width for compression (default: 1920)
  maxImageHeight?: number; // Max image height for compression (default: 1920)
  imageQuality?: number; // Image quality 0-1 (default: 0.85)
}

export interface UseFileUploadReturn {
  upload: (file: File) => Promise<FileUploadResult | null>;
  uploading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for file uploads with automatic image compression
 * 
 * @example
 * ```tsx
 * const { upload, uploading, error } = useFileUpload();
 * 
 * const handleFileSelect = async (e) => {
 *   const file = e.target.files?.[0];
 *   if (file) {
 *     const result = await upload(file);
 *     if (result) {
 *       // Use result.url, result.fileName, etc.
 *     }
 *   }
 * };
 * ```
 */
export function useFileUpload(
  options: UseFileUploadOptions = {}
): UseFileUploadReturn {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    compressImages = true,
    maxImageWidth = 1920,
    maxImageHeight = 1920,
    imageQuality = 0.85,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Compress image file if it's an image
   */
  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      if (!compressImages || !file.type.startsWith("image/")) {
        return file; // Return original file if not an image or compression disabled
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > height) {
              if (width > maxImageWidth) {
                height = (height * maxImageWidth) / width;
                width = maxImageWidth;
              }
            } else {
              if (height > maxImageHeight) {
                width = (width * maxImageHeight) / height;
                height = maxImageHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    // Ensure we preserve the original file name and type
                    const compressedFile = new File([blob], file.name, {
                      type: file.type || "image/png", // Fallback to PNG if type is missing
                      lastModified: Date.now(),
                    });
                    // Verify the file was created correctly
                    if (compressedFile.size === 0) {
                      console.warn("Compressed file is empty, using original");
                      resolve(file);
                    } else {
                      resolve(compressedFile);
                    }
                  } else {
                    resolve(file); // Fallback to original
                  }
                },
                file.type || "image/png", // Fallback to PNG if type is missing
                imageQuality
              );
            } else {
              resolve(file); // Fallback to original
            }
          };
          img.onerror = () => resolve(file); // Fallback to original on error
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file); // Fallback to original on error
        reader.readAsDataURL(file);
      });
    },
    [compressImages, maxImageWidth, maxImageHeight, imageQuality]
  );

  /**
   * Upload file with validation and compression
   */
  const upload = useCallback(
    async (file: File): Promise<FileUploadResult | null> => {
      // Validate file size
      if (file.size > maxSize) {
        const errorMsg = `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit. Selected file: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        toast.error(errorMsg);
        setError(new Error(errorMsg));
        return null;
      }

      setUploading(true);
      setError(null);

      try {
        // Compress image if enabled and file is an image
        const fileToUpload = await compressImage(file);

        const formData = new FormData();
        formData.append("file", fileToUpload);

        const result = await apiClient.upload<FileUploadResult>("/upload", formData, {
          showErrorToast: true,
        });

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to upload file");
        setError(error);
        console.error("Error uploading file:", err);
        // Log more details for debugging
        if (err instanceof Error) {
          console.error("Error details:", {
            message: err.message,
            stack: err.stack,
            name: err.name,
          });
        }
        return null;
      } finally {
        setUploading(false);
      }
    },
    [maxSize, compressImage]
  );

  const reset = useCallback(() => {
    setError(null);
    setUploading(false);
  }, []);

  return {
    upload,
    uploading,
    error,
    reset,
  };
}

