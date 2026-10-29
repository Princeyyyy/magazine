import * as React from "react";

type P = React.SVGProps<SVGSVGElement>;
const base: P = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  width: 24,
  height: 24,
};

export const OrderDetailsIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2.5" />
    <path d="M9 4V3.2c0-.4.3-.7.7-.7h4.6c.4 0 .7.3.7.7V4" />
    <path d="M9 10h6M9 13.5h6M9 17h3.5" />
  </svg>
);

export const AboutHerIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.8 20.5c.6-3.9 3.6-6 7.2-6s6.6 2.1 7.2 6" />
    <path d="M19 3.2v2.6M17.7 4.5h2.6" />
  </svg>
);

export const FavouritesIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.4l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.7 6.7 19.7l1.1-5.9L3.4 9.7l6-.8z" />
  </svg>
);

export const BeautyIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8.5" y="14" width="7" height="7" rx="1.2" />
    <rect x="9.5" y="10.5" width="5" height="3.5" />
    <path d="M9.5 10.5V7.4L13.6 3l.9.9v6.6" />
  </svg>
);

export const StyleWishlistIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 8.2V7.4a2 2 0 1 0-2-2" />
    <path d="M12 8.2l8 5.4a1.1 1.1 0 0 1-.6 2H4.6a1.1 1.1 0 0 1-.6-2z" />
    <path d="M5 19.5h14" />
  </svg>
);

export const MusicMoviesIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 18V5.5l10-2V16" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </svg>
);

export const MemoriesIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="3" width="15" height="18" rx="2" />
    <rect x="7" y="5.5" width="10" height="9" rx="1" />
    <path d="M12 12.6c-1.9-1.2-2.9-2-2.9-3.1a1.5 1.5 0 0 1 2.9-.5 1.5 1.5 0 0 1 2.9.5c0 1.1-1 1.9-2.9 3.1z" />
    <path d="M8.5 18h4" />
  </svg>
);

export const PhotosIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M3.8 17.5l4.7-4.2 3.5 3.1 3-2.6 5.2 4.2" />
  </svg>
);

export const FinalDetailsIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3.6 7l8.4 6.2L20.4 7" />
    <path d="M12 17.2c-1.2-.8-1.9-1.4-1.9-2.1 0-.6.5-1 1-1 .4 0 .7.2.9.5.2-.3.5-.5.9-.5.5 0 1 .4 1 1 0 .7-.7 1.3-1.9 2.1z" />
  </svg>
);

export const sectionIcons = {
  "order-details": OrderDetailsIcon,
  "about-her": AboutHerIcon,
  "about-her-page": AboutHerIcon,
  favourites: FavouritesIcon,
  "her-favourites": FavouritesIcon,
  beauty: BeautyIcon,
  "style-wishlist": StyleWishlistIcon,
  "style-and-wishlist": StyleWishlistIcon,
  "music-movies": MusicMoviesIcon,
  "music-and-movies": MusicMoviesIcon,
  memories: MemoriesIcon,
  photos: PhotosIcon,
  "final-details": FinalDetailsIcon,
} as const;

export function getSectionIcon(pageId: string): React.ComponentType<P> {
  return (
    sectionIcons[pageId as keyof typeof sectionIcons] ?? OrderDetailsIcon
  );
}

/**
 * Brand logo mark on rose gradient tile (from assets/logo/logo-mark.svg)
 */
export const BrandLogoMark = (p: P) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    width={36}
    height={36}
    aria-hidden="true"
    {...p}
  >
    <defs>
      <linearGradient id="brand-gi" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stopColor="#FF7BAE" />
        <stop offset="1" stopColor="#D93272" />
      </linearGradient>
      <clipPath id="brand-ci">
        <rect x="16" y="8" width="32" height="48" rx="3.2" />
      </clipPath>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#brand-gi)" />
    <g>
      <rect
        x="17.5"
        y="10"
        width="32"
        height="48"
        rx="3.2"
        fill="#8E1B4B"
        opacity=".28"
      />
      <g clipPath="url(#brand-ci)">
        <rect x="16" y="8" width="32" height="48" fill="#FFF6F9" />
        <rect x="16" y="8" width="6.2" height="48" fill="#F7CADB" />
      </g>
      <path
        d="M22.2 8.6V55.4"
        stroke="#D93272"
        strokeOpacity=".35"
        strokeWidth=".8"
      />
      <rect x="25" y="15" width="19" height="3.6" rx="1.2" fill="#8E1B4B" />
      <rect x="25" y="21" width="11" height="1.8" rx=".9" fill="#F7CADB" />
      <path
        d="M35.2 23.5 Q37.3 31.9 45.7 34 Q37.3 36.1 35.2 44.5 Q33.1 36.1 24.7 34 Q33.1 31.9 35.2 23.5Z"
        fill="#8E1B4B"
      />
      <path
        d="M42.5 42.3 Q43.34 45.66 46.7 46.5 Q43.34 47.34 42.5 50.7 Q41.66 47.34 38.3 46.5 Q41.66 45.66 42.5 42.3Z"
        fill="#F6B95C"
      />
    </g>
  </svg>
);

/**
 * Transparent brand logo mark (from assets/logo/logo-mark-transparent.svg)
 */
export const BrandLogoTransparent = (p: P) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    width={32}
    height={32}
    aria-hidden="true"
    {...p}
  >
    <defs>
      <clipPath id="brand-ct">
        <rect x="16" y="8" width="32" height="48" rx="3.2" />
      </clipPath>
    </defs>
    <g>
      <rect
        x="17.5"
        y="10"
        width="32"
        height="48"
        rx="3.2"
        fill="#8E1B4B"
        opacity=".28"
      />
      <g clipPath="url(#brand-ct)">
        <rect x="16" y="8" width="32" height="48" fill="#FFF6F9" />
        <rect x="16" y="8" width="6.2" height="48" fill="#F7CADB" />
      </g>
      <path
        d="M22.2 8.6V55.4"
        stroke="#D93272"
        strokeOpacity=".35"
        strokeWidth=".8"
      />
      <rect x="25" y="15" width="19" height="3.6" rx="1.2" fill="#8E1B4B" />
      <rect x="25" y="21" width="11" height="1.8" rx=".9" fill="#F7CADB" />
      <path
        d="M35.2 23.5 Q37.3 31.9 45.7 34 Q37.3 36.1 35.2 44.5 Q33.1 36.1 24.7 34 Q33.1 31.9 35.2 23.5Z"
        fill="#8E1B4B"
      />
      <path
        d="M42.5 42.3 Q43.34 45.66 46.7 46.5 Q43.34 47.34 42.5 50.7 Q41.66 47.34 38.3 46.5 Q41.66 45.66 42.5 42.3Z"
        fill="#F6B95C"
      />
    </g>
  </svg>
);
