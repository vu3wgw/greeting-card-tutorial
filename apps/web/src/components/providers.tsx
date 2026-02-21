"use client";

import { ThemeProvider } from "./theme-provider";
import { TooltipProvider } from "./ui/tooltip";
import { Toaster } from "./ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster richColors />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
