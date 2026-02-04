import { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Edit3,
  Copy,
  Scissors,
  Trash2,
  Download,
  Info,
  Star,
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  file: any;
  onClose: () => void;
  onAction: (action: string, file: any) => void;
}

export default function FileContextMenu({ x, y, file, onClose, onAction }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    // Adjust position if menu goes off screen
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newX = x + rect.width > window.innerWidth ? x - rect.width : x;
      const newY = y + rect.height > window.innerHeight ? y - rect.height : y;
      setPosition({ x: newX, y: newY });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    { icon: FolderOpen, label: 'Open', action: 'open', shortcut: 'Enter' },
    { icon: Edit3, label: 'Rename', action: 'rename', shortcut: 'F2' },
    { type: 'divider' },
    { icon: Copy, label: 'Copy', action: 'copy', shortcut: 'Ctrl+C' },
    { icon: Scissors, label: 'Cut', action: 'cut', shortcut: 'Ctrl+X' },
    { icon: Trash2, label: 'Delete', action: 'delete', shortcut: 'Delete' },
    { type: 'divider' },
    { icon: Download, label: 'Download', action: 'download', shortcut: '' },
    { icon: Star, label: 'Add to Favorites', action: 'favorite', shortcut: '' },
    { type: 'divider' },
    { icon: Info, label: 'Properties', action: 'properties', shortcut: '' },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 py-2 bg-nvidia-dark border border-nvidia-gray-light rounded-lg shadow-2xl shadow-black/50"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-2 border-b border-nvidia-gray-light mb-2">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-nvidia-text-secondary">
          {file.isDirectory ? 'Folder' : 'File'}
        </p>
      </div>

      {menuItems.map((item, index) => (
        item.type === 'divider' ? (
          <div key={index} className="my-1 border-t border-nvidia-gray-light" />
        ) : (
          <button
            key={index}
            onClick={() => {
              if (item.action) {
                onAction(item.action, file);
              }
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-nvidia-white hover:bg-nvidia-gray transition-colors"
          >
            <div className="flex items-center gap-3">
              {item.icon && <item.icon className="w-4 h-4 text-nvidia-text-secondary" />}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="text-xs text-nvidia-text-secondary">{item.shortcut}</span>
            )}
          </button>
        )
      ))}
    </div>
  );
}
