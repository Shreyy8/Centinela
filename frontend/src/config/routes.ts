/**
 * Centinela Centralized Routing & Domain Configuration
 *
 * ARCHITECTURE OVERVIEW:
 * ----------------------
 * 1. Single-Origin Localhost Mode (Default development):
 *    - Marketing Landing: http://localhost:<port>/
 *    - Product Application: http://localhost:<port>/app/...
 *      (e.g., /app/dashboard, /app/config, /app/audit, /app/results, /app/profile)
 *    - Auth routes: /app/login, /app/register
 *
 * 2. Multi-Domain / Subdomain Mode (Production deployment):
 *    - Marketing Domain: https://centinela.com/
 *    - Product Domain: https://app.centinela.com/...
 *
 * SUBDOMAIN DEPLOYMENT INSTRUCTIONS:
 * ----------------------------------
 * To switch from single-origin mode to real subdomains:
 * 1. In your production deployment environment (Cloudflare Pages, Vercel, or AWS Amplify):
 *    Set:
 *      VITE_SUBDOMAIN_MODE=true
 *      VITE_MARKETING_BASE_URL=https://centinela.com
 *      VITE_APP_BASE_URL=https://app.centinela.com
 * 2. DNS & Rewrites:
 *    - centinela.com: Route traffic to the marketing build root.
 *    - app.centinela.com: Route traffic with rewrite rule:
 *        / -> /app/dashboard
 *        /* -> /app/*
 * 3. Zero code changes required: All cross-links and navigation use `appUrl()` and `marketingUrl()`.
 */

export const ROUTE_CONFIG = {
  isSubdomainMode:
    typeof import.meta !== "undefined" && import.meta.env?.VITE_SUBDOMAIN_MODE === "true",
  marketingBaseUrl:
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_MARKETING_BASE_URL) || "",
  appBaseUrl: (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_BASE_URL) || "",
};

export const APP_ROUTES = {
  landing: "/",
  app: "/app",
  dashboard: "/app/dashboard",
  config: "/app/config",
  audit: "/app/audit",
  results: "/app/results",
  profile: "/app/profile",
  login: "/app/login",
  register: "/app/register",
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;

/**
 * Normalizes path to start with a slash
 */
function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Generates cross-boundary URL to the product application.
 *
 * In single-origin mode:
 *   appUrl('/dashboard') => '/app/dashboard'
 *   appUrl('/app/dashboard') => '/app/dashboard'
 *
 * In subdomain mode:
 *   appUrl('/dashboard') => 'https://app.centinela.com/dashboard'
 */
export function appUrl(path: string = "/dashboard"): string {
  const norm = normalizePath(path);
  const appPath = norm.startsWith("/app") ? norm : `/app${norm === "/" ? "/dashboard" : norm}`;

  if (ROUTE_CONFIG.isSubdomainMode && ROUTE_CONFIG.appBaseUrl) {
    const base = ROUTE_CONFIG.appBaseUrl.replace(/\/$/, "");
    // In subdomain mode, strip leading /app prefix if present
    const subPath = appPath.replace(/^\/app/, "") || "/dashboard";
    return `${base}${subPath}`;
  }

  return appPath;
}

/**
 * Generates cross-boundary URL to the marketing landing page or sections.
 *
 * In single-origin mode:
 *   marketingUrl('/') => '/'
 *   marketingUrl('/#pricing') => '/#pricing'
 *
 * In subdomain mode:
 *   marketingUrl('/#pricing') => 'https://centinela.com/#pricing'
 */
export function marketingUrl(path: string = "/"): string {
  const norm = path.startsWith("#") ? `/${path}` : normalizePath(path);

  if (ROUTE_CONFIG.isSubdomainMode && ROUTE_CONFIG.marketingBaseUrl) {
    const base = ROUTE_CONFIG.marketingBaseUrl.replace(/\/$/, "");
    const cleanPath = norm === "/" ? "" : norm;
    return `${base}${cleanPath}`;
  }

  return norm;
}

/**
 * Internal route string for TanStack Router Link navigation within the application.
 */
export function appRoute(key: AppRouteKey): string {
  return APP_ROUTES[key];
}
