import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserHistory } from "history";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import { HistoryRouter } from "./lib/history-router";
import { trpc, trpcClient } from "./lib/trpc";
import { UserProvider } from "./lib/userContext";
import { ToastProvider } from "./lib/toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const history = createBrowserHistory();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ToastProvider>
            <HistoryRouter history={history}>
              <App />
            </HistoryRouter>
          </ToastProvider>
        </UserProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
);
