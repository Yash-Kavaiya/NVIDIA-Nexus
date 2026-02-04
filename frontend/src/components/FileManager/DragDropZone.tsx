import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface DragDropZoneProps {
  onDrop: (files: File[]) => void;
  isDragActive?: boolean;
}

export default function DragDropZone({ onDrop, isDragActive: externalDragActive }: DragDropZoneProps) {
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    onDrop(acceptedFiles);
  }, [onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    noClick: true,
  });

  const active = externalDragActive || isDragActive;

  return (
    <div
      {...getRootProps()}
      className={`
        absolute inset-0 z-40 flex items-center justify-center
        transition-all duration-300 pointer-events-none
        ${active ? 'opacity-100 pointer-events-auto' : 'opacity-0'}
      `}
    >
      <input {...getInputProps()} />

      <div className={`
        w-full h-full flex items-center justify-center
        bg-nvidia-black/80 backdrop-blur-sm
        border-4 border-dashed rounded-lg
        transition-all duration-300
        ${active ? 'border-nvidia-green bg-nvidia-green/10' : 'border-transparent'}
      `}>
        <div className="text-center">
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4
            transition-all duration-300
            ${active ? 'bg-nvidia-green/20 scale-110' : 'bg-nvidia-gray'}
          `}>
            <Upload className={`
              w-10 h-10 transition-all duration-300
              ${active ? 'text-nvidia-green' : 'text-nvidia-text-secondary'}
            `} />
          </div>

          <p className="text-xl font-semibold mb-2">
            {active ? 'Drop files here' : 'Drag & drop files'}
          </p>
          <p className="text-nvidia-text-secondary">
            {active ? 'Release to upload' : 'or click to browse'}
          </p>
        </div>
      </div>
    </div>
  );
}
