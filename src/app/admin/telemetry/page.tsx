import { isUserAdmin } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import TelemetryDashboard from './TelemetryDashboard';

export const dynamic = 'force-dynamic';

export default async function TelemetryPage() {
  const isAdmin = await isUserAdmin();

  if (!isAdmin) {
    redirect('/admin/unauthorized');
  }

  return <TelemetryDashboard />;
}
