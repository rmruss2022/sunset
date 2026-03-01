import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import type { History, Update } from "history";
import { Router } from "react-router";

interface HistoryRouterProps {
  history: History;
  basename?: string;
  children?: ReactNode;
}

export function HistoryRouter({ history, basename, children }: HistoryRouterProps) {
  const [state, setState] = useState({
    action: history.action,
    location: history.location,
  });

  useLayoutEffect(() => {
    const unlisten = history.listen(handleUpdate);
    return unlisten;
  }, [history]);

  function handleUpdate(update: Update) {
    setState({
      action: update.action,
      location: update.location,
    });
  }

  return (
    <Router
      basename={basename}
      location={state.location}
      navigationType={state.action}
      navigator={history}
    >
      {children}
    </Router>
  );
}
