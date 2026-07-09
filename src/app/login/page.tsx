import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full min-w-0 items-center justify-center overflow-x-hidden py-8">
      <Suspense
        fallback={
          <div className="text-sm text-slate-500">Loading sign-in…</div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
