import { getAuthContext } from "@/lib/auth";
import { Dashboard } from "@/components/impactlens/Dashboard";
import { Landing } from "@/components/impactlens/Landing";

// Public marketing page; signed-in members get the app shell instead.
export default async function Home() {
  const auth = await getAuthContext();
  return auth ? <Dashboard /> : <Landing />;
}
