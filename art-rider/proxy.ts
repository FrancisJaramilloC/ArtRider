import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip RSC requests and prefetch requests — these are internal App Router
  // navigation signals. Intercepting them with async auth causes the router
  // to dispatch actions before its client-side state is initialized (E668).
  const isRSC = request.headers.get("RSC") === "1";
  const isPrefetch = request.headers.get("Next-Router-Prefetch") === "1";
  if (isRSC || isPrefetch) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({ name, value, ...options });
            supabaseResponse = NextResponse.next({
              request: { headers: request.headers },
            });
            supabaseResponse.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            request.cookies.set({ name, value: "", ...options });
            supabaseResponse = NextResponse.next({
              request: { headers: request.headers },
            });
            supabaseResponse.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const protectedRoutes = [
      "/dashboard",
      "/bookings",
      "/profile",
      "/mensajes",
      "/messages",
      "/favoritos",
      "/notifications",
      "/checkout",
      "/packages",
      "/listings",
      "/provider",
      "/become-a-provider",
    ];
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAuthRoute =
      pathname.startsWith("/login") || pathname.startsWith("/register");

    if (!user && isProtectedRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    if (user && isAuthRoute) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      return NextResponse.redirect(homeUrl);
    }
  } catch {
    // Auth check failed — pass through without redirecting
  }

  return supabaseResponse;
}

export const config = {
  // Exclude ALL _next/ internals (static, image, data, RSC chunks, etc.)
  // and API routes — these don't need session refresh via proxy.
  matcher: [
    "/((?!_next/|api/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
