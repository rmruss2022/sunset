import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "./trpc";

export interface AuthUser {
  userId: string;
  displayName: string;
  isAdmin: boolean;
}

interface UserContextValue {
  user: AuthUser | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue>({ user: null, isLoading: true });

export function UserProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const user = data ?? null;
  return <UserContext.Provider value={{ user, isLoading }}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(UserContext);
}
