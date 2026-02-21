"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";

function PasswordInput({
  id,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/create");
    }
  }, [authLoading, user, router]);

  if (authLoading || user) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <GlassCard className="w-full max-w-md p-6">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-xl font-semibold">AI Greeting Card Maker</h1>
        <p className="text-sm text-muted-foreground">Sign in to create and save your cards</p>
      </div>

      <Tabs defaultValue="signin">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <SignInForm />
        </TabsContent>
        <TabsContent value="signup">
          <SignUpForm />
        </TabsContent>
      </Tabs>
    </GlassCard>
  );
}

function SignInForm() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setError(null);
    setResetting(true);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
    } else {
      setResetSent(true);
    }
    setResetting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetting}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {resetting ? "Sending..." : "Forgot password?"}
          </button>
        </div>
        <PasswordInput
          id="signin-password"
          placeholder="Your password"
          value={password}
          onChange={setPassword}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {resetSent && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Password reset link sent! Check your email.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Sign In
      </Button>
    </form>
  );
}

function SignUpForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    const { error } = await signUp(email, password);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="mt-4 space-y-3 text-center">
        <p className="text-sm font-medium text-green-600 dark:text-green-400">Account created!</p>
        <p className="text-sm text-muted-foreground">
          Check your email for a confirmation link, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <PasswordInput
          id="signup-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={setPassword}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm Password</Label>
        <PasswordInput
          id="signup-confirm"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Create Account
      </Button>
    </form>
  );
}
