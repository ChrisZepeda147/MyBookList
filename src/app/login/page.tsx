import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-page__scale">
        <Suspense
          fallback={
            <div className="text-center text-sm text-slate-500">
              Loading sign-in…
            </div>
          }
        >
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
