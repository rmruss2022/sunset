import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { trpc } from "../lib/trpc";

export function LoginRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["auth", "me"]] });
      navigate("/");
    },
    onError: (err) => {
      setError(err.message || "Invalid credentials");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    login.mutate({ email, password });
  }

  return (
    <div className="min-h-screen bg-ah-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-ah-border bg-ah-surface">
        {/* Gold gradient rule */}
        <div className="h-px bg-gradient-to-r from-transparent via-ah-gold to-transparent" />

        <div className="p-8 space-y-6">
          {/* Eyebrow */}
          <div className="text-center space-y-2">
            <p className="text-[10px] tracking-[0.25em] uppercase text-ah-text-3">
              The Estate Room
            </p>
            <h1 className="font-display text-3xl text-ah-text">Members&rsquo; Login</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-[0.14em] uppercase text-ah-text-3">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] tracking-[0.14em] uppercase text-ah-text-3">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={login.isPending}
              className="w-full tracking-widest uppercase text-xs"
            >
              {login.isPending ? "Signing in…" : "Enter the Room"}
            </Button>

            {error && (
              <Alert variant="destructive">{error}</Alert>
            )}
          </form>

          <p className="text-center text-xs text-ah-text-2">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-ah-gold hover:text-ah-gold-bright transition-colors"
            >
              Sign up &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
