"use client";

import { useReducer, useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Upload,
  ImageIcon,
  X,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Download,
  RefreshCw,
  Plus,
  Save,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { CARD_STYLES, DEFAULT_STYLE, type CardStyle } from "@/lib/card-styles";
import { getCroppedImageBlob, fileToBase64, compositeCardImage } from "@/lib/crop-utils";
import { saveCard } from "@/lib/save-card";

/* ───────────── types & state ───────────── */

type Phase = "empty" | "uploaded" | "cropped" | "generating" | "done";

interface State {
  phase: Phase;
  originalImage: string | null;
  originalBase64: string | null;
  croppedImage: string | null;
  message: string;
  style: CardStyle;
  generatedUrl: string | null;
  compositedBlob: Blob | null;
  _blobUrls: string[];
}

type Action =
  | { type: "UPLOAD"; previewUrl: string; base64: string }
  | { type: "CROP"; base64: string }
  | { type: "START_GENERATE" }
  | { type: "GENERATED"; url: string; blob: Blob }
  | { type: "GENERATE_FAILED" }
  | { type: "SET_MESSAGE"; message: string }
  | { type: "SET_STYLE"; style: CardStyle }
  | { type: "BACK_TO_CROP" }
  | { type: "BACK_TO_CROPPED" }
  | { type: "RESET" };

const initial: State = {
  phase: "empty",
  originalImage: null,
  originalBase64: null,
  croppedImage: null,
  message: "",
  style: DEFAULT_STYLE,
  generatedUrl: null,
  compositedBlob: null,
  _blobUrls: [],
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "UPLOAD":
      return { ...s, phase: "uploaded", originalImage: a.previewUrl, originalBase64: a.base64, _blobUrls: [...s._blobUrls, a.previewUrl] };
    case "CROP":
      return { ...s, phase: "cropped", croppedImage: a.base64 };
    case "START_GENERATE":
      return { ...s, phase: "generating" };
    case "GENERATED":
      return { ...s, phase: "done", generatedUrl: a.url, compositedBlob: a.blob, _blobUrls: [...s._blobUrls, a.url] };
    case "GENERATE_FAILED":
      return { ...s, phase: "cropped" };
    case "SET_MESSAGE":
      return { ...s, message: a.message };
    case "SET_STYLE":
      return { ...s, style: a.style };
    case "BACK_TO_CROP":
      return { ...s, phase: "uploaded", croppedImage: null };
    case "BACK_TO_CROPPED": {
      if (s.generatedUrl) URL.revokeObjectURL(s.generatedUrl);
      return { ...s, phase: "cropped", generatedUrl: null, compositedBlob: null, _blobUrls: s._blobUrls.filter((u) => u !== s.generatedUrl) };
    }
    case "RESET": {
      s._blobUrls.forEach((u) => URL.revokeObjectURL(u));
      return initial;
    }
    default:
      return s;
  }
}

/* ───────────── constants ───────────── */

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;
const ASPECT_PRESETS = [
  { label: "3:4", value: 3 / 4 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
] as const;
const STAGES = [
  "Preparing your photo\u2026",
  "Creating your greeting card with AI\u2026",
  "Adding finishing touches\u2026",
];

/* ───────────── page ───────────── */

export default function CreatePage() {
  const [state, dispatch] = useReducer(reducer, initial);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="flex flex-col gap-5">
        <ImageArea state={state} dispatch={dispatch} />
        {state.phase === "cropped" && (
          <ControlsPanel state={state} dispatch={dispatch} />
        )}
      </div>
    </div>
  );
}

/* ───────────── Image Area ───────────── */

function ImageArea({
  state,
  dispatch,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
}) {
  switch (state.phase) {
    case "empty":
      return <UploadZone dispatch={dispatch} />;
    case "uploaded":
      return (
        <CropArea
          imageUrl={state.originalImage!}
          originalBase64={state.originalBase64!}
          dispatch={dispatch}
        />
      );
    case "cropped":
      return <CroppedPreview croppedImage={state.croppedImage!} dispatch={dispatch} />;
    case "generating":
      return (
        <GeneratingOverlay
          croppedImage={state.croppedImage!}
          message={state.message}
          style={state.style}
          dispatch={dispatch}
        />
      );
    case "done":
      return <DonePreview state={state} dispatch={dispatch} />;
  }
}

/* ───── Upload ───── */

