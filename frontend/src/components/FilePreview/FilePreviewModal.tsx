import { useState, useEffect } from 'react';
import { X, File } from 'lucide-react';
import ImageViewer from './ImageViewer';
import PDFViewer from './PDFViewer';
import CodeViewer from './CodeViewer';

interface FilePreviewModalProps {
  file: any;
  onClose: () => void;
}

export default function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load file content based on type
    const loadContent = async () => {
      try {
        if (!file.isDirectory) {
          // For text/code files, fetch content
          const textExtensions = ['txt', 'md', 'json', 'xml', 'csv', 'log'];
          const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php'];

          if (textExtensions.includes(file.extension) || codeExtensions.includes(file.extension)) {
            const response = await fetch(`http://localhost:8000/api/files/download/?path=${encodeURIComponent(file.path)}`);
            const text = await response.text();
            setContent(text);
          }
        }
      } catch (error) {
        console.error('Error loading file:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [file]);

  const getFileType = () => {
    const ext = file.extension?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return 'image';
    }
    if (['pdf'].includes(ext)) {
      return 'pdf';
    }
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
      return 'audio';
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'sql', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'sh'].includes(ext)) {
      return 'code';
    }
    if (['txt', 'md', 'csv', 'log'].includes(ext)) {
      return 'text';
    }

    return 'unknown';
  };

  const fileType = getFileType();

  // Render appropriate viewer based on file type
  switch (fileType) {
    case 'image':
      return (
        <ImageViewer
          src={`http://localhost:8000/api/files/download/?path=${encodeURIComponent(file.path)}`}
          alt={file.name}
          onClose={onClose}
        />
      );

    case 'pdf':
      return (
        <PDFViewer
          src={`http://localhost:8000/api/files/download/?path=${encodeURIComponent(file.path)}`}
          filename={file.name}
          onClose={onClose}
        />
      );

    case 'code':
    case 'text':
      if (loading) {
        return (
          <div className="fixed inset-0 z-50 bg-nvidia-black flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nvidia-green" />
          </div>
        );
      }
      return (
        <CodeViewer
          content={content}
          filename={file.name}
          language={file.extension}
          onClose={onClose}
        />
      );

    default:
      return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="nvidia-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">File Preview</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-nvidia-gray">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center py-8">
              <File className="w-16 h-16 text-nvidia-text-secondary mb-4" />
              <p className="text-lg font-medium mb-2">{file.name}</p>
              <p className="text-sm text-nvidia-text-secondary mb-6">
                Preview not available for this file type
              </p>
              <button className="nvidia-button">
                Download File
              </button>
            </div>
          </div>
        </div>
      );
  }
}
