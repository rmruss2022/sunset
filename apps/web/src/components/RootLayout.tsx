import { Outlet, useLocation, useNavigate } from "react-router";
import { UserPicker } from "./UserPicker";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAssignmentPage = location.pathname === "/assignment";

  return (
    <div className="min-h-screen bg-ah-bg text-ah-text">
      <header className="relative">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-3 focus:outline-none"
          >
            <span className="text-ah-gold text-xs leading-none select-none animate-gold-pulse">◆</span>
            <span
              className="font-display text-xl tracking-[0.18em] uppercase text-ah-text
                         group-hover:text-ah-gold transition-colors duration-300"
            >
              Auction House
            </span>
          </button>

          {/* Nav right */}
          <div className="flex items-center gap-3">
            <UserPicker />

            <button
              onClick={() => navigate("/auction/new")}
              className="h-8 px-4 text-xs tracking-widest uppercase font-medium
                         border border-ah-border-gold text-ah-gold
                         hover:bg-ah-gold hover:text-ah-bg
                         transition-all duration-200"
            >
              + Sell
            </button>

            <button
              onClick={() => navigate(isAssignmentPage ? "/" : "/assignment")}
              className="h-8 px-3 text-xs tracking-widest uppercase font-medium
                         text-ah-text-3 hover:text-ah-text-2 transition-colors duration-200"
            >
              {isAssignmentPage ? "← App" : "Brief"}
            </button>
          </div>
        </div>

        {/* Decorative gold line */}
        <div className="h-px bg-gradient-to-r from-transparent via-ah-border-gold to-transparent" />
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
