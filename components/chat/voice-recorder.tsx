// ================================
// Voice Recorder Component
// ================================
// Records audio using browser MediaRecorder API
// Now uses centralized permissions system

"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMicrophone } from "@/lib/permissions";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // Max duration in seconds (default: 120)
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 120,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use centralized microphone permissions hook
  const { 
    isGranted: hasPermission, 
    request: requestPermission, 
    isRequesting,
    supported,
  } = useMicrophone({
    onGranted: () => {
      // Permission granted - no need to show toast, user will see recording start
    },
    onDenied: () => {
      toast.error("Microphone permission denied. Please allow microphone access to record voice messages.");
    },
    onError: (error) => {
      console.error("Microphone permission error:", error);
      toast.error("Failed to access microphone. Please try again.");
    },
  });

  const startRecording = async () => {
    // Check if microphone is supported
    if (!supported) {
      toast.error("Microphone access is not supported in this browser. Please use a modern browser.");
      return;
    }

    // Request permission if not granted
    if (!hasPermission) {
      await requestPermission();
      // Check again after request
      if (!hasPermission) {
        return; // Permission was denied
      }
    }

    try {
      // Request microphone access
      // The permissions system already handled the permission request
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm"; // Fallback

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);

        // Create blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        // Callback with audio blob
        onRecordingComplete(audioBlob, duration);
        setIsProcessing(false);
        setIsRecording(false);
        setDuration(0);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          toast.error("Microphone permission denied. Please allow microphone access to record voice messages.");
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          toast.error("No microphone found. Please connect a microphone and try again.");
        } else {
          toast.error("Failed to access microphone. Please try again.");
        }
      } else {
        toast.error("Failed to access microphone. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setIsRecording(false);
    setDuration(0);
    audioChunksRef.current = [];
    onCancel?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  if (isProcessing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
        <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        <p className="text-sm text-surface-700 dark:text-surface-300">
          Processing audio...
        </p>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            Recording {formatDuration(duration)}
          </span>
        </div>
        <button
          onClick={stopRecording}
          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
          title="Stop and send"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={cancelRecording}
          className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 flex items-center justify-center transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={isRequesting}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
        "hover:scale-110 active:scale-95",
        "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25",
        isRequesting && "opacity-50 cursor-not-allowed"
      )}
      title={
        isRequesting
          ? "Requesting permission..."
          : !hasPermission
          ? "Click to request microphone permission"
          : "Record voice message"
      }
    >
      {isRequesting ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}

