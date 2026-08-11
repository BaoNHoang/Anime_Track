import { PROFILE_AVATARS } from "../../domain/account/avatars";
import {
  emptyProfileFavorites,
  normalizeProfileFavorites,
  type ProfileFavorites
} from "../../domain/account/favorites";

export interface LocalProfile {
  username: string;
  avatarId: string;
  avatarDataUrl?: string;
  bannerId: string;
  bannerDataUrl?: string;
  favorites: ProfileFavorites;
}

const STORAGE_KEY = "banime.local-profile.v1";
const DEFAULT_PROFILE: LocalProfile = {
  username: "Local profile",
  avatarId: PROFILE_AVATARS[0].id,
  bannerId: "banner-01",
  favorites: emptyProfileFavorites()
};

function readProfile(): LocalProfile {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PROFILE;
    const parsed = JSON.parse(stored) as Partial<LocalProfile>;
    const avatarExists = PROFILE_AVATARS.some(
      (avatar) => avatar.id === parsed.avatarId
    );
    return {
      username:
        typeof parsed.username === "string" && parsed.username.trim()
          ? parsed.username.trim().slice(0, 24)
          : DEFAULT_PROFILE.username,
      avatarId: avatarExists ? parsed.avatarId! : DEFAULT_PROFILE.avatarId,
      avatarDataUrl:
        typeof parsed.avatarDataUrl === "string" &&
        parsed.avatarDataUrl.length <= 600_000 &&
        parsed.avatarDataUrl.startsWith("data:image/webp;base64,")
          ? parsed.avatarDataUrl
          : undefined,
      bannerId:
        typeof parsed.bannerId === "string" && /^banner-0[1-5]$/.test(parsed.bannerId)
          ? parsed.bannerId
          : DEFAULT_PROFILE.bannerId,
      bannerDataUrl:
        typeof parsed.bannerDataUrl === "string" &&
        parsed.bannerDataUrl.length <= 1_400_000 &&
        parsed.bannerDataUrl.startsWith("data:image/webp;base64,")
          ? parsed.bannerDataUrl
          : undefined,
      favorites: normalizeProfileFavorites(parsed.favorites)
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

let profile = typeof window === "undefined" ? DEFAULT_PROFILE : readProfile();
const listeners = new Set<() => void>();

export const localProfileRepository = {
  get: () => profile,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  update: (updates: Partial<LocalProfile>) => {
    profile = { ...profile, ...updates };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    listeners.forEach((listener) => listener());
  }
};
