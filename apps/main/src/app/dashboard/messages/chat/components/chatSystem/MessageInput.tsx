"use client";
import { useState, useRef } from "react";
import {
  Send,
  Mic,
  Square,
  Trash2,
  Paperclip,
  Image,
  FileText,
  Film,
} from "lucide-react";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { notify } from "../../utils/toast";

interface Props {
  onSend: (content: string) => void;
  onSendVoice: (blob: Blob) => void;
  onSendFile: (file: File, type: "image" | "video" | "file") => void;
  placeholder: string;
}

export default function MessageInput({
  onSend,
  onSendVoice,
  onSendFile,
  placeholder,
}: Props) {
  const [input, setInput] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileAccept, setFileAccept] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, duration, startRecording, stopRecording } =
    useVoiceRecorder();

  const triggerPicker = (type: "image" | "video" | "doc") => {
    if (!fileInputRef.current) return;
    const types = {
      image: ".png, .jpg, .jpeg",
      video: ".mp4",
      doc: ".pdf, .docx, .txt",
    };
    setFileAccept(types[type]);
    setTimeout(() => {
      fileInputRef.current?.click();
      setShowAttachMenu(false);
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();

    if (/\.(jpe?g|png)$/i.test(fileName)) onSendFile(file, "image");
    else if (/\.(mp4)$/i.test(fileName)) onSendFile(file, "video");
    else if (/\.(pdf|docx|txt)$/i.test(fileName)) onSendFile(file, "file");
    else notify.error("Format not allowed");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAction = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      if (duration < 1) {
        await stopRecording();
        notify.error("Message too short");
        return;
      }
      const blob = await stopRecording();
      if (blob) onSendVoice(blob);
    } else {
      await startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className=" border-[rgb(var(--app-border))] bg-[rgb(var(--app-bg))] flex gap-2 items-center relative transition-colors duration-300">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={fileAccept}
      />

      {/* Discard Recording Button */}
      {isRecording && (
        <button
          onClick={() => {
            stopRecording();
            notify.error("Recording discarded");
          }}
          className="text-red-500 p-2 hover:bg-red-500/10 rounded-full transition-colors"
        >
          <Trash2 size={22} />
        </button>
      )}

      {/* Attachment Button & Menu */}
      {!isRecording && (
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`p-2 rounded-full transition-all ${showAttachMenu ? "bg-[rgb(var(--app-accent))]/10 text-[rgb(var(--app-accent))]" : "text-[rgb(var(--app-text))]/60 hover:text-[rgb(var(--app-accent))]"}`}
          >
            <Paperclip
              size={22}
              className={showAttachMenu ? "rotate-45" : ""}
            />
          </button>

          {showAttachMenu && (
            <div className="absolute bottom-14 left-0 bg-[rgb(var(--app-surface))] border border-[rgb(var(--app-border))] rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-40 animate-in slide-in-from-bottom-2 z-50">
              <AttachOption
                icon={<Image size={18} className="text-blue-500" />}
                label="Images"
                onClick={() => triggerPicker("image")}
              />
              <AttachOption
                icon={<Film size={18} className="text-purple-500" />}
                label="Video"
                onClick={() => triggerPicker("video")}
              />
              <AttachOption
                icon={<FileText size={18} className="text-orange-500" />}
                label="Documents"
                onClick={() => triggerPicker("doc")}
              />
            </div>
          )}
        </div>
      )}

      {/* Input Field / Recording Indicator */}
      <div className="flex-1 relative flex items-center">
        {isRecording ? (
          <div className="flex-1 flex items-center gap-4 bg-red-500/10 rounded-full px-4 py-2.5 border border-red-500/20">
            <span className="text-sm font-mono text-red-500 animate-pulse flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              {formatTime(duration)}
            </span>
            <div className="flex-1 text-[rgb(var(--app-text))]/40 text-xs font-medium tracking-wide">
              Recording Audio...
            </div>
          </div>
        ) : (
          <input
            className="w-full bg-[rgb(var(--app-text))]/5 border border-[rgb(var(--app-border))] rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-[rgb(var(--app-accent))] text-[rgb(var(--app-text))] placeholder:text-[rgb(var(--app-text))]/30 transition-all"
            placeholder={placeholder}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (showAttachMenu) setShowAttachMenu(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAction()}
          />
        )}
      </div>

      {/* Action Button (Send / Record) */}
      <button
        onClick={input.trim() ? handleAction : handleVoiceToggle}
        className={`p-3 rounded-full transition-all active:scale-90 shadow-md ${
          isRecording
            ? "bg-red-500 text-white animate-pulse"
            : "bg-[rgb(var(--app-accent))] text-white hover:opacity-90"
        }`}
      >
        {input.trim() ? (
          <Send size={20} />
        ) : isRecording ? (
          <Square size={20} fill="currentColor" />
        ) : (
          <Mic size={20} />
        )}
      </button>
    </div>
  );
}

function AttachOption({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-[rgb(var(--app-text))]/5 rounded-xl text-sm text-[rgb(var(--app-text))] transition-colors"
    >
      {icon} <span className="font-medium">{label}</span>
    </button>
  );
}
