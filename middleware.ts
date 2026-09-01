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

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname } = request.nextUrl;
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
  matcher: ["/client/:path*", "/api/auth"],
};
