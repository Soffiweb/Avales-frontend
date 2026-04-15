const TEMPLATE_ENDPOINTS = {
  usuarios: {
    path: "/users/template",
    fallbackFilename: "plantilla_usuarios.xlsx",
  },
  eventos: {
    path: "/events/template",
    fallbackFilename: "plantilla_eventos.xlsx",
  },
} as const;

function getFilenameFromContentDisposition(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/(^"|"$)/g, ""));
    } catch {
      return utf8Match[1].replace(/(^"|"$)/g, "");
    }
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (!filenameMatch?.[1]) return null;

  return filenameMatch[1].trim().replace(/^"|"$/g, "");
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function extractErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") {
      const message =
        "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "detail" in payload && typeof payload.detail === "string"
            ? payload.detail
            : null;
      if (message) return message;
    }
  }

  if (contentType.startsWith("text/")) {
    const text = await response.text().catch(() => "");
    if (text.trim()) return text.trim();
  }

  return `Error (${response.status})`;
}

async function downloadTemplate(type: keyof typeof TEMPLATE_ENDPOINTS) {
  const config = TEMPLATE_ENDPOINTS[type];
  const response = await fetch(`/api/v1${config.path}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const blob = await response.blob();
  const filename =
    getFilenameFromContentDisposition(
      response.headers.get("content-disposition")
    ) ?? config.fallbackFilename;

  triggerBrowserDownload(blob, filename);
}

export function downloadUsersTemplate() {
  return downloadTemplate("usuarios");
}

export function downloadEventsTemplate() {
  return downloadTemplate("eventos");
}
