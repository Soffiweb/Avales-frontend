import { useState } from "react";

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, openGroup: boolean) => React.ReactNode;
  open?: boolean;
}

/**
 * Contenedor de un grupo colapsable del sidebar.
 *
 * El `li` es solo estructura: el estilo del estado activo vive en el botón que
 * renderiza el consumidor, para que el "pill" cubra exactamente el área
 * clickeable y no todo el bloque con sus hijos desplegados.
 */
export default function SidebarLinkGroup({
  children,
  open = false,
}: SidebarLinkGroupProps) {
  const [openGroup, setOpenGroup] = useState<boolean>(open);

  const handleClick = () => {
    setOpenGroup(!openGroup);
  };

  return <li className="group is-link-group">{children(handleClick, openGroup)}</li>;
}
