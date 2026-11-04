import type { Metadata } from "next";
import Link from "next/link";
import { AccountCard, AppearanceCard, ProfileForm, RemindersCard, TargetsCard, type ProfileData } from "@/components/profile/sections";
import { Card, PageHeader } from "@/components/ui/misc";
import { dateToIso } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { getProfile } from "@/server/profile/service";
import { listReminders } from "@/server/reminders/service";

export const metadata: Metadata = { title: "Hồ sơ & cài đặt" };

export default async function Page() {
  const u = await requireUser();
  const [p, reminders] = await Promise.all([getProfile(u.userId), listReminders(u.userId)]);
  if (!p) return null;
  const data: ProfileData = { ...p, birthDate: dateToIso(p.birthDate) };
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Hồ sơ & cài đặt" subtitle={u.email} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <ProfileForm p={data} tz={u.timezone} />
          <TargetsCard p={data} />
          <Card className="flex flex-col gap-1"><h2 className="text-lg font-semibold">Lối tắt</h2>
            <Link href="/cong-thuc" className="min-h-11 content-center text-primary underline">Công thức của tôi</Link>
            <Link href="/can-nang" className="min-h-11 content-center text-primary underline">Cân nặng & xu hướng</Link>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <RemindersCard reminders={reminders} />
          <AppearanceCard theme={u.themePref} hideWeight={p.hideWeight} />
          <AccountCard />
        </div>
      </div>
    </div>
  );
}
