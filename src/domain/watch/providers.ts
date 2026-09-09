export const STREAMING_REGIONS = [
  ["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"],
  ["AU", "Australia"], ["JP", "Japan"], ["DE", "Germany"], ["FR", "France"],
  ["BR", "Brazil"], ["IN", "India"], ["MX", "Mexico"]
] as const;

export const DEFAULT_STREAMING_REGION = "US";

export function getStreamingRegionLabel(code: string | undefined) {
  return STREAMING_REGIONS.find(([id]) => id === code)?.[1] ?? "United States";
}
