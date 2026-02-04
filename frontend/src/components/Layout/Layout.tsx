import { useStore } from '../../store';
import Sidebar from './Sidebar';
import Header from './Header';
import TaskPanel from '../TaskPanel/TaskPanel';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { sidebarOpen, showTaskPanel } = useStore();

  return (
    <div className="flex h-screen bg-nvidia-black overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Mobile Header spacer */}
        <div className="lg:hidden h-14" />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex relative">
          <div className={`flex-1 overflow-auto p-4 lg:p-6 transition-all duration-300 pb-24 lg:pb-6 ${showTaskPanel ? 'lg:mr-80' : ''}`}>
            {children}
          </div>

          {/* Task Panel - Desktop only */}
          <div className="hidden lg:block">
            {showTaskPanel && <TaskPanel />}
          </div>
        </main>

        {/* Mobile Bottom Navigation spacer */}
        <div className="lg:hidden h-16" />
      </div>
    </div>
  );
}
