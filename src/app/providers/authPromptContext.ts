import { createContext } from "react";

export interface AuthPromptContextValue {
  requestSignIn: (reason?: string) => void;
}

export const AuthPromptContext = createContext<
  AuthPromptContextValue | undefined
>(undefined);
