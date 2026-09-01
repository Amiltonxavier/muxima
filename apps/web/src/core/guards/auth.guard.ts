import { redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export async function authGuard() {
  const { data: session } = await authClient.getSession();

  if (!session) {
    throw redirect({
      to: "/login",
    });
  }

  return {
    session,
  };
}