import { useState, useCallback } from 'react';
import { useStore } from '../store';

export function useFileSelection() {
  const { selectedFiles, selectFile, deselectFile } = useStore();
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleFileClick = useCallback((
    filePath: string, 
    index: number, 
    isCtrlPressed: boolean, 
    isShiftPressed: boolean,
    files: any[]
  ) => {
    if (isShiftPressed && lastSelectedIndex !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      
      for (let i = start; i <= end; i++) {
        if (!selectedFiles.includes(files[i].path)) {
          selectFile(files[i].path);
        }
      }
    } else if (isCtrlPressed) {
      // Toggle selection
      if (selectedFiles.includes(filePath)) {
        deselectFile(filePath);
      } else {
        selectFile(filePath);
      }
      setLastSelectedIndex(index);
    } else {
      // Single selection
      if (selectedFiles.length === 1 && selectedFiles[0] === filePath) {
        deselectFile(filePath);
        setLastSelectedIndex(null);
      } else {
        // Clear all and select this one
        selectedFiles.forEach(path => deselectFile(path));
        selectFile(filePath);
        setLastSelectedIndex(index);
      }
    }
  }, [selectedFiles, selectFile, deselectFile, lastSelectedIndex]);

  return {
    handleFileClick,
    lastSelectedIndex,
    selectedFiles
  };
}
