export const PROFILE_BANNERS = [
  { id: "banner-01", label: "Coastal twilight", src: "/banners/banner-01.webp" },
  { id: "banner-02", label: "Spring river", src: "/banners/banner-02.webp" },
  { id: "banner-03", label: "Neon rain", src: "/banners/banner-03.webp" },
  { id: "banner-04", label: "Sky ruins", src: "/banners/banner-04.webp" },
  { id: "banner-05", label: "Rainy study", src: "/banners/banner-05.webp" }
] as const;

export function profileBanner(bannerId: string) {
  return PROFILE_BANNERS.find((banner) => banner.id === bannerId) ??
    PROFILE_BANNERS[0];
}

export function profileBannerSrc(profile: {
  bannerId: string;
  bannerUrl?: string;
  bannerDataUrl?: string;
}) {
  return profile.bannerUrl ||
    profile.bannerDataUrl ||
    profileBanner(profile.bannerId).src;
}
