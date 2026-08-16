import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/account";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Aurelia Fine Jewellery" },
      { name: "description", content: "Sign in to track your Aurelia order requests and saved details." },
      { property: "og:title", content: "Sign in — Aurelia Fine Jewellery" },
      { property: "og:description", content: "Track your Aurelia order requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("confirm")
            ? "Please confirm your email first — check your inbox."
            : "Incorrect email or password.",
        );
        return;
      }
      await ensureProfile();
      await queryClient.invalidateQueries();
      toast.success("Welcome back");
      void navigate({ to: "/my-orders", replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6 lg:py-24">
        <p className="eyebrow text-center">Account</p>
        <h1 className="mt-3 text-center font-display text-4xl font-normal text-foreground">Sign in</h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          View your order requests and their current status.
        </p>
        <div className="gold-rule mx-auto mt-8 w-24" />

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          New to Aurelia?{" "}
          <Link to="/signup" className="text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </section>
    </SiteLayout>
  );
}
