// Determine API base based on environment
// For local dev, use localhost. For deployed sites, use relative path if proxied, 
// or potentially a hardcoded production URL if you have one.
const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:4000/api" 
  : "/api"; // Default to relative path for production

export async function fetchWithAuth(path: string, options: any = {}) {
  const token = localStorage.getItem("adminToken");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem("adminToken");
      // Only redirect if we are actually in the admin area
      if (window.location.pathname.includes("/admin")) {
        window.location.href = "/admin";
      }
      throw new Error("Unauthorized");
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  } catch (err) {
    console.error(`API Error (${path}):`, err);
    throw err;
  }
}

export const adminApi = {
  login: (password: string) => fetchWithAuth("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  }),
  getStats: () => fetchWithAuth("/dashboard/stats"),
  getBooks: () => fetchWithAuth("/books"),
  createBook: (book: any) => fetchWithAuth("/books", {
    method: "POST",
    body: JSON.stringify(book),
  }),
  updateBook: (id: string, book: any) => fetchWithAuth(`/books/${id}`, {
    method: "PUT",
    body: JSON.stringify(book),
  }),
  deleteBook: (id: string) => fetchWithAuth(`/books/${id}`, {
    method: "DELETE",
  }),
  addPhotos: (bookId: string, photos: any[]) => fetchWithAuth(`/books/${bookId}/photos`, {
    method: "POST",
    body: JSON.stringify({ photos }),
  }),
  getAuthors: () => fetchWithAuth("/authors"),
  createAuthor: (author: any) => fetchWithAuth("/authors", {
    method: "POST",
    body: JSON.stringify(author),
  }),
  getShippingProfiles: () => fetchWithAuth("/shipping-profiles"),
  createShippingProfile: (profile: any) => fetchWithAuth("/shipping-profiles", {
    method: "POST",
    body: JSON.stringify(profile),
  }),
  getSettings: () => fetchWithAuth("/website-settings"),
  updateSettings: (settings: any) => fetchWithAuth("/website-settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  }),
  getAuditLog: (limit = 100) => fetchWithAuth(`/audit-log?limit=${limit}`),
};
