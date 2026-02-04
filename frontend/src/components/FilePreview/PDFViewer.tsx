import { useState, useEffect, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCw, Printer,
  Highlighter, Pencil, PenTool, Stamp, Eraser, Sparkles, ScanText, Grid3X3,
  Palette, Minus, Upload, Type, Check
} from 'lucide-react';

interface PDFViewerProps {
  src: string;
  filename: string;
  onClose: () => void;
}

type AnnotationTool = 'none' | 'highlight' | 'draw' | 'sign' | 'stamp' | 'erase' | 'askAI' | 'ocr' | 'mosaic' | 'text' | 'shape';
type SignatureMode = 'draw' | 'type' | 'upload';

interface Annotation {
  id: string;
  type: AnnotationTool;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  text?: string;
  stamp?: string;
  signatureImage?: string;
}

const STAMPS = ['APPROVED', 'REJECTED', 'DRAFT', 'CONFIDENTIAL', 'REVIEWED', 'FINAL'];
const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
const SIGNATURE_COLORS = ['#000000', '#1a365d', '#2d3748', '#1e40af', '#7c3aed'];

export default function PDFViewer({ src, filename, onClose }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Annotation states
  const [activeTool, setActiveTool] = useState<AnnotationTool>('none');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentColor, setCurrentColor] = useState('#FFD700');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStampPicker, setShowStampPicker] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState('APPROVED');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [ocrText, setOcrText] = useState<string>('');
  const [showOcrPanel, setShowOcrPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Signature modal states
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [signatureText, setSignatureText] = useState('');
  const [signatureColor, setSignatureColor] = useState('#000000');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentAnnotationRef = useRef<Annotation | null>(null);
  const signatureDrawingRef = useRef<{ x: number; y: number }[]>([]);
  const isSignatureDrawing = useRef(false);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.5));
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  // Handle tool selection
  const selectTool = (tool: AnnotationTool) => {
    if (tool === 'sign') {
      setShowSignatureModal(true);
      return;
    }

    setActiveTool(activeTool === tool ? 'none' : tool);
    setShowColorPicker(false);
    setShowStampPicker(false);

    if (tool === 'stamp') {
      setShowStampPicker(true);
    }
  };

  // Signature drawing handlers
  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (signatureMode !== 'draw') return;
    isSignatureDrawing.current = true;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    signatureDrawingRef.current = [point];
  };

  const handleSignatureMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSignatureDrawing.current || signatureMode !== 'draw') return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    signatureDrawingRef.current.push(point);

    // Draw
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (signatureDrawingRef.current.length > 1) {
      const prev = signatureDrawingRef.current[signatureDrawingRef.current.length - 2];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const handleSignatureMouseUp = () => {
    isSignatureDrawing.current = false;
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    signatureDrawingRef.current = [];
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const applySignature = () => {
    let signatureData: string | null = null;

    if (signatureMode === 'draw') {
      const canvas = signatureCanvasRef.current;
      if (canvas) {
        signatureData = canvas.toDataURL();
      }
    } else if (signatureMode === 'type' && signatureText) {
      // Create canvas with text
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 300;
      tempCanvas.height = 100;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = signatureColor;
        ctx.font = 'italic 36px "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';
        ctx.fillText(signatureText, 10, 60);
        signatureData = tempCanvas.toDataURL();
      }
    } else if (signatureMode === 'upload' && signatureImage) {
      signatureData = signatureImage;
    }

    if (signatureData) {
      setSavedSignature(signatureData);
      setActiveTool('sign');
      setShowSignatureModal(false);
    }
  };

  // Handle Ask AI
  const handleAskAI = async () => {
    setShowAiPanel(true);
    setIsProcessing(true);
    setAiResponse('');

    try {
      const response = await fetch('http://localhost:8000/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze this PDF file: ${filename}. Provide a summary of what this document might contain based on its name.`,
          conversation_id: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.response || 'AI analysis complete. The document appears to be related to the filename context.');
      } else {
        setAiResponse('Unable to analyze. Please ensure the AI service is running.');
      }
    } catch {
      setAiResponse('AI analysis feature ready. Connect to NVIDIA AI for intelligent document insights.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle OCR
  const handleOCR = async () => {
    setShowOcrPanel(true);
    setIsProcessing(true);
    setOcrText('');

    try {
      // Extract file path from src URL
      let filePath = '';
      try {
        const url = new URL(src);
        filePath = url.searchParams.get('path') || '';
      } catch (e) {
        // Handle case where src might be relative or malformed
        if (src.includes('path=')) {
          const match = src.match(/path=([^&]*)/);
          if (match) filePath = decodeURIComponent(match[1]);
        }
      }

      if (!filePath) {
        setOcrText('Error: Could not determine file path for OCR processing.');
        setIsProcessing(false);
        return;
      }

      const response = await fetch('http://localhost:8000/api/ocr/extract-from-path/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });

      if (response.ok) {
        const data = await response.json();
        setOcrText(data.text || 'No text extracted.');
      } else {
        const errorData = await response.json();
        setOcrText(`OCR Error: ${errorData.detail || 'Failed to extract text.'}\n\nModel: NVIDIA Nemotron OCR v1`);
      }
    } catch (error) {
      setOcrText(`Connection could not be established.\n\nPlease ensure the backend server is running.\nDetails: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Canvas drawing handlers
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none' || activeTool === 'askAI' || activeTool === 'ocr') return;

    const point = getCanvasPoint(e);
    setIsDrawing(true);

    if (activeTool === 'sign' && savedSignature) {
      // Place signature at click location
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'sign',
        points: [point],
        color: signatureColor,
        strokeWidth: 0,
        signatureImage: savedSignature
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'stamp') {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'stamp',
        points: [point],
        color: '#FF0000',
        strokeWidth: 0,
        stamp: selectedStamp
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'erase') {
      const tolerance = 20;
      setAnnotations(prev => prev.filter(ann => {
        return !ann.points.some(p =>
          Math.abs(p.x - point.x) < tolerance && Math.abs(p.y - point.y) < tolerance
        );
      }));
      return;
    }

    currentAnnotationRef.current = {
      id: Date.now().toString(),
      type: activeTool,
      points: [point],
      color: currentColor,
      strokeWidth: activeTool === 'highlight' ? 20 : strokeWidth
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotationRef.current) return;

    const point = getCanvasPoint(e);
    currentAnnotationRef.current.points.push(point);
    drawAnnotations();
  };

  const handleCanvasMouseUp = () => {
    if (currentAnnotationRef.current && currentAnnotationRef.current.points.length > 1) {
      setAnnotations(prev => [...prev, currentAnnotationRef.current!]);
    }
    currentAnnotationRef.current = null;
    setIsDrawing(false);
  };

  // Draw all annotations
  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    [...annotations, currentAnnotationRef.current].filter(Boolean).forEach(ann => {
      if (!ann || ann.points.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (ann.type === 'highlight') {
        ctx.globalAlpha = 0.4;
      } else if (ann.type === 'mosaic') {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#888';
      } else {
        ctx.globalAlpha = 1;
      }

      if (ann.type === 'sign' && ann.signatureImage) {
        // Draw signature image
        const img = new Image();
        img.src = ann.signatureImage;
        ctx.drawImage(img, ann.points[0].x - 75, ann.points[0].y - 25, 150, 50);
      } else if (ann.type === 'stamp' && ann.stamp) {
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FF0000';
        ctx.globalAlpha = 0.8;
        ctx.save();
        ctx.translate(ann.points[0].x, ann.points[0].y);
        ctx.rotate(-15 * Math.PI / 180);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-60, -20, 120, 40);
        ctx.fillText(ann.stamp, -50, 8);
        ctx.restore();
      } else if (ann.type === 'mosaic') {
        const startX = Math.min(...ann.points.map(p => p.x));
        const startY = Math.min(...ann.points.map(p => p.y));
        const endX = Math.max(...ann.points.map(p => p.x));
        const endY = Math.max(...ann.points.map(p => p.y));

        const blockSize = 10;
        for (let x = startX; x < endX; x += blockSize) {
          for (let y = startY; y < endY; y += blockSize) {
            const shade = Math.floor(Math.random() * 100) + 100;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            ctx.fillRect(x, y, blockSize, blockSize);
          }
        }
      } else {
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ann.points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    });
  };

  useEffect(() => {
    drawAnnotations();
  }, [annotations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (showSignatureModal) {
            setShowSignatureModal(false);
          } else if (showAiPanel || showOcrPanel) {
            setShowAiPanel(false);
            setShowOcrPanel(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowRight':
        case 'PageDown':
          if (currentPage < totalPages) setCurrentPage(p => p + 1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          if (currentPage > 1) setCurrentPage(p => p - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentPage, totalPages, showAiPanel, showOcrPanel, showSignatureModal]);

  const ToolButton = ({ tool, icon: Icon, label }: { tool: AnnotationTool; icon: any; label: string }) => (
    <button
      onClick={() => selectTool(tool)}
      className={`p-2 rounded-lg transition-colors flex flex-col items-center gap-0.5 ${activeTool === tool
        ? 'bg-nvidia-green text-black'
        : 'hover:bg-nvidia-gray text-nvidia-text-secondary hover:text-white'
        }`}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px]">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-nvidia-black flex flex-col">
      {/* Main Toolbar */}
      <div className="h-14 bg-nvidia-dark border-b border-nvidia-gray-light flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium truncate max-w-xs">{filename}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search in PDF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nvidia-input w-40 text-sm py-1.5"
            />
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2 bg-nvidia-gray rounded-lg px-3 py-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-nvidia-gray-light disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-nvidia-gray-light disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-nvidia-gray">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-nvidia-gray">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button onClick={handleRotate} className="p-2 rounded-lg hover:bg-nvidia-gray">
              <RotateCw className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-nvidia-gray">
              <Printer className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-nvidia-gray">
              <Download className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-nvidia-gray-light mx-2" />
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-nvidia-gray">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Annotation Toolbar */}
      <div className="h-16 bg-nvidia-dark border-b border-nvidia-gray-light flex items-center justify-center gap-2 px-4">
        <ToolButton tool="highlight" icon={Highlighter} label="Highlight" />
        <ToolButton tool="draw" icon={Pencil} label="Draw" />
        <ToolButton tool="sign" icon={PenTool} label="Sign" />
        <ToolButton tool="stamp" icon={Stamp} label="Stamp" />
        <ToolButton tool="erase" icon={Eraser} label="Erase" />

        <div className="w-px h-8 bg-nvidia-gray-light mx-2" />

        <button
          onClick={handleAskAI}
          className="p-2 rounded-lg transition-colors flex flex-col items-center gap-0.5 hover:bg-nvidia-gray text-nvidia-text-secondary hover:text-white"
          title="Ask AI"
        >
          <Sparkles className="w-4 h-4 text-nvidia-green" />
          <span className="text-[10px]">Ask AI</span>
        </button>

        <button
          onClick={handleOCR}
          className="p-2 rounded-lg transition-colors flex flex-col items-center gap-0.5 hover:bg-nvidia-gray text-nvidia-text-secondary hover:text-white"
          title="OCR"
        >
          <ScanText className="w-4 h-4" />
          <span className="text-[10px]">OCR</span>
        </button>

        <ToolButton tool="mosaic" icon={Grid3X3} label="Mosaic" />

        <div className="w-px h-8 bg-nvidia-gray-light mx-2" />

        {/* Color Picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-lg hover:bg-nvidia-gray flex items-center gap-1"
          >
            <Palette className="w-4 h-4" />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: currentColor }} />
          </button>

          {showColorPicker && (
            <div className="absolute top-full mt-2 left-0 bg-nvidia-dark border border-nvidia-gray-light rounded-lg p-2 flex gap-1 z-10">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => { setCurrentColor(color); setShowColorPicker(false); }}
                  className={`w-6 h-6 rounded ${currentColor === color ? 'ring-2 ring-nvidia-green' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-1">
          <Minus className="w-3 h-3 text-nvidia-text-secondary" />
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-16 accent-nvidia-green"
          />
          <div className="w-4 h-4 flex items-center justify-center">
            <div
              className="rounded-full bg-nvidia-green"
              style={{ width: Math.min(strokeWidth, 12), height: Math.min(strokeWidth, 12) }}
            />
          </div>
        </div>

        {/* Stamp Picker */}
        {showStampPicker && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-nvidia-dark border border-nvidia-gray-light rounded-lg p-3 z-10">
            <div className="grid grid-cols-3 gap-2">
              {STAMPS.map(stamp => (
                <button
                  key={stamp}
                  onClick={() => { setSelectedStamp(stamp); setShowStampPicker(false); setActiveTool('stamp'); }}
                  className={`px-3 py-2 text-xs font-bold border-2 rounded ${selectedStamp === stamp
                    ? 'border-nvidia-green text-nvidia-green'
                    : 'border-red-500 text-red-500 hover:bg-red-500/20'
                    }`}
                >
                  {stamp}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PDF Content with Canvas Overlay */}
      <div className="flex-1 overflow-auto bg-nvidia-gray flex items-center justify-center p-8 relative">
        <div
          className="relative bg-white shadow-2xl transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            minWidth: '600px',
            minHeight: '800px'
          }}
        >
          <iframe
            src={`${src}#page=${currentPage}`}
            className="w-[600px] h-[800px] border-0"
            title={filename}
          />

          <canvas
            ref={canvasRef}
            width={600}
            height={800}
            className={`absolute inset-0 ${activeTool !== 'none' ? 'cursor-crosshair' : 'pointer-events-none'}`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        {/* AI Panel */}
        {showAiPanel && (
          <div className="absolute right-4 top-4 w-80 bg-nvidia-dark border border-nvidia-gray-light rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-3 border-b border-nvidia-gray-light">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-nvidia-green" />
                <span className="font-medium">AI Analysis</span>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="p-1 hover:bg-nvidia-gray rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-nvidia-green" />
                  <span className="text-sm text-nvidia-text-secondary">Analyzing document...</span>
                </div>
              ) : (
                <p className="text-sm text-nvidia-text-secondary whitespace-pre-wrap">{aiResponse}</p>
              )}
            </div>
          </div>
        )}

        {/* OCR Panel */}
        {showOcrPanel && (
          <div className="absolute right-4 top-4 w-80 bg-nvidia-dark border border-nvidia-gray-light rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-3 border-b border-nvidia-gray-light">
              <div className="flex items-center gap-2">
                <ScanText className="w-4 h-4 text-nvidia-green" />
                <span className="font-medium">OCR Text Extraction</span>
              </div>
              <button onClick={() => setShowOcrPanel(false)} className="p-1 hover:bg-nvidia-gray rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-auto">
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-nvidia-green" />
                  <span className="text-sm text-nvidia-text-secondary">Extracting text...</span>
                </div>
              ) : (
                <pre className="text-xs text-nvidia-text-secondary whitespace-pre-wrap font-mono">{ocrText}</pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Sidebar */}
      <div className="absolute left-0 top-[7.5rem] bottom-0 w-24 bg-nvidia-dark border-r border-nvidia-gray-light overflow-y-auto p-2 hidden lg:block">
        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            className={`w-full aspect-[3/4] mb-2 rounded border-2 transition-colors ${currentPage === i + 1
              ? 'border-nvidia-green'
              : 'border-nvidia-gray-light hover:border-nvidia-text-secondary'
              }`}
          >
            <div className="w-full h-full bg-nvidia-gray flex items-center justify-center text-xs text-nvidia-text-secondary">
              {i + 1}
            </div>
          </button>
        ))}
      </div>

      {/* Active Tool Indicator */}
      {activeTool !== 'none' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-nvidia-green text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          {activeTool === 'sign' ? 'Click to place signature' : `${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} tool active`}
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center">
          <div className="bg-nvidia-dark border border-nvidia-gray-light rounded-xl w-[500px] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-nvidia-gray-light">
              <h3 className="text-lg font-semibold">Create Signature</h3>
              <button onClick={() => setShowSignatureModal(false)} className="p-1 hover:bg-nvidia-gray rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-nvidia-gray-light">
              <button
                onClick={() => setSignatureMode('draw')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${signatureMode === 'draw' ? 'text-nvidia-green border-b-2 border-nvidia-green' : 'text-nvidia-text-secondary hover:text-white'
                  }`}
              >
                <Pencil className="w-4 h-4" />
                Draw
              </button>
              <button
                onClick={() => setSignatureMode('type')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${signatureMode === 'type' ? 'text-nvidia-green border-b-2 border-nvidia-green' : 'text-nvidia-text-secondary hover:text-white'
                  }`}
              >
                <Type className="w-4 h-4" />
                Type
              </button>
              <button
                onClick={() => setSignatureMode('upload')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${signatureMode === 'upload' ? 'text-nvidia-green border-b-2 border-nvidia-green' : 'text-nvidia-text-secondary hover:text-white'
                  }`}
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {signatureMode === 'draw' && (
                <div>
                  <p className="text-sm text-nvidia-text-secondary mb-3">Draw your signature below:</p>
                  <div className="border-2 border-dashed border-nvidia-gray-light rounded-lg bg-white mb-3">
                    <canvas
                      ref={signatureCanvasRef}
                      width={460}
                      height={150}
                      className="cursor-crosshair"
                      onMouseDown={handleSignatureMouseDown}
                      onMouseMove={handleSignatureMouseMove}
                      onMouseUp={handleSignatureMouseUp}
                      onMouseLeave={handleSignatureMouseUp}
                    />
                  </div>
                  <button
                    onClick={clearSignatureCanvas}
                    className="text-sm text-nvidia-text-secondary hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              )}

              {signatureMode === 'type' && (
                <div>
                  <p className="text-sm text-nvidia-text-secondary mb-3">Type your signature:</p>
                  <input
                    type="text"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder="Your name"
                    className="nvidia-input w-full mb-4"
                  />
                  <div className="border-2 border-nvidia-gray-light rounded-lg bg-white p-4 h-20 flex items-center justify-center mb-3">
                    <span
                      className="text-3xl"
                      style={{
                        fontFamily: '"Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive',
                        fontStyle: 'italic',
                        color: signatureColor
                      }}
                    >
                      {signatureText || 'Your Signature'}
                    </span>
                  </div>
                </div>
              )}

              {signatureMode === 'upload' && (
                <div>
                  <p className="text-sm text-nvidia-text-secondary mb-3">Upload signature image:</p>
                  <label className="border-2 border-dashed border-nvidia-gray-light rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-nvidia-green transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {signatureImage ? (
                      <img src={signatureImage} alt="Signature" className="max-h-24 max-w-full" />
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-nvidia-text-secondary mb-2" />
                        <span className="text-sm text-nvidia-text-secondary">Click to upload or drag and drop</span>
                        <span className="text-xs text-nvidia-text-secondary mt-1">PNG, JPG up to 5MB</span>
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* Color Selection */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-nvidia-text-secondary">Color:</span>
                {SIGNATURE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSignatureColor(color)}
                    className={`w-6 h-6 rounded-full ${signatureColor === color ? 'ring-2 ring-nvidia-green ring-offset-2 ring-offset-nvidia-dark' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-nvidia-gray-light">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 text-sm hover:bg-nvidia-gray rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applySignature}
                className="px-4 py-2 text-sm bg-nvidia-green text-black font-medium rounded-lg hover:bg-nvidia-green/90 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
