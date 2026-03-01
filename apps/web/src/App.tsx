import { Navigate, Route, Routes } from "react-router";

import { RootLayout } from "./components/RootLayout";
import { AdminRoute } from "./routes/Admin";
import { AuctionRoute } from "./routes/Auction";
import { AuctionDetailRoute } from "./routes/AuctionDetail";
import { AssignmentRoute } from "./routes/Assignment";
import { CreateListingRoute } from "./routes/CreateListing";
import { AccountRoute } from "./routes/Account";
import { LoginRoute } from "./routes/Login";
import { SignupRoute } from "./routes/Signup";
import { useCurrentUser } from "./lib/userContext";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  if (isLoading) return null;
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<AuctionRoute />} />
        <Route path="/auction" element={<AuctionRoute />} />
        <Route path="/auction/new" element={<AuthGuard><CreateListingRoute /></AuthGuard>} />
        <Route path="/auction/:id" element={<AuctionDetailRoute />} />
        <Route path="/vendors" element={<Navigate to="/auction" replace />} />
        <Route path="/assignment" element={<AssignmentRoute />} />
        <Route path="/account" element={<AuthGuard><AccountRoute /></AuthGuard>} />
        <Route path="/admin" element={<AdminGuard><AdminRoute /></AdminGuard>} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
