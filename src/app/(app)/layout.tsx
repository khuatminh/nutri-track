import { redirect } from "next/navigation";
import { BottomNav, Sidebar } from "@/components/layout/nav";
import { OnlineBanner } from "@/components/layout/online-banner";
import { RemindersRunner } from "@/components/reminders/runner";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/profile/service";
import { listReminders } from "@/server/reminders/service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.userId);
  if (!profile) redirect("/onboarding");
  const reminders = await listReminders(user.userId);
  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        <Sidebar name={profile.displayName} />
        <div className="min-w-0 flex-1">
          <OnlineBanner />
          <main className="mx-auto w-full max-w-[1120px] p-4 pb-28 md:p-6 lg:p-8 lg:pb-8">{children}</main>
        </div>
      </div>
      <BottomNav />
      <RemindersRunner reminders={reminders} timezone={user.timezone} />
    </ToastProvider>
  );
}
