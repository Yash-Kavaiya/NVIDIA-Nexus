import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  MessageSquare, 
  ListTodo, 
  Settings,
  Menu,
  X,
  Cpu
} from 'lucide-react';
import { useStore } from '../../store';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/files', icon: FolderOpen, label: 'Files' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <aside 
      className={`fixed left-0 top-0 h-full bg-nvidia-dark border-r border-nvidia-gray-light transition-all duration-300 z-50 ${
        sidebarOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-nvidia-gray-light">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <Cpu className="w-8 h-8 text-nvidia-green" />
            <span className="font-bold text-lg nvidia-text-gradient">NEXUS</span>
          </div>
        ) : (
          <Cpu className="w-8 h-8 text-nvidia-green mx-auto" />
        )}
        <button 
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-nvidia-gray transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
              ${isActive 
                ? 'bg-nvidia-green text-nvidia-black font-semibold' 
                : 'text-nvidia-text-secondary hover:bg-nvidia-gray hover:text-nvidia-white'
              }
            `}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`} />
            {sidebarOpen && <span className="truncate">{item.label}</span>}
            
            {/* Tooltip for collapsed state */}
            {!sidebarOpen && (
              <div className="absolute left-16 bg-nvidia-gray border border-nvidia-gray-light px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-nvidia-gray-light">
          <div className="text-xs text-nvidia-text-secondary">
            <p className="nvidia-text-gradient font-semibold mb-1">NVIDIA Nemotron-3</p>
            <p>AI Assistant v1.0</p>
          </div>
        </div>
      )}
    </aside>
  );
}
