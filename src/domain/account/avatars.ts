const ORIGINAL_PROFILE_AVATARS = [
  { id: "male-01", label: "Coral night", src: "/avatars/male-01.webp" },
  { id: "male-02", label: "Silver sky", src: "/avatars/male-02.webp" },
  { id: "male-03", label: "Golden auburn", src: "/avatars/male-03.webp" },
  { id: "male-04", label: "Mint shadow", src: "/avatars/male-04.webp" },
  { id: "male-05", label: "Lavender scholar", src: "/avatars/male-05.webp" },
  { id: "female-01", label: "Coral noir", src: "/avatars/female-01.webp" },
  { id: "female-02", label: "Silver horizon", src: "/avatars/female-02.webp" },
  { id: "female-03", label: "Golden curls", src: "/avatars/female-03.webp" },
  { id: "female-04", label: "Mint midnight", src: "/avatars/female-04.webp" },
  { id: "female-05", label: "Lavender braid", src: "/avatars/female-05.webp" }
] as const;

const ATTACK_ON_TITAN_AVATARS = [
  { id: "aot-eren", label: "Eren Yeager", src: "/avatars/aot/eren.webp" },
  { id: "aot-mikasa", label: "Mikasa Ackerman", src: "/avatars/aot/mikasa.webp" },
  { id: "aot-levi", label: "Levi Ackerman", src: "/avatars/aot/levi.webp" },
  { id: "aot-armin", label: "Armin Arlert", src: "/avatars/aot/armin.webp" }
] as const;

export const PROFILE_AVATAR_GROUPS = [
  { id: "aot", label: "Attack on Titan", avatars: ATTACK_ON_TITAN_AVATARS },
  { id: "original", label: "Banime originals", avatars: ORIGINAL_PROFILE_AVATARS }
] as const;

export const PROFILE_AVATARS = [
  ...ORIGINAL_PROFILE_AVATARS,
  ...ATTACK_ON_TITAN_AVATARS
] as const;

export type ProfileAvatarId = (typeof PROFILE_AVATARS)[number]["id"];

export function profileAvatar(avatarId: string) {
  return PROFILE_AVATARS.find((avatar) => avatar.id === avatarId) ??
    PROFILE_AVATARS[0];
}

export function profileAvatarSrc(profile: {
  avatarId: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
}) {
  return profile.avatarUrl || profile.avatarDataUrl || profileAvatar(profile.avatarId).src;
}
