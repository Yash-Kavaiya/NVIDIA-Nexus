import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  MessageSquare, 
  ListTodo, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/files', icon: FolderOpen, label: 'Files' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-nvidia-dark border-b border-nvidia-gray-light flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-nvidia-green flex items-center justify-center">
            <span className="text-nvidia-black font-bold text-sm">N</span>
          </div>
          <span className="font-bold text-lg nvidia-text-gradient">NEXUS</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-nvidia-gray"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div className={`
        lg:hidden fixed top-14 left-0 bottom-0 w-64 bg-nvidia-dark border-r border-nvidia-gray-light z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-nvidia-green text-nvidia-black font-semibold' 
                  : 'text-nvidia-text-secondary hover:bg-nvidia-gray hover:text-nvidia-white'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-nvidia-dark border-t border-nvidia-gray-light flex items-center justify-around z-40">
        {navItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 p-2 rounded-lg transition-colors
              ${isActive 
                ? 'text-nvidia-green' 
                : 'text-nvidia-text-secondary'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </>
  );
}
