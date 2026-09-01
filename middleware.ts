import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicClientRoute = createRouteMatcher([
  "/client/login",
  "/client/register",
  "/client/waiting",
]);

const isPublicAdminRoute = createRouteMatcher([
  "/admin/login",
  "/admin/unauthorized",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (isPublicAdminRoute(request)) {
      return;
    }
    if (!(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/admin/login");
    }
    return;
  }

  if (!pathname.startsWith("/client")) {
    return;
  }

  if (isPublicClientRoute(request)) {
    return;
  }

  if (!(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/client/login");
  }
});

export const config = {
  matcher: ["/client/:path*", "/admin/:path*", "/api/auth"],
};
