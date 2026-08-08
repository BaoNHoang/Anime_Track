import { useContext } from "react";
import { AuthPromptContext } from "./authPromptContext";

export function useAuthPrompt() {
  const context = useContext(AuthPromptContext);
  if (!context) {
    throw new Error("useAuthPrompt must be used inside AuthPromptProvider");
  }
  return context;
}