function UploadZone({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File size must be under 10 MB.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const url = URL.createObjectURL(file);
      const b64 = await fileToBase64(file);
      dispatch({ type: "UPLOAD", previewUrl: url, base64: b64 });
    } catch {
      setError("Failed to read file.");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  return (
    <GlassCard className="p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-16 transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
        }`}
      >
        <Upload className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {loading ? "Reading file\u2026" : <>Drag & drop your image here, or <span className="font-medium text-primary">browse</span></>}
        </p>
        <p className="text-xs text-muted-foreground/70">JPG, PNG, or WebP — max 10 MB</p>
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
    </GlassCard>
  );
}

/* ───── Crop ───── */

function CropArea({
  imageUrl,
  originalBase64,
  dispatch,
}: {
  imageUrl: string;
  originalBase64: string;
  dispatch: React.Dispatch<Action>;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(3 / 4);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleContinue = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const { base64 } = await getCroppedImageBlob(imageUrl, croppedAreaPixels);
      dispatch({ type: "CROP", base64 });
    } catch (err) {
      console.error("Crop failed, using original:", err);
      dispatch({ type: "CROP", base64: originalBase64 });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="relative mb-4 h-80 w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Zoom</label>
          <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Aspect:</span>
          {ASPECT_PRESETS.map((p) => (
            <Button key={p.label} size="xs" variant={aspect === p.value ? "default" : "outline"} onClick={() => setAspect(p.value)}>
              {p.label}
            </Button>
          ))}
          <Button size="xs" variant="ghost" onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); setAspect(3 / 4); }}>
            <RotateCcw className="size-3" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => dispatch({ type: "RESET" })}>
          Change Photo
        </Button>
        <Button onClick={handleContinue} disabled={processing}>
          {processing ? "Processing\u2026" : "Crop & Continue"}
        </Button>
      </div>
    </GlassCard>
  );
}

/* ───── Cropped preview (thumbnail) ───── */

function CroppedPreview({
  croppedImage,
  dispatch,
}: {
  croppedImage: string;
  dispatch: React.Dispatch<Action>;
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <img src={croppedImage} alt="Cropped" className="h-40 rounded-lg object-contain" />
          <button
            onClick={() => dispatch({ type: "BACK_TO_CROP" })}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow-md hover:bg-destructive/80"
            title="Re-crop"
          >
            <X className="size-3" />
          </button>
        </div>
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <ImageIcon className="size-4 text-muted-foreground" />
            Photo ready
          </div>
          <p className="text-xs text-muted-foreground">Configure your card below, then generate.</p>
        </div>
      </div>
    </GlassCard>
  );
}

/* ───── Controls panel (message + style + generate) ───── */

function ControlsPanel({
  state,
  dispatch,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
}) {
  return (
    <GlassCard className="space-y-5 p-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Message</label>
        <textarea
          value={state.message}
          onChange={(e) => dispatch({ type: "SET_MESSAGE", message: e.target.value })}
          maxLength={200}
          rows={2}
          placeholder="Happy Birthday! Wishing you a wonderful day..."
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{state.message.length}/200</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Style</label>
        <div className="flex flex-wrap gap-3">
          {CARD_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => dispatch({ type: "SET_STYLE", style: s })}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                state.style.id === s.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span
                className="inline-block size-4 rounded-full"
                style={{ background: s.previewGradient }}
              />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={() => dispatch({ type: "START_GENERATE" })}
      >
        <Sparkles className="size-4" />
        Generate Card
      </Button>
    </GlassCard>
  );
}

/* ───── Generating overlay ───── */

function GeneratingOverlay({
  croppedImage,
  message,
  style,
  dispatch,
}: {
  croppedImage: string;
  message: string;
  style: CardStyle;
  dispatch: React.Dispatch<Action>;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 3000);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, stylePrompt: style.framePrompt, croppedImage }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `Generation failed (${res.status})`);
        }
        const data = await res.json();
        if (!data.cardImageBase64) throw new Error("No card image returned");

        setStageIndex(2);
        const { blob, url } = await compositeCardImage(data.cardImageBase64, message, style.textColor);
        clearInterval(interval);
        dispatch({ type: "GENERATED", url, blob });
      } catch (err: unknown) {
        clearInterval(interval);
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    })();

    return () => {
      clearInterval(interval);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <GlassCard className="p-6 text-center">
        <AlertCircle className="mx-auto mb-3 size-10 text-destructive" />
        <h2 className="mb-2 text-lg font-semibold">Generation Failed</h2>
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => dispatch({ type: "GENERATE_FAILED" })}>
            Go Back
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="relative overflow-hidden p-6">
      <div className="relative mx-auto max-w-xs">
        <img src={croppedImage} alt="Your photo" className="w-full rounded-lg opacity-40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Sparkles className="size-10 animate-pulse text-primary" />
          <p className="text-sm font-medium">{STAGES[stageIndex]}</p>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
            <div className="animate-shimmer h-full w-full rounded-full" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* ───── Done preview ───── */

function DonePreview({
  state,
  dispatch,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleDownload = async () => {
    try {
      let blob: Blob;
      if (state.compositedBlob) {
        blob = state.compositedBlob;
      } else {
        const res = await fetch(state.generatedUrl!);
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      a.href = url;
      a.download = `greeting-card-${ts}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(state.generatedUrl!, "_blank");
    }
  };

  const handleSave = async () => {
    if (!state.compositedBlob || saving || saved) return;
    setSaving(true);
    try {
      await saveCard(state.compositedBlob, state.message);
      setSaved(true);
      toast.success("Card saved to history!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="overflow-hidden p-4">
        <img
          src={state.generatedUrl!}
          alt="Generated greeting card"
          className="mx-auto max-h-[50vh] rounded-lg object-contain"
        />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={handleDownload} className="w-full">
              <Download className="size-4" /> Download
            </Button>
            <Button
              size="lg"
              variant={saved ? "outline" : "default"}
              onClick={handleSave}
              disabled={!state.compositedBlob || saving || saved}
              className="w-full"
            >
              {saved ? <Check className="size-4" /> : <Save className="size-4" />}
              {saving ? "Saving\u2026" : saved ? "Saved" : "Save"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: "START_GENERATE" })}>
              <RefreshCw className="size-3" /> Regenerate
            </Button>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: "BACK_TO_CROPPED" })}>
              <RotateCcw className="size-3" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: "RESET" })}>
              <Plus className="size-3" /> New
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
