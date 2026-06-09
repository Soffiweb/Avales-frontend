"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="es">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: "28rem" }}>
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }} aria-hidden>
              ⚠️
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Error crítico
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Ocurrió un error inesperado. Por favor recarga la página o intenta de nuevo.
            </p>
            {error.digest && (
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                  marginBottom: "1rem",
                }}
              >
                ref: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.5rem 1.25rem",
                backgroundColor: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
