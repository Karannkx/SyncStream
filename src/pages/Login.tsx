import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/authStore";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "wouter";
import { Loader2, Clapperboard } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { setUser } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Fill in all fields"); return; }

    try {
      setIsLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setUser({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName });
      setLocation("/dashboard");
    } catch (error: any) {
      toast.error("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-6 py-5 border-b border-border/30">
        <Link href="/" className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity">
          <Clapperboard className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="font-display text-2xl tracking-wider">SYNCSTREAM</span>
        </Link>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <p className="text-xs tracking-[0.3em] uppercase text-primary mb-3 font-medium">Admin</p>
            <h1 className="font-display text-5xl leading-none">SIGN IN</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="bg-secondary/30 border-border/40 focus:border-primary/60 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary/30 border-border/40 focus:border-primary/60 h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 font-medium tracking-wide" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <p className="mt-8 text-xs text-muted-foreground/40 text-center">
            Don't have an account? Create one in Firebase Console.
          </p>
        </div>
      </div>
    </div>
  );
}
