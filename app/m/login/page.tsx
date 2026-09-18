export const dynamic = "force-dynamic";

import { Suspense } from "react";
import MemberLoginForm from "@/components/MemberLoginForm";

export default function MemberLoginPage() {
  return (
    <Suspense fallback={null}>
      <MemberLoginForm />
    </Suspense>
  );
}
