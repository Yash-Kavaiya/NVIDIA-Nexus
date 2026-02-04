import { useEffect, useCallback } from 'react';
import { useStore } from '../store';

export function useKeyboardShortcuts() {
  const {
    selectedFiles,
    files,
    selectFile,
    deselectFile,
    selectAllFiles,
    deselectAllFiles
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
          // Copy to clipboard
          navigator.clipboard.writeText(JSON.stringify(selectedFiles));
          console.log('Copied files:', selectedFiles);
        }
        break;

      case 'x':
        if (isCtrl && selectedFiles.length > 0) {
          e.preventDefault();
          // Cut operation
          console.log('Cut files:', selectedFiles);
        }
        break;

      case 'v':
        if (isCtrl) {
          e.preventDefault();
          // Paste operation
          console.log('Paste operation');
        }
        break;

      case 'Delete':
        if (selectedFiles.length > 0) {
          e.preventDefault();
          // Delete files
          console.log('Delete files:', selectedFiles);
        }
        break;

      case 'F2':
        if (selectedFiles.length === 1) {
          e.preventDefault();
          // Rename file
          console.log('Rename file:', selectedFiles[0]);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        // Navigate up
        console.log('Navigate up');
        break;

      case 'ArrowDown':
        e.preventDefault();
        // Navigate down
        console.log('Navigate down');
        break;

      case 'Enter':
        if (selectedFiles.length === 1) {
          e.preventDefault();
          // Open file
          console.log('Open file:', selectedFiles[0]);
        }
        break;

      case 'Escape':
        deselectAllFiles();
        break;
    }
  }, [selectedFiles, files, selectFile, deselectFile, selectAllFiles, deselectAllFiles]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
