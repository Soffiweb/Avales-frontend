import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ====== Auth (cookie HttpOnly "token") ======
  const token = req.cookies.get("token")?.value;

  const isPublic =
    pathname.startsWith("/signin") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  // No autenticado -> solo rutas públicas
  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  // Autenticado en "/" o "/signin" -> redirigir a /dashboard
  if (token && (pathname === "/" || pathname.startsWith("/signin"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Excluir: assets internos, API proxy, imágenes y archivos públicos
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|images/|public/).*)"],
};
