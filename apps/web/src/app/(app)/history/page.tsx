"use client";

import { useEffect, useState } from "react";
import { Download, Images, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/glass-card";
import { fetchCardHistory, type CardRecord } from "@/lib/save-card";

export default function HistoryPage() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<CardRecord | null>(null);

  useEffect(() => {
    fetchCardHistory()
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (card: CardRecord) => {
    const url = card.image_url;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `greeting-card-${card.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Images className="size-5" />
        Previous Generations
      </h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <ImageIcon className="size-12" />
          <p className="text-sm">No saved cards yet.</p>
          <p className="text-xs">Create your first card and save it to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => setPreview(card)}
              className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/50 text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt={card.message || "Greeting card"}
                  className="aspect-[3/4] w-full object-cover"
                />
              )}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="p-3">
                  <p className="truncate text-xs font-medium text-white">
                    {card.message || "No message"}
                  </p>
                  <p className="text-[10px] text-white/70">
                    {new Date(card.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Preview overlay */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPreview(null)}
        >
          <GlassCard
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreview(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
              aria-label="Close preview"
            >
              <X className="size-4" />
            </button>

            {/* Card image */}
            {preview.image_url && (
              <div className="overflow-y-auto">
                <img
                  src={preview.image_url}
                  alt={preview.message || "Greeting card"}
                  className="w-full object-contain"
                />
              </div>
            )}

            {/* Info + download */}
            <div className="flex items-center gap-3 border-t p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {preview.message || "No message"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(preview.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Button onClick={() => handleDownload(preview)}>
                <Download className="size-4" />
                Download
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
