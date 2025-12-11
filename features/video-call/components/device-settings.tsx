// ================================
// Device Settings Component
// ================================
// Audio/Video device selection for calls
// Uses existing permissions system from lib/permissions

"use client";

import { useState, useEffect } from "react";
import { Mic, Video, Speaker } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCamera, useMicrophone } from "@/lib/permissions";

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface DeviceSettingsProps {
  onAudioInputChange?: (deviceId: string) => void;
  onVideoInputChange?: (deviceId: string) => void;
  onAudioOutputChange?: (deviceId: string) => void;
}

export function DeviceSettings({
  onAudioInputChange,
  onVideoInputChange,
  onAudioOutputChange,
}: DeviceSettingsProps) {
  const [audioInputDevices, setAudioInputDevices] = useState<DeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<DeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceInfo[]>([]);
  
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");

  // Use existing permission hooks
  const { isGranted: hasMicPermission, request: requestMic } = useMicrophone();
  const { isGranted: hasCameraPermission, request: requestCamera } = useCamera();

  // Load available devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permissions using existing hooks
        if (!hasMicPermission) await requestMic();
        if (!hasCameraPermission) await requestCamera();
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const audioInputsFiltered = devices.filter((d) => d.kind === "audioinput");
        const audioInputs: DeviceInfo[] = audioInputsFiltered.map((d, index) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${index + 1}`,
            kind: d.kind,
          }));
        
        const videoInputsFiltered = devices.filter((d) => d.kind === "videoinput");
        const videoInputs: DeviceInfo[] = videoInputsFiltered.map((d, index) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${index + 1}`,
            kind: d.kind,
          }));
        
        const audioOutputsFiltered = devices.filter((d) => d.kind === "audiooutput");
        const audioOutputs: DeviceInfo[] = audioOutputsFiltered.map((d, index) => ({
            deviceId: d.deviceId,
            label: d.label || `Speaker ${index + 1}`,
            kind: d.kind,
          }));
        
        setAudioInputDevices(audioInputs);
        setVideoInputDevices(videoInputs);
        setAudioOutputDevices(audioOutputs);
        
        // Set defaults
        if (audioInputs.length > 0 && !selectedAudioInput) {
          setSelectedAudioInput(audioInputs[0].deviceId);
        }
        if (videoInputs.length > 0 && !selectedVideoInput) {
          setSelectedVideoInput(videoInputs[0].deviceId);
        }
        if (audioOutputs.length > 0 && !selectedAudioOutput) {
          setSelectedAudioOutput(audioOutputs[0].deviceId);
        }
      } catch (error) {
        console.error("Error loading devices:", error);
      }
    };

    loadDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener("devicechange", loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
    };
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput, hasMicPermission, hasCameraPermission, requestMic, requestCamera]);

  const handleAudioInputChange = (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    onAudioInputChange?.(deviceId);
  };

  const handleVideoInputChange = (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    onVideoInputChange?.(deviceId);
  };

  const handleAudioOutputChange = (deviceId: string) => {
    setSelectedAudioOutput(deviceId);
    onAudioOutputChange?.(deviceId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Settings</CardTitle>
        <CardDescription>
          Choose your preferred audio and video devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Microphone Selection */}
        <div className="space-y-2">
          <Label htmlFor="audio-input" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Microphone
          </Label>
          <Select value={selectedAudioInput} onValueChange={handleAudioInputChange}>
            <SelectTrigger id="audio-input">
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioInputDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Camera Selection */}
        <div className="space-y-2">
          <Label htmlFor="video-input" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Camera
          </Label>
          <Select value={selectedVideoInput} onValueChange={handleVideoInputChange}>
            <SelectTrigger id="video-input">
              <SelectValue placeholder="Select camera" />
            </SelectTrigger>
            <SelectContent>
              {videoInputDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Speaker Selection */}
        <div className="space-y-2">
          <Label htmlFor="audio-output" className="flex items-center gap-2">
            <Speaker className="w-4 h-4" />
            Speaker
          </Label>
          <Select value={selectedAudioOutput} onValueChange={handleAudioOutputChange}>
            <SelectTrigger id="audio-output">
              <SelectValue placeholder="Select speaker" />
            </SelectTrigger>
            <SelectContent>
              {audioOutputDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

