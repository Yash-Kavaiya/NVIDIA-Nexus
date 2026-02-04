import { useState, useEffect } from 'react';
import { Bell, Search, Command, ToggleRight } from 'lucide-react';
import { useStore } from '../../store';
import GlobalSearch from '../Search/GlobalSearch';

export default function Header() {
  const { toggleTaskPanel, showTaskPanel, activeTask } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-16 bg-nvidia-dark border-b border-nvidia-gray-light flex items-center justify-between px-6">
        {/* Left Side - Search */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div 
            className="relative flex-1 cursor-pointer"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nvidia-text-secondary" />
            <input
              type="text"
              placeholder="Search files, tasks, or ask AI..."
              className="nvidia-input w-full pl-10 pr-4 py-2 text-sm cursor-pointer"
              readOnly
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-nvidia-text-secondary text-xs">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </div>
        </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-3">
        {/* Task Toggle */}
        <button
          onClick={toggleTaskPanel}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
            showTaskPanel 
              ? 'bg-nvidia-green text-nvidia-black' 
              : 'hover:bg-nvidia-gray text-nvidia-text-secondary'
          }`}
        >
          <ToggleRight className={`w-5 h-5 ${activeTask ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium">
            {activeTask ? `Task: ${activeTask.progress}%` : 'Tasks'}
          </span>
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors relative">
          <Bell className="w-5 h-5 text-nvidia-text-secondary" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-nvidia-green rounded-full"></span>
        </button>

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nvidia-green to-nvidia-green-dark flex items-center justify-center text-nvidia-black font-bold text-sm">
          U
        </div>
      </div>
    </header>

    {/* Global Search Modal */}
    <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
