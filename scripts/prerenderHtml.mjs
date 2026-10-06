const decodeXml = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Only public content routes; never snapshot customer, admin or checkout state. */
export function routeOutputPath(route) {
  if (route === '/') return 'index.html';
  const parts = route.split('/');
  if (parts.length !== 3 || !['books', 'page', 'collections'].includes(parts[1])) throw new Error(`Unsupported snapshot route: ${route}`);
  const slug = decodeURIComponent(parts[2]);
  if (!slug || slug === '.' || slug === '..' || /[\\/%\x00-\x1f<>:"|?*]/.test(slug) || /[. ]$/.test(slug)) throw new Error(`Unsafe snapshot route: ${route}`);
  return `${parts[1]}/${slug}/index.html`;
}

export function publicRoutes(xml, siteUrl) {
  const base = new URL(siteUrl.replace(/\/$/, '') + '/');
  return [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap(match => {
    const url = new URL(decodeXml(match[1]));
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.search || url.hash) return [];
    const route = '/' + url.pathname.slice(base.pathname.length).replace(/\/$/, '');
    if (route !== '/' && !/^\/(books|page|collections)\/[^/]+$/.test(route)) return [];
    routeOutputPath(route);
    return [route];
  }))];
}

/** Runs inside the rendering browser. Serialize DOM only, never storage/window state. */
export function captureDocument({ template, publicUrl, localOrigin }) {
  const root = document.getElementById('root');
  if (!root?.textContent?.trim() || document.querySelector('vite-error-overlay')) throw new Error('Cannot snapshot an empty or failed storefront');
  const clone = document.documentElement.cloneNode(true);
  const original = new DOMParser().parseFromString(template, 'text/html');
  // Runtime scripts are not data. Reuse only scripts shipped in the app shell, and
  // the current page's JSON-LD; avoid duplicating third-party script side effects.
  clone.querySelectorAll('script').forEach(script => {
    if (script.id !== 'seo-jsonld-page' || script.type !== 'application/ld+json') script.remove();
  });
  original.querySelectorAll('script:not([type="application/ld+json"])').forEach(script => {
    clone.querySelector('body').appendChild(script.cloneNode(true));
  });
  clone.querySelectorAll('*').forEach(element => {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
      else if (attribute.value.includes(localOrigin)) element.setAttribute(attribute.name, attribute.value.replaceAll(localOrigin, new URL(publicUrl).origin));
    }
  });
  let canonical = clone.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; clone.querySelector('head').appendChild(canonical); }
  canonical.setAttribute('href', publicUrl);
  const og = clone.querySelector('meta[property="og:url"]');
  if (og) og.setAttribute('content', publicUrl);
  clone.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    script.textContent = script.textContent.replaceAll(localOrigin, new URL(publicUrl).origin).replace(/</g, '\\u003c');
  });
  return '<!DOCTYPE html>\n' + clone.outerHTML;
}
