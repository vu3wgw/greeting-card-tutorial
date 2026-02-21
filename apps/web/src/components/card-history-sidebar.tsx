"use client";

import { useEffect, useState } from "react";
import { Download, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCardHistory, type CardRecord } from "@/lib/save-card";

interface CardHistorySidebarProps {
  /** Increment this to trigger a refetch after saving a new card */
  refreshKey?: number;
}

export function CardHistorySidebar({ refreshKey = 0 }: CardHistorySidebarProps) {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCardHistory()
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

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
    <aside className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="size-4" />
        Your Cards
      </h3>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">No saved cards yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/50"
            >
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt={card.message || "Greeting card"}
                  className="aspect-[3/4] w-full object-cover"
                />
              )}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex w-full items-center justify-between p-1.5">
                  <span className="truncate text-[10px] text-white/80">
                    {card.message || new Date(card.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => handleDownload(card)}
                  >
                    <Download className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
