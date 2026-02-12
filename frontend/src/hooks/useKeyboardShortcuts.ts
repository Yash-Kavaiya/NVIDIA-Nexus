import { useEffect, useCallback } from 'react';
import { useStore } from '../store';

interface KeyboardShortcutCallbacks {
  onDelete?: (paths: string[]) => void;
  onRename?: (path: string) => void;
  onOpen?: (path: string) => void;
}

let _callbacks: KeyboardShortcutCallbacks = {};

export function setKeyboardShortcutCallbacks(cb: KeyboardShortcutCallbacks) {
  _callbacks = cb;
}

export function useKeyboardShortcuts() {
  const {
    selectedFiles,
    files,
    selectAllFiles,
    deselectAllFiles,
    addToast
  } = useStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle shortcuts when not typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;

    switch (e.key) {
      case 'a':
        if (isCtrl) {
          e.preventDefault();
          if (selectedFiles.length === files.length) {
            deselectAllFiles();
          } else {
            selectAllFiles();
          }
        }
        break;

      case 'c':
        if (isCtrl && selectedFiles.length > 0) {
          e.preventDefault();
          navigator.clipboard.writeText(selectedFiles.join('\n'));
          addToast('info', `Copied ${selectedFiles.length} path(s) to clipboard`);
        }
        break;

      case 'Delete':
        if (selectedFiles.length > 0) {
          e.preventDefault();
          _callbacks.onDelete?.(selectedFiles);
        }
        break;

      case 'F2':
        if (selectedFiles.length === 1) {
          e.preventDefault();
          _callbacks.onRename?.(selectedFiles[0]);
        }
        break;

      case 'Enter':
        if (selectedFiles.length === 1) {
          e.preventDefault();
          _callbacks.onOpen?.(selectedFiles[0]);
        }
        break;

      case 'Escape':
        deselectAllFiles();
        break;
    }
  }, [selectedFiles, files, selectAllFiles, deselectAllFiles, addToast]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
