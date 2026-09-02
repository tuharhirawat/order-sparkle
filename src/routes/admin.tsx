import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import api from "@/Services/api";
import dictionary from "@/Constants/dictionary";

const NAV: {
  to: "/admin" | "/admin/orders" | "/admin/products" | "/admin/categories" | "/admin/customers";
  label: string;
  exact?: boolean;
}[] = [
    { to: "/admin", label: "Dashboard", exact: true },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/categories", label: "Categories" },
    { to: "/admin/customers", label: "Customers" },
  ];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { signOut: authSignOut, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user?.userId) return <AdminAuthCard />;
  if (!user.isOwner) return <NoAccessCard anyAdminExists={user.anyAdminExists} />;

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await authSignOut();
    void navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="font-display text-xl tracking-wide">
            {dictionary.siteFirstName} <span className="text-gold">Studio</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-sm px-3 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">{user?.email}</span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="whitespace-nowrap rounded-sm px-3 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

function AdminAuthCard() {
  const queryClient = useQueryClient();
  const { refreshUser, signOut: authSignOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Enter a valid email address");
      return;
    }
    if (mode === "signup" && !/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await api.post("/Auth/Signup", {
          fullName: (email.trim().split("@")[0] || "Studio User").trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          password,
        });
        toast.success("Account created", {
          description: "Sign in with the same email and password to continue.",
        });
        setMode("signin");
      } else {
        await api.post("/Auth/Login", {
          email: email.trim(),
          password,
        });
        await refreshUser();
        await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
        (mode === "signin" ? "Sign in failed" : "Account creation failed"),
        { description: error?.response?.data?.message ?? "Please try again." },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface-panel w-full max-w-md rounded-sm p-10">
        <ShieldCheck className="size-6 text-gold" aria-hidden />
        <p className="eyebrow mt-6">Studio access</p>
        <h1 className="mt-2 font-display text-3xl">
          {mode === "signin" ? "Sign in" : "Create studio account"}
        </h1>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="admin-email" className="text-xs uppercase tracking-[0.16em]">
              Email
            </Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-11 rounded-sm"
              required
            />
          </div>

           {/* mobile number */}
          {mode === "signup" && (
            <div>
              <Label
                htmlFor="admin-mobile"
                className="text-xs uppercase tracking-[0.16em]"
              >
                Mobile number
              </Label>

              <Input
                id="admin-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="mt-2 h-11 rounded-sm"
                placeholder="10-digit mobile number"
                maxLength={10}
                required
              />
            </div>
          )}

          {/* Password */}
          <div>
            <Label htmlFor="admin-password" className="text-xs uppercase tracking-[0.16em]">
              Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 rounded-sm"
              required
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="w-full rounded-sm text-xs uppercase tracking-[0.2em]"
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "First time? Create the studio account"
            : "Already have access? Sign in"}
        </button>
        <Link
          to="/"
          className="mt-6 block text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}

function NoAccessCard({ anyAdminExists }: { anyAdminExists: boolean }) {
  const queryClient = useQueryClient();
  const { signOut: authSignOut, claimFirstOwner } = useAuth();
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setBusy(true);
    try {
      const result = await claimFirstOwner();
      if (result.granted) {
        toast.success("Owner access granted");
        await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      } else {
        toast.error(result.reason ?? "Access denied");
      }
    } catch (error) {
      toast.error("Could not grant access", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await authSignOut();
    await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface-panel w-full max-w-md rounded-sm p-10 text-center">
        <h1 className="font-display text-3xl">Studio access required</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {anyAdminExists
            ? "This account is signed in but has no studio permissions. Ask an existing administrator to grant access."
            : "No owner exists yet. Claim studio ownership for this account to finish setup."}
        </p>
        {!anyAdminExists && (
          <Button
            className="mt-8 w-full rounded-sm text-xs uppercase tracking-[0.2em]"
            disabled={busy}
            onClick={() => void claim()}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Claim owner access
          </Button>
        )}
        <Button variant="ghost" className="mt-4 w-full rounded-sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
