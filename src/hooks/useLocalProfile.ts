import { useSyncExternalStore } from "react";
import { localProfileRepository } from "../services/storage/localProfileRepository";

export function useLocalProfile() {
  const profile = useSyncExternalStore(
    localProfileRepository.subscribe,
    localProfileRepository.get,
    localProfileRepository.get
  );
  return { profile, updateProfile: localProfileRepository.update };
}
