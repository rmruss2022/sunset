import { createContext, useContext, useState, ReactNode } from 'react';

interface UserContextValue {
  userId: string | null;
  setUserId: (id: string) => void;
}

const UserContext = createContext<UserContextValue>({ userId: null, setUserId: () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  return <UserContext.Provider value={{ userId, setUserId }}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(UserContext);
}
