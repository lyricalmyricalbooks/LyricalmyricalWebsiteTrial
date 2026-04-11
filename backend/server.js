import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.BACKEND_PORT ?? 4000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'change-me-now';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const dataFile = path.join(__dirname, 'data', 'store.json');
if (!fs.existsSync(path.dirname(dataFile))) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
}

const defaultState = {
  books: [],
  shippingProfiles: [
    {
      id: crypto.randomUUID(),
      name: 'Domestic Standard',
      description: '3-5 business days',
      regions: ['US'],
      baseRate: 4.99,
      perItemRate: 1.25,
      freeShippingThreshold: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  authors: [],
  websiteSettings: {
    homepageFeaturedBookIds: [],
    bestsellerBookIds: [],
    announcements: [],
    seoDefaults: {
      title: 'Publisher Catalog',
      description: 'Official publisher website and catalog',
    },
  },
  auditLog: [],
  sessions: [],
};

function loadState() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultState, null, 2));
    return structuredClone(defaultState);
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

let state = loadState();

function saveState() {
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

function audit(action, entityType, entityId, details = {}) {
  state.auditLog.unshift({
    id: crypto.randomUUID(),
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });
  state.auditLog = state.auditLog.slice(0, 1000);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getAuthToken(req) {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function requireAuth(req, res) {
  const token = getAuthToken(req);
  if (!token) {
    sendJson(res, 401, { message: 'Missing token' });
    return null;
  }

  const session = state.sessions.find((item) => item.token === token);
  if (!session || session.expiresAt < Date.now()) {
    sendJson(res, 401, { message: 'Invalid or expired token' });
    return null;
  }

  return session;
}

function pathMatch(urlPath, routePattern) {
  const pathParts = urlPath.split('/').filter(Boolean);
  const routeParts = routePattern.split('/').filter(Boolean);
  if (pathParts.length !== routeParts.length) {
    return null;
  }

  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    const routePart = routeParts[i];
    const value = decodeURIComponent(pathParts[i]);
    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = value;
    } else if (routePart !== value) {
      return null;
    }
  }
  return params;
}

function badRequest(res, message) {
  sendJson(res, 400, { message });
}

function notFound(res, message = 'Not found') {
  sendJson(res, 404, { message });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await parseBody(req);
      if (body.password !== ADMIN_PASSWORD) {
        sendJson(res, 401, { message: 'Invalid credentials' });
        return;
      }

      const token = crypto.randomBytes(48).toString('hex');
      state.sessions.push({ token, expiresAt: Date.now() + TOKEN_TTL_MS, role: 'admin' });
      state.sessions = state.sessions.slice(-100);
      saveState();
      sendJson(res, 200, { token, expiresInSeconds: TOKEN_TTL_MS / 1000 });
      return;
    }

    const session = requireAuth(req, res);
    if (!session) {
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard/stats') {
      sendJson(res, 200, {
        totalBooks: state.books.length,
        draftCount: state.books.filter((b) => b.status === 'draft').length,
        publishedCount: state.books.filter((b) => b.status === 'published').length,
        shippingProfiles: state.shippingProfiles.length,
        authors: state.authors.length,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/shipping-profiles') {
      sendJson(res, 200, state.shippingProfiles);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/shipping-profiles') {
      const body = await parseBody(req);
      if (!body.name) {
        badRequest(res, 'name is required');
        return;
      }

      const profile = {
        id: crypto.randomUUID(),
        name: body.name,
        description: body.description ?? '',
        regions: Array.isArray(body.regions) ? body.regions : [],
        baseRate: Number(body.baseRate ?? 0),
        perItemRate: Number(body.perItemRate ?? 0),
        freeShippingThreshold: body.freeShippingThreshold === null ? null : Number(body.freeShippingThreshold ?? 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.shippingProfiles.push(profile);
      audit('create', 'shippingProfile', profile.id, { name: profile.name });
      saveState();
      sendJson(res, 201, profile);
      return;
    }

    const shippingIdParams = pathMatch(url.pathname, '/api/shipping-profiles/:id');
    if (shippingIdParams && req.method === 'PUT') {
      const profile = state.shippingProfiles.find((item) => item.id === shippingIdParams.id);
      if (!profile) {
        notFound(res, 'Shipping profile not found');
        return;
      }
      const body = await parseBody(req);
      for (const key of ['name', 'description', 'regions', 'baseRate', 'perItemRate', 'freeShippingThreshold']) {
        if (body[key] !== undefined) {
          profile[key] = body[key];
        }
      }
      profile.updatedAt = new Date().toISOString();
      audit('update', 'shippingProfile', profile.id, { name: profile.name });
      saveState();
      sendJson(res, 200, profile);
      return;
    }

    if (shippingIdParams && req.method === 'DELETE') {
      if (state.books.some((book) => book.shippingProfileId === shippingIdParams.id)) {
        sendJson(res, 409, { message: 'Cannot delete profile in use by books' });
        return;
      }
      const before = state.shippingProfiles.length;
      state.shippingProfiles = state.shippingProfiles.filter((item) => item.id !== shippingIdParams.id);
      if (before === state.shippingProfiles.length) {
        notFound(res, 'Shipping profile not found');
        return;
      }
      audit('delete', 'shippingProfile', shippingIdParams.id);
      saveState();
      sendJson(res, 200, { success: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/authors') {
      sendJson(res, 200, state.authors);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/authors') {
      const body = await parseBody(req);
      if (!body.name) {
        badRequest(res, 'name is required');
        return;
      }
      const author = {
        id: crypto.randomUUID(),
        name: body.name,
        bio: body.bio ?? '',
        website: body.website ?? '',
        socials: body.socials ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.authors.push(author);
      audit('create', 'author', author.id, { name: author.name });
      saveState();
      sendJson(res, 201, author);
      return;
    }

    const authorIdParams = pathMatch(url.pathname, '/api/authors/:id');
    if (authorIdParams && req.method === 'PUT') {
      const author = state.authors.find((item) => item.id === authorIdParams.id);
      if (!author) {
        notFound(res, 'Author not found');
        return;
      }
      const body = await parseBody(req);
      for (const key of ['name', 'bio', 'website', 'socials']) {
        if (body[key] !== undefined) {
          author[key] = body[key];
        }
      }
      author.updatedAt = new Date().toISOString();
      audit('update', 'author', author.id, { name: author.name });
      saveState();
      sendJson(res, 200, author);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/books') {
      const status = url.searchParams.get('status');
      const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
      let books = [...state.books];
      if (status) {
        books = books.filter((book) => book.status === status);
      }
      if (search) {
        books = books.filter((book) => {
          return [book.title, book.subtitle, book.isbn, book.sku]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        });
      }
      sendJson(res, 200, books);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/books') {
      const body = await parseBody(req);
      if (!body.title || !body.shippingProfileId) {
        badRequest(res, 'title and shippingProfileId are required');
        return;
      }
      if (!state.shippingProfiles.some((item) => item.id === body.shippingProfileId)) {
        badRequest(res, 'Invalid shippingProfileId');
        return;
      }
      if (body.authorId && !state.authors.some((item) => item.id === body.authorId)) {
        badRequest(res, 'Invalid authorId');
        return;
      }

      const book = {
        id: crypto.randomUUID(),
        title: body.title,
        subtitle: body.subtitle ?? '',
        description: body.description ?? '',
        isbn: body.isbn ?? '',
        sku: body.sku ?? '',
        publicationDate: body.publicationDate ?? null,
        format: body.format ?? 'paperback',
        status: body.status ?? 'draft',
        language: body.language ?? 'en',
        pageCount: Number(body.pageCount ?? 0),
        price: Number(body.price ?? 0),
        inventory: Number(body.inventory ?? 0),
        shippingProfileId: body.shippingProfileId,
        authorId: body.authorId ?? null,
        genres: Array.isArray(body.genres) ? body.genres : [],
        tags: Array.isArray(body.tags) ? body.tags : [],
        photos: [],
        isFeatured: Boolean(body.isFeatured),
        seo: {
          slug: body.seo?.slug ?? body.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          metaTitle: body.seo?.metaTitle ?? body.title,
          metaDescription: body.seo?.metaDescription ?? '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.books.push(book);
      audit('create', 'book', book.id, { title: book.title });
      saveState();
      sendJson(res, 201, book);
      return;
    }

    const bookIdParams = pathMatch(url.pathname, '/api/books/:id');
    if (bookIdParams && req.method === 'PUT') {
      const book = state.books.find((item) => item.id === bookIdParams.id);
      if (!book) {
        notFound(res, 'Book not found');
        return;
      }
      const body = await parseBody(req);
      if (body.shippingProfileId && !state.shippingProfiles.some((item) => item.id === body.shippingProfileId)) {
        badRequest(res, 'Invalid shippingProfileId');
        return;
      }
      if (body.authorId && !state.authors.some((item) => item.id === body.authorId)) {
        badRequest(res, 'Invalid authorId');
        return;
      }
      for (const key of [
        'title', 'subtitle', 'description', 'isbn', 'sku', 'publicationDate', 'format', 'status',
        'language', 'pageCount', 'price', 'inventory', 'shippingProfileId', 'authorId', 'genres',
        'tags', 'isFeatured', 'seo',
      ]) {
        if (body[key] !== undefined) {
          book[key] = body[key];
        }
      }
      book.updatedAt = new Date().toISOString();
      audit('update', 'book', book.id, { title: book.title });
      saveState();
      sendJson(res, 200, book);
      return;
    }

    if (bookIdParams && req.method === 'DELETE') {
      const existing = state.books.find((book) => book.id === bookIdParams.id);
      if (!existing) {
        notFound(res, 'Book not found');
        return;
      }
      state.books = state.books.filter((book) => book.id !== bookIdParams.id);
      audit('delete', 'book', bookIdParams.id, { title: existing.title });
      saveState();
      sendJson(res, 200, { success: true });
      return;
    }

    const bookPhotoParams = pathMatch(url.pathname, '/api/books/:id/photos');
    if (bookPhotoParams && req.method === 'POST') {
      const book = state.books.find((item) => item.id === bookPhotoParams.id);
      if (!book) {
        notFound(res, 'Book not found');
        return;
      }
      const body = await parseBody(req);
      if (!Array.isArray(body.photos)) {
        badRequest(res, 'photos array is required');
        return;
      }
      if (book.photos.length + body.photos.length > 10) {
        badRequest(res, 'A book can have a maximum of 10 photos');
        return;
      }
      const photos = body.photos.map((photoUrl, index) => ({
        id: crypto.randomUUID(),
        url: String(photoUrl),
        altText: '',
        sortOrder: book.photos.length + index,
        createdAt: new Date().toISOString(),
      }));
      book.photos.push(...photos);
      book.updatedAt = new Date().toISOString();
      audit('upload', 'bookPhoto', book.id, { count: photos.length });
      saveState();
      sendJson(res, 201, book.photos);
      return;
    }

    const bookSinglePhotoParams = pathMatch(url.pathname, '/api/books/:id/photos/:photoId');
    if (bookSinglePhotoParams && req.method === 'DELETE') {
      const book = state.books.find((item) => item.id === bookSinglePhotoParams.id);
      if (!book) {
        notFound(res, 'Book not found');
        return;
      }
      const before = book.photos.length;
      book.photos = book.photos.filter((item) => item.id !== bookSinglePhotoParams.photoId);
      if (before === book.photos.length) {
        notFound(res, 'Photo not found');
        return;
      }
      book.updatedAt = new Date().toISOString();
      audit('delete', 'bookPhoto', book.id, { photoId: bookSinglePhotoParams.photoId });
      saveState();
      sendJson(res, 200, { success: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/website-settings') {
      sendJson(res, 200, state.websiteSettings);
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/website-settings') {
      const body = await parseBody(req);
      state.websiteSettings = {
        ...state.websiteSettings,
        ...body,
      };
      audit('update', 'websiteSettings', 'singleton');
      saveState();
      sendJson(res, 200, state.websiteSettings);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/audit-log') {
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
      sendJson(res, 200, state.auditLog.slice(0, limit));
      return;
    }

    notFound(res);
  } catch (error) {
    sendJson(res, 500, {
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`Publisher backend listening on http://localhost:${PORT}`);
});
