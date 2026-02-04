import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { X, Copy, Check, Download, FileCode, Search } from 'lucide-react';

interface CodeViewerProps {
  content: string;
  filename: string;
  language: string;
  onClose: () => void;
}

const languageMap: { [key: string]: string } = {
  'js': 'javascript',
  'ts': 'typescript',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'py': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'h': 'c',
  'cs': 'csharp',
  'go': 'go',
  'rs': 'rust',
  'rb': 'ruby',
  'php': 'php',
  'swift': 'swift',
  'kt': 'kotlin',
  'scala': 'scala',
  'r': 'r',
  'm': 'objective-c',
  'sql': 'sql',
  'html': 'html',
  'css': 'css',
  'scss': 'scss',
  'less': 'less',
  'json': 'json',
  'xml': 'xml',
  'yaml': 'yaml',
  'yml': 'yaml',
  'md': 'markdown',
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'ps1': 'powershell',
  'dockerfile': 'dockerfile',
  'vue': 'vue',
  'svelte': 'svelte',
  'astro': 'astro',
  'sol': 'solidity',
};

export default function CodeViewer({ content, filename, language, onClose }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);

  const detectedLanguage = languageMap[language.toLowerCase()] || language.toLowerCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showSearch]);

  return (
    <div className="fixed inset-0 z-50 bg-nvidia-black flex flex-col">
      {/* Toolbar */}
      <div className="h-14 bg-nvidia-dark border-b border-nvidia-gray-light flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <FileCode className="w-5 h-5 text-nvidia-green" />
          <span className="font-medium">{filename}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-nvidia-gray text-nvidia-text-secondary uppercase">
            {detectedLanguage}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-nvidia-green text-nvidia-black' : 'hover:bg-nvidia-gray'}`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Font Size */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="nvidia-input text-sm py-1.5 px-2"
          >
            <option value={12}>12px</option>
            <option value={14}>14px</option>
            <option value={16}>16px</option>
            <option value={18}>18px</option>
            <option value={20}>20px</option>
          </select>

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${wordWrap ? 'bg-nvidia-green text-nvidia-black' : 'hover:bg-nvidia-gray'}`}
          >
            Wrap
          </button>

          <div className="w-px h-6 bg-nvidia-gray-light mx-2" />

          <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            {copied ? <Check className="w-4 h-4 text-nvidia-green" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="h-12 bg-nvidia-gray border-b border-nvidia-gray-light flex items-center px-4 gap-3">
          <Search className="w-4 h-4 text-nvidia-text-secondary" />
          <input
            type="text"
            placeholder="Find in file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            autoFocus
          />
          <span className="text-xs text-nvidia-text-secondary">Ctrl+F</span>
        </div>
      )}

      {/* Code Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={detectedLanguage}
          value={content}
          theme="vs-dark"
          options={{
            readOnly: true,
            fontSize: fontSize,
            wordWrap: wordWrap ? 'on' : 'off',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            folding: true,
            foldingHighlight: true,
            showFoldingControls: 'always',
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="h-8 bg-nvidia-green text-nvidia-black flex items-center justify-between px-4 text-xs font-medium">
        <div className="flex items-center gap-4">
          <span>{detectedLanguage.toUpperCase()}</span>
          <span>UTF-8</span>
          <span>{content.split('\n').length} lines</span>
          <span>{content.length} characters</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Read-only</span>
          <span>Ln 1, Col 1</span>
        </div>
      </div>
    </div>
  );
}
