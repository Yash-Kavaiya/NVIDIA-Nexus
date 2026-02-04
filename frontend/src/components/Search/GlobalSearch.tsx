import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, File, Folder, Filter, ChevronRight } from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length > 2) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = (searchQuery: string) => {
    const mockResults = [
      { type: 'file', name: 'document.pdf', path: '/documents', size: '2.4 MB' },
      { type: 'file', name: 'script.js', path: '/code', size: '12 KB' },
      { type: 'folder', name: 'Projects', path: '/', itemCount: 24 },
    ].filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    setResults(mockResults);
  };

  const handleSelect = (result: any) => {
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    console.log('Selected:', result);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-nvidia-dark border border-nvidia-gray-light rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-nvidia-gray-light">
          <Search className="w-5 h-5 text-nvidia-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files, folders, or content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-lg"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded hover:bg-nvidia-gray">
              <X className="w-4 h-4 text-nvidia-text-secondary" />
            </button>
          )}
          <div className="flex items-center gap-1 text-xs text-nvidia-text-secondary bg-nvidia-gray px-2 py-1 rounded">
            <span>ESC</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-nvidia-gray-light bg-nvidia-gray/30">
          <Filter className="w-4 h-4 text-nvidia-text-secondary" />
          <button className="text-xs px-3 py-1 rounded-full bg-nvidia-green text-nvidia-black font-medium">
            All
          </button>
          <button className="text-xs px-3 py-1 rounded-full bg-nvidia-gray hover:bg-nvidia-gray-light text-nvidia-text-secondary transition-colors">
            Files
          </button>
          <button className="text-xs px-3 py-1 rounded-full bg-nvidia-gray hover:bg-nvidia-gray-light text-nvidia-text-secondary transition-colors">
            Folders
          </button>
          <button className="text-xs px-3 py-1 rounded-full bg-nvidia-gray hover:bg-nvidia-gray-light text-nvidia-text-secondary transition-colors">
            Recent
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length > 2 && results.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-nvidia-text-secondary uppercase tracking-wider px-3 py-2">
                Results ({results.length})
              </div>
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    index === selectedIndex ? 'bg-nvidia-green/10 border border-nvidia-green/30' : 'hover:bg-nvidia-gray'
                  }`}
                >
                  {result.type === 'folder' ? (
                    <Folder className="w-5 h-5 text-nvidia-green" />
                  ) : (
                    <File className="w-5 h-5 text-nvidia-text-secondary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.name}</p>
                    <p className="text-xs text-nvidia-text-secondary">
                      {result.path} • {result.type === 'folder' ? `${result.itemCount} items` : result.size}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-nvidia-text-secondary" />
                </button>
              ))}
            </div>
          )}

          {query.length > 2 && results.length === 0 && (
            <div className="p-8 text-center text-nvidia-text-secondary">
              <p>No results found for &quot;{query}&quot;</p>
              <p className="text-sm mt-1">Try different keywords or check your spelling</p>
            </div>
          )}

          {query.length <= 2 && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-nvidia-text-secondary uppercase tracking-wider px-3 py-2">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(search)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-nvidia-gray transition-colors"
                >
                  <Clock className="w-4 h-4 text-nvidia-text-secondary" />
                  <span className="text-sm">{search}</span>
                </button>
              ))}
            </div>
          )}

          {query.length <= 2 && recentSearches.length === 0 && (
            <div className="p-8 text-center text-nvidia-text-secondary">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Start typing to search</p>
              <p className="text-sm mt-1">Search by filename, content, or folder name</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-nvidia-gray-light text-xs text-nvidia-text-secondary">
          <div className="flex items-center gap-4">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <span>NVIDIA Nexus Search</span>
        </div>
      </div>
    </div>
  );
}
