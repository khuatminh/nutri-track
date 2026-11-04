import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/profile/service";

export const metadata: Metadata = { title: "Bắt đầu" };

export default async function Page() {
  const u = await requireUser();
  if (await getProfile(u.userId)) redirect("/hom-nay");
  return (
    <ToastProvider>
      <main><OnboardingWizard timezone={u.timezone} initialName="" /></main>
    </ToastProvider>
  );
}
