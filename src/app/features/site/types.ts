export type BookPhoto = {
  url: string;
  altText?: string;
};

export type Book = {
  id: string;
  title: string;
  status?: string;
  isFeatured?: boolean;
  scheduleDate?: string;
  genres?: string[];
  photos?: BookPhoto[];
};

export type SiteSettings = {
  announcements?: Array<{ message: string }>;
};
