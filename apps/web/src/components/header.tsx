"use client";

import { Sparkles } from "lucide-react";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">AI Greeting Card Maker</span>
        </div>
        <ModeToggle />
      </div>
      <hr />
    </div>
  );
}
