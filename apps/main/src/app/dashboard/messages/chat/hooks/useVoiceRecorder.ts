"use client";
import { useState, useRef } from "react";
import MicRecorder from "mic-recorder-to-mp3";
import { notify } from "../utils/toast";

const recorder = new MicRecorder({ bitRate: 128 });

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null); // Track exact start time

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices) {
        return;
      }

      await recorder.start();
      setIsRecording(true);
      setDuration(0);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - (startTimeRef.current || 0)) / 1000,
        );
        setDuration(elapsed);
      }, 1000);
    } catch (e: any) {
      setIsRecording(false);
      notify.error(`Recording Error ${e}`);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const [, blob] = await recorder.stop().getMp3();

      setIsRecording(false);
      setDuration(0);
      return blob;
    } catch {
      return null;
    }
  };

  return { isRecording, duration, startRecording, stopRecording };
}
