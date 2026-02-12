import { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { fileApi } from '../services/api';
import {
  Folder,
  File,
  ChevronRight,
  MoreVertical,
  Upload,
  Download,
  Trash2,
  FolderTree,
  Search,
  Grid,
  List,
  RefreshCw,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  Image,
  FileCode,
  FileVideo,
  FileAudio,
  Zap,
  X
} from 'lucide-react';
import FileContextMenu from '../components/FileManager/FileContextMenu';
import DragDropZone from '../components/FileManager/DragDropZone';
import FilePreviewModal from '../components/FilePreview/FilePreviewModal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import { useKeyboardShortcuts, setKeyboardShortcutCallbacks } from '../hooks/useKeyboardShortcuts';
import { useFileSelection } from '../hooks/useFileSelection';
import { FileListSkeleton } from '../components/UI/Skeleton';
import GlowEffect from '../components/UI/GlowEffect';
import { StaggerContainer, StaggerItem } from '../components/UI/StaggerContainer';

export default function FileManager() {
  const {
    files,
    selectedFiles,
    currentPath,
    isLoadingFiles,
    selectFile,
    deselectFile,
    selectAllFiles,
    deselectAllFiles,
    setCurrentPath,
    setFiles,
    setFileLoading,
    addToast,
    setActiveTask,
    showTaskPanel,
    toggleTaskPanel,
  } = useStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrganizeModal, setShowOrganizeModal] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: any } | null>(null);

  // File preview state
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  // Properties modal state
  const [propertiesFile, setPropertiesFile] = useState<any>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // File selection with range support
  const { handleFileClick } = useFileSelection();

  // Load files on mount and when path changes
  const loadFiles = useCallback(async () => {
    setFileLoading(true);
    try {
      const fileList = await fileApi.listFiles(currentPath || undefined);
      // Transform backend response to match frontend types
      const transformedFiles = fileList.map((file: any) => ({
        id: file.id,
        name: file.name,
        path: file.path,
        size: file.size,
        type: file.type || '',
        extension: file.name.split('.').pop() || '',
        modifiedAt: file.modified_at,
        createdAt: file.created_at,
        isDirectory: file.is_directory,
      }));
      setFiles(transformedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      addToast('error', 'Failed to load files. Please check if the backend is running.');
    } finally {
      setFileLoading(false);
    }
  }, [currentPath, setFiles, setFileLoading, addToast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  const handleDownloadPaths = useCallback(async (paths: string[]) => {
    const fileTargets = files.filter(file => paths.includes(file.path) && !file.isDirectory);
    if (fileTargets.length === 0) {
      addToast('warning', 'No downloadable files selected');
      return;
    }

    let successCount = 0;
    for (const file of fileTargets) {
      try {
        const blob = await fileApi.downloadFile(file.path);
        downloadBlob(blob, file.name);
        successCount += 1;
      } catch (error) {
        console.error('Download failed:', error);
      }
    }

    if (successCount > 0) {
      addToast('success', `Downloaded ${successCount} file(s)`);
    }
    if (successCount < fileTargets.length) {
      addToast('error', `${fileTargets.length - successCount} file(s) failed to download`);
    }
  }, [files, addToast, downloadBlob]);

  const handleDeletePaths = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;

    try {
      const results = await fileApi.deleteFiles(paths);
      const successCount = results.filter(result => result.success).length;
      const failedResults = results.filter(result => !result.success);

      if (successCount > 0) {
        addToast('success', `Deleted ${successCount} file(s)`);
        paths.forEach(path => deselectFile(path));
        await loadFiles();
      }

      if (failedResults.length > 0) {
        const firstError = failedResults[0].error || 'Delete failed';
        addToast('error', `${failedResults.length} file(s) failed: ${firstError}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      addToast('error', 'Failed to delete files');
    }
  }, [addToast, deselectFile, loadFiles]);

  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsDragActive(false);
    if (acceptedFiles.length === 0) return;

    try {
      await fileApi.uploadFiles(acceptedFiles, currentPath || '');
      addToast('success', `Successfully uploaded ${acceptedFiles.length} file(s)`);
      loadFiles(); // Refresh file list
    } catch (error) {
      console.error('Upload failed:', error);
      addToast('error', 'Failed to upload files');
    }
  }, [currentPath, loadFiles, addToast]);

  const handleRefresh = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  const handleStartOrganize = useCallback(async () => {
    setIsOrganizing(true);
    try {
      const task = await fileApi.organizeFiles(currentPath || '', 'content');
      setShowOrganizeModal(false);
      setActiveTask(task);
      if (!showTaskPanel) {
        toggleTaskPanel();
      }
      addToast('success', 'AI organize task created');
    } catch (error) {
      console.error('Failed to start AI organize:', error);
      addToast('error', 'Failed to start AI organize');
    } finally {
      setIsOrganizing(false);
    }
  }, [addToast, currentPath, setActiveTask, showTaskPanel, toggleTaskPanel]);

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get file icon based on extension
  const getFileIcon = (file: any) => {
    const ext = file.extension?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return <Image className="w-5 h-5 text-nvidia-green-bright" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'go', 'rs'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-yellow-400" />;
    }
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
      return <FileVideo className="w-5 h-5 text-purple-400" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <FileAudio className="w-5 h-5 text-pink-400" />;
    }

    return file.isDirectory
      ? <Folder className="w-5 h-5 text-nvidia-green" />
      : <File className="w-5 h-5 text-nvidia-text-secondary" />;
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, file: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  // Handle context menu actions
  const handleContextMenuAction = useCallback(async (action: string, file: any) => {
    switch (action) {
      case 'open':
        setPreviewFile(file);
        break;
      case 'rename':
        if (file.isDirectory) {
          addToast('warning', 'Folder rename is not supported yet');
          break;
        }
        {
          const targetName = window.prompt('Enter new filename', file.name)?.trim();
          if (!targetName || targetName === file.name) {
            break;
          }

          try {
            const result = await fileApi.renameFiles([
              { source: file.path, target: targetName },
            ]);
            if (result.renamedCount > 0) {
              addToast('success', `Renamed to "${targetName}"`);
              await loadFiles();
            } else {
              const message = result.results[0]?.error || 'Failed to rename file';
              addToast('error', message);
            }
          } catch (error) {
            console.error('Rename failed:', error);
            addToast('error', 'Failed to rename file');
          }
        }
        break;
      case 'copy':
        navigator.clipboard.writeText(file.path);
        break;
      case 'delete':
        setConfirmDialog({
          isOpen: true,
          title: 'Delete File',
          message: `Are you sure you want to delete "${file.name}"? This action cannot be undone.`,
          onConfirm: () => {
            setConfirmDialog(null);
            void handleDeletePaths([file.path]);
          }
        });
        break;
      case 'download':
        void handleDownloadPaths([file.path]);
        break;
      case 'cut':
        navigator.clipboard.writeText(file.path);
        addToast('info', `Cut "${file.name}" — path copied to clipboard`);
        break;
      case 'properties':
        setPropertiesFile(file);
        break;
      default:
        break;
    }
  }, [addToast, handleDeletePaths, handleDownloadPaths, loadFiles]);

  // Register keyboard shortcut callbacks
  useEffect(() => {
    setKeyboardShortcutCallbacks({
      onDelete: (paths: string[]) => {
        const selected = [...paths];
        setConfirmDialog({
          isOpen: true,
          title: 'Delete Selected Files',
          message: `Delete ${selected.length} selected file(s)? This action cannot be undone.`,
          onConfirm: () => {
            setConfirmDialog(null);
            void handleDeletePaths(selected);
          },
        });
      },
      onRename: (path: string) => {
        const file = files.find((f) => f.path === path);
        if (file) {
          handleContextMenuAction('rename', file);
        }
      },
      onOpen: (path: string) => {
        const file = files.find((f) => f.path === path);
        if (file) setPreviewFile(file);
      },
    });
  }, [files, handleDeletePaths, handleContextMenuAction]);

  // Handle file click with modifiers
  const onFileClick = (e: React.MouseEvent, file: any, index: number) => {
    const isCtrlPressed = e.ctrlKey || e.metaKey;
    const isShiftPressed = e.shiftKey;

    if (!isCtrlPressed && !isShiftPressed) {
      // Single click - open preview
      setPreviewFile(file);
    } else {
      // Multi-select
      handleFileClick(file.path, index, isCtrlPressed, isShiftPressed, files);
    }
  };

  // Drag listeners for the whole container
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  return (
    <div
      className="h-full flex flex-col relative"
      onDragOver={onDragOver}
    >
      <DragDropZone onDrop={handleDrop} isDragActive={isDragActive} />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-nvidia-gray-light">
        <div className="flex items-center gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setCurrentPath('')}
              className="text-nvidia-text-secondary hover:text-nvidia-white transition-colors flex items-center gap-2"
            >
              <Folder className="w-4 h-4" />
              Home
            </button>
            {currentPath && (
              <>
                <ChevronRight className="w-4 h-4 text-nvidia-text-secondary" />
                <span className="text-nvidia-white font-medium">{currentPath}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nvidia-text-secondary" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nvidia-input pl-10 pr-4 py-2 text-sm w-64"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-nvidia-gray rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-nvidia-green text-nvidia-black' : 'text-nvidia-text-secondary hover:text-nvidia-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-nvidia-green text-nvidia-black' : 'text-nvidia-text-secondary hover:text-nvidia-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoadingFiles}
            className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-nvidia-text-secondary ${isLoadingFiles ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          {/* Select All */}
          <button
            onClick={selectedFiles.length === files.length ? deselectAllFiles : selectAllFiles}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${selectedFiles.length > 0 ? 'bg-nvidia-green/10 text-nvidia-green' : 'hover:bg-nvidia-gray text-nvidia-text-secondary'
              }`}
          >
            {selectedFiles.length === files.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>{selectedFiles.length > 0 ? `${selectedFiles.length} selected` : 'Select All'}</span>
          </button>

          {selectedFiles.length > 0 && (
            <>
              <div className="h-6 w-px bg-nvidia-gray-light" />
              <button
                onClick={() => void handleDownloadPaths(selectedFiles)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-nvidia-gray transition-colors text-sm text-nvidia-text-secondary"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => {
                  const selected = [...selectedFiles];
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Delete Selected Files',
                    message: `Delete ${selected.length} selected file(s)? This action cannot be undone.`,
                    onConfirm: () => {
                      setConfirmDialog(null);
                      void handleDeletePaths(selected);
                    }
                  });
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* AI Organize Button */}
          <button
            onClick={() => setShowOrganizeModal(true)}
            className="nvidia-button flex items-center gap-2 shadow-[0_0_15px_rgba(118,185,0,0.2)]"
          >
            <Sparkles className="w-4 h-4" />
            AI Organize
          </button>

          {/* Upload Button */}
          <button
            onClick={() => document.getElementById('file-upload-input')?.click()}
            className="nvidia-button-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
            <input
              id="file-upload-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleDrop(Array.from(e.target.files || []))}
            />
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto rounded-xl border border-nvidia-gray-light bg-nvidia-dark/50 backdrop-blur-sm">
        {isLoadingFiles ? (
          <FileListSkeleton />
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nvidia-text-secondary p-12">
            <div className="relative mb-6">
              <GlowEffect intensity="high">
                <FolderTree className="w-20 h-20 text-nvidia-gray-light relative z-10" />
              </GlowEffect>
            </div>
            <p className="text-xl font-bold text-nvidia-white mb-2">No files here yet</p>
            <p className="text-sm max-w-xs text-center">
              Drag and drop files here to upload them to <span className="text-nvidia-green">NVIDIA Nexus</span> or use the Upload button.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <table className="w-full border-collapse">
            <thead className="bg-nvidia-gray/80 sticky top-0 z-10 backdrop-blur-md">
              <tr className="text-left text-xs font-bold text-nvidia-text-secondary uppercase tracking-wider">
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Modified</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <StaggerContainer className="divide-y divide-nvidia-gray-light" component="tbody">
              {filteredFiles.map((file, index) => (
                <StaggerItem key={file.id} component="tr">
                  <tr
                    className={`group hover:bg-nvidia-gray/50 transition-colors cursor-pointer ${selectedFiles.includes(file.path) ? 'bg-nvidia-green/10' : ''
                      }`}
                    onClick={(e) => onFileClick(e, file, index)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectedFiles.includes(file.path)
                            ? deselectFile(file.path)
                            : selectFile(file.path);
                        }}
                        className={`p-1 rounded transition-colors ${selectedFiles.includes(file.path) ? 'text-nvidia-green' : 'text-nvidia-text-secondary opacity-0 group-hover:opacity-100'
                          }`}
                      >
                        {selectedFiles.includes(file.path) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-nvidia-gray group-hover:bg-nvidia-gray-light transition-colors">
                          {getFileIcon(file)}
                        </div>
                        <span className="font-semibold text-nvidia-white group-hover:text-nvidia-green transition-colors">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {file.category ? (
                        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-tight rounded-full bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/20">
                          {file.category}
                        </span>
                      ) : (
                        <span className="text-xs text-nvidia-gray-light">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-nvidia-text-secondary">
                      {file.isDirectory ? '--' : formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-nvidia-text-secondary">
                      {formatDate(file.modifiedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => handleContextMenu(e, file)}
                        className="p-2 rounded-lg hover:bg-nvidia-gray opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-nvidia-text-secondary" />
                      </button>
                    </td>
                  </tr>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </table>
        ) : (
          <StaggerContainer className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredFiles.map((file, index) => (
              <StaggerItem key={file.id}>
                <div
                  className={`nvidia-card p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(118,185,0,0.15)] group relative ${selectedFiles.includes(file.path) ? 'border-nvidia-green bg-nvidia-green/10 ring-1 ring-nvidia-green' : 'border-nvidia-gray-light'
                    }`}
                  onClick={(e) => onFileClick(e, file, index)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectedFiles.includes(file.path)
                          ? deselectFile(file.path)
                          : selectFile(file.path);
                      }}
                      className={`p-1 rounded transition-colors ${selectedFiles.includes(file.path) ? 'text-nvidia-green' : 'text-nvidia-text-secondary opacity-0 group-hover:opacity-100'
                        }`}
                    >
                      {selectedFiles.includes(file.path) ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-center mb-4 pt-2">
                    <div className="p-4 rounded-xl bg-nvidia-gray group-hover:bg-nvidia-gray-light transition-all duration-300">
                      {getFileIcon(file)}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-center truncate mb-1 group-hover:text-nvidia-green transition-colors">{file.name}</p>
                  <p className="text-[10px] text-nvidia-text-secondary text-center font-medium uppercase tracking-wider">
                    {file.isDirectory ? 'Folder' : formatFileSize(file.size)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type="danger"
          confirmLabel="Delete"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Properties Modal */}
      {propertiesFile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="nvidia-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">File Properties</h2>
              <button onClick={() => setPropertiesFile(null)} className="p-1 rounded hover:bg-nvidia-gray">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-nvidia-gray-light">
                <span className="text-nvidia-text-secondary">Name</span>
                <span className="font-medium">{propertiesFile.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-nvidia-gray-light">
                <span className="text-nvidia-text-secondary">Path</span>
                <span className="font-medium truncate max-w-[250px]">{propertiesFile.path}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-nvidia-gray-light">
                <span className="text-nvidia-text-secondary">Type</span>
                <span className="font-medium">{propertiesFile.isDirectory ? 'Directory' : (propertiesFile.extension?.toUpperCase() || 'Unknown')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-nvidia-gray-light">
                <span className="text-nvidia-text-secondary">Size</span>
                <span className="font-medium">{propertiesFile.isDirectory ? '--' : formatFileSize(propertiesFile.size)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-nvidia-gray-light">
                <span className="text-nvidia-text-secondary">Modified</span>
                <span className="font-medium">{formatDate(propertiesFile.modifiedAt)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-nvidia-text-secondary">Created</span>
                <span className="font-medium">{formatDate(propertiesFile.createdAt)}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setPropertiesFile(null)} className="nvidia-button-secondary px-6 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organize Modal */}
      {showOrganizeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="nvidia-card w-full max-w-xl p-8 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 pointer-events-none">
              <GlowEffect intensity="high" color="#76b900" className="w-40 h-40 rounded-full" >
                <div />
              </GlowEffect>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-nvidia-green/20 text-nvidia-green shadow-[0_0_20px_rgba(118,185,0,0.2)]">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-nvidia-white">AI Organization</h2>
                <p className="text-nvidia-text-secondary text-sm">Powered by NVIDIA Nemotron-3</p>
              </div>
            </div>

            <p className="text-nvidia-text-secondary mb-8 text-lg">
              Let Nemotron-3 analyze and organize your files intelligently based on their actual content and purpose.
            </p>

            <div className="space-y-4 mb-8">
              <label className="flex items-start gap-4 p-4 rounded-xl border border-nvidia-gray-light hover:border-nvidia-green hover:bg-nvidia-green/5 cursor-pointer transition-all group">
                <div className="mt-1">
                  <div className="w-5 h-5 rounded-full border-2 border-nvidia-gray-light group-hover:border-nvidia-green flex items-center justify-center p-1">
                    <div className="w-full h-full rounded-full bg-nvidia-green opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-nvidia-white">Semantic Content Analysis</p>
                  <p className="text-sm text-nvidia-text-secondary">Groups files by deep understanding of topics, technical areas, and project relevance.</p>
                </div>
              </label>

              <label className="flex items-start gap-4 p-4 rounded-xl border border-nvidia-gray-light hover:border-nvidia-green hover:bg-nvidia-green/5 cursor-pointer transition-all group">
                <div className="mt-1">
                  <div className="w-5 h-5 rounded-full border-2 border-nvidia-gray-light flex items-center justify-center p-1">
                    <div className="w-full h-full rounded-full bg-nvidia-green opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-nvidia-white">Project-Based Synthesis</p>
                  <p className="text-sm text-nvidia-text-secondary">Identifies code, assets, and documentation belonging to the same project or repository.</p>
                </div>
              </label>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t border-nvidia-gray-light">
              <button
                onClick={() => setShowOrganizeModal(false)}
                className="nvidia-button-secondary py-3 px-6"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleStartOrganize()}
                disabled={isOrganizing}
                className="nvidia-button flex items-center gap-2 py-3 px-8 text-lg"
              >
                <Zap className="w-5 h-5" />
                {isOrganizing ? 'Starting...' : 'Start AI Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
