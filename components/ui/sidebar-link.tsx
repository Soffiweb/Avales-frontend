import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppProvider } from "@/app/providers/app-provider";

interface SidebarLinkProps {
  children: React.ReactNode;
  href: string;
}

/**
 * Link de navegación del sidebar.
 *
 * No aplica estilos de estado: el "pill" (activo / hover) lo pinta el
 * contenido que recibe, porque el sidebar necesita variantes distintas para
 * items de primer nivel y para hijos de un grupo. Acá solo vive el
 * comportamiento: cerrar el menú en mobile y marcar la página actual para
 * lectores de pantalla.
 */
export default function SidebarLink({ children, href }: SidebarLinkProps) {
  const pathname = usePathname();
  const { setSidebarOpen } = useAppProvider();

  return (
    <Link
      className="block"
      href={href}
      onClick={() => setSidebarOpen(false)}
      aria-current={pathname === href ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
