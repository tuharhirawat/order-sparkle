import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/Services/api";
import { isSafeRedirect } from "@/lib/redirect";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Please enter a valid email").max(255),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72, "Password is too long")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    acceptTerms: z.literal(true, { message: "You must accept the terms & conditions" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const safeRedirectTo = isSafeRedirect(redirectTo)
    ? redirectTo
    : undefined;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = signupSchema.safeParse({
      name,
      email,
      mobile,
      password,
      confirmPassword,
      acceptTerms,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }

    setLoading(true);
    try {
      await api.post("/Auth/Signup", {
        fullName: parsed.data.name,
        email: parsed.data.email,
        mobileNumber: parsed.data.mobile,
        password: parsed.data.password,
      });

      setSent(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
        "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
          <MailCheck className="mx-auto size-8 text-gold" />
          <h1 className="mt-6 font-display text-3xl text-foreground">Confirm your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We've sent a confirmation link to <span className="text-foreground">{email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <Button
            className="mt-8"
            onClick={() =>
              void navigate(safeRedirectTo ? `/login?redirectTo=${encodeURIComponent(safeRedirectTo)}` : "/login")
            }
          >
            Go to sign in
          </Button>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6 lg:py-24">
        <p className="eyebrow text-center">Account</p>
        <h1 className="mt-3 text-center font-display text-4xl font-normal text-foreground">Create account</h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Save your details and follow every order request you place.
        </p>
        <div className="gold-rule mx-auto mt-8 w-24" />

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
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
            <Label htmlFor="mobile">Mobile number</Label>
            <Input
              id="mobile"
              inputMode="numeric"
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
            <p className="text-xs text-muted-foreground">
              At least 6 characters, with one uppercase letter and one number.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(v) => setAcceptTerms(v === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="terms"
              className="text-sm font-normal leading-relaxed text-muted-foreground"
            >
              I accept the terms &amp; conditions and understand that orders are confirmed over
              WhatsApp.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to={safeRedirectTo ? `/login?redirectTo=${encodeURIComponent(safeRedirectTo)}` : "/login"}
            className="text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </section>
    </SiteLayout>
  );
}
