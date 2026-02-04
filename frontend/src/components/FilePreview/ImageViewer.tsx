import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export default function ImageViewer({ 
  src, 
  alt, 
  onClose, 
  onNext, 
  onPrev,
  hasNext,
  hasPrev 
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.25));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          if (hasNext && onNext) onNext();
          break;
        case 'ArrowLeft':
          if (hasPrev && onPrev) onPrev();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Toolbar */}
      <div className="h-14 bg-nvidia-dark border-b border-nvidia-gray-light flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-nvidia-text-secondary">{alt}</span>
          <span className="text-xs px-2 py-1 rounded bg-nvidia-gray text-nvidia-text-secondary">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            <ZoomOut className="w-5 h-5" />
          </button>
          <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleRotate} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            <RotateCw className="w-5 h-5" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors text-sm">
            Reset
          </button>
          <div className="w-px h-6 bg-nvidia-gray-light mx-2" />
          <button className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative flex items-center justify-center cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default'
          }}
          draggable={false}
        />

        {/* Navigation Arrows */}
        {hasPrev && (
          <button 
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-nvidia-dark/80 hover:bg-nvidia-dark border border-nvidia-gray-light transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button 
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-nvidia-dark/80 hover:bg-nvidia-dark border border-nvidia-gray-light transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-nvidia-text-secondary bg-nvidia-dark/80 px-4 py-2 rounded-full">
        Scroll to zoom • Drag to pan • Arrow keys to navigate • ESC to close
      </div>
    </div>
  );
}
