import { apiFetch } from "@/lib/api/client";

export type TestEmailResponse = {
  message: string;
};

export function sendTestEmail() {
  return apiFetch<TestEmailResponse>("/mail/test", {
    method: "POST",
  });
}
