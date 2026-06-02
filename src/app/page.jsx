import { requireUser } from "@/lib/auth";
import DashboardClient from "./dashboard/DashboardClient";

export default async function HomePage() {
  const user = await requireUser();
  return <DashboardClient user={user} />;
}
