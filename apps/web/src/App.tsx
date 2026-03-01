import { Navigate, Route, Routes } from "react-router";

import { RootLayout } from "./components/RootLayout";
import { AdminRoute } from "./routes/Admin";
import { AuctionRoute } from "./routes/Auction";
import { AuctionDetailRoute } from "./routes/AuctionDetail";
import { AssignmentRoute } from "./routes/Assignment";
import { CreateListingRoute } from "./routes/CreateListing";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<AuctionRoute />} />
        <Route path="/auction" element={<AuctionRoute />} />
        <Route path="/auction/new" element={<CreateListingRoute />} />
        <Route path="/auction/:id" element={<AuctionDetailRoute />} />
        <Route path="/vendors" element={<Navigate to="/auction" replace />} />
        <Route path="/assignment" element={<AssignmentRoute />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
