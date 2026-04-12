import type { Book, SiteSettings } from "./types";

export const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1763747996545-8905244bc31a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg";

export const CATEGORIES = ["PUBLICATIONS", "EPHEMERA", "IMPRINT", "OUT OF PRINT"] as const;

export const DEFAULT_BOOKS: Book[] = [
  {
    id: "1",
    title: "FIND STILL CATCHES ME SHIFTED",
    status: "published",
    isFeatured: true,
    photos: [{ url: DEFAULT_IMAGE }],
    genres: ["PUBLICATIONS"],
  },
  {
    id: "2",
    title: "ROADKILL",
    status: "published",
    isFeatured: true,
    photos: [
      {
        url: "https://images.unsplash.com/photo-1758925403752-4794957be8af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg",
      },
    ],
    genres: ["PUBLICATIONS"],
  },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  announcements: [
    { message: "INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY AND EPHEMERA" },
  ],
};

export const SITE_CACHE_KEY = "site-bootstrap-v1";
