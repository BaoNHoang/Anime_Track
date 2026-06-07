import { useContext } from "react";
import { CloudAuthContext } from "../context/cloudAuthContext";

export function useCloudAuth() {
  const context = useContext(CloudAuthContext);
  if (!context) {
    throw new Error("useCloudAuth must be used inside CloudAuthProvider");
  }
  return context;
}
