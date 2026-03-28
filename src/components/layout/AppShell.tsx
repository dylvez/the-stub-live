import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppShell(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-stub-bg">
      <TopBar />
      <main className="max-w-5xl mx-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
