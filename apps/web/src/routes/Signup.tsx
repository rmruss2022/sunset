import { Link } from "react-router";

export function SignupRoute() {
  return (
    <div className="min-h-screen bg-ah-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-ah-border bg-ah-surface">
        {/* Gold gradient rule */}
        <div className="h-px bg-gradient-to-r from-transparent via-ah-gold to-transparent" />

        <div className="p-8 space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.25em] uppercase text-ah-text-3">
              Auction House
            </p>
            <h1 className="font-display text-3xl text-ah-text">Registration</h1>
          </div>

          <p className="text-sm text-ah-text-2 leading-relaxed">
            Registration is by invitation only.
            <br />
            Contact the house to request access.
          </p>

          <Link
            to="/login"
            className="inline-block text-xs tracking-widest uppercase text-ah-text-3 hover:text-ah-text-2 transition-colors"
          >
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
