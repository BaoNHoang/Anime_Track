import { useState, type ImgHTMLAttributes, type ReactNode } from "react";

type ImageWithFallbackProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string;
  fallbackSrc?: string;
  fallback?: ReactNode;
};

const defaultFallback = <span className="poster-placeholder" aria-hidden="true">No image</span>;

export function ImageWithFallback({
  src,
  fallbackSrc,
  fallback = defaultFallback,
  alt = "",
  ...imageProps
}: ImageWithFallbackProps) {
  const [failure, setFailure] = useState<{ primary?: string; urls: string[] }>({ urls: [] });
  const failedUrls = failure.primary === src ? failure.urls : [];
  const imageUrl = [src, fallbackSrc]
    .filter((candidate): candidate is string => Boolean(candidate))
    .find((candidate) => !failedUrls.includes(candidate));

  if (!imageUrl) return <>{fallback}</>;

  return (
    <img
      {...imageProps}
      src={imageUrl}
      alt={alt}
      onError={() => setFailure((current) => ({
        primary: src,
        urls: current.primary === src
          ? [...new Set([...current.urls, imageUrl])]
          : [imageUrl]
      }))}
    />
  );
}
