import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { chatApi } from '../services/api';
import {
  Send, Paperclip, Sparkles, Bot, User, Loader2,
  Plus, Trash2, MessageSquare, X
} from 'lucide-react';
import type { Message, Conversation } from '../types';

export default function Chat() {
  const {
    messages, isLoadingChat, addMessage, setMessages,
    setChatLoading, addToast, clearChat
  } = useStore();
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await chatApi.getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail - conversations sidebar just stays empty
    } finally {
      setLoadingConversations(false);
    }
  };

  const switchConversation = async (conv: Conversation) => {
    try {
      const data = await chatApi.getConversation(conv.id);
      const msgs: Message[] = (data.messages || []).map((m: Record<string, string>) => ({
        id: m.id || crypto.randomUUID(),
        role: m.role || 'user',
        content: m.content || '',
        timestamp: m.created_at || m.timestamp || new Date().toISOString(),
      }));
      setMessages(msgs);
      setConversationId(conv.id);
    } catch {
      addToast('error', 'Failed to load conversation');
    }
  };

  const handleNewChat = () => {
    clearChat();
    setConversationId(null);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        handleNewChat();
      }
      addToast('success', 'Conversation deleted');
    } catch {
      addToast('error', 'Failed to delete conversation');
    }
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoadingChat) return;

    setInput('');

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);
    setChatLoading(true);

    try {
      const response = await chatApi.sendMessage({
        message: trimmedInput,
        conversation_id: conversationId ?? undefined,
        files: attachedFiles.length > 0 ? attachedFiles.map((f) => f.name) : undefined,
      });

      if (response.conversation_id) {
        setConversationId(response.conversation_id);
        // Refresh conversation list to show new conversation
        loadConversations();
      }

      const assistantMessage: Message = {
        id: response.message_id || crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMessage);
      setAttachedFiles([]);
    } catch {
      addToast('error', 'Failed to send message. Please check if the backend is running.');
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full flex">
      {/* Conversation Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-nvidia-gray-light flex flex-col">
        <div className="p-3 border-b border-nvidia-gray-light">
          <button
            onClick={handleNewChat}
            className="nvidia-button w-full flex items-center justify-center gap-2 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-center text-nvidia-text-secondary text-sm">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-nvidia-text-secondary text-sm">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => switchConversation(conv)}
                className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-nvidia-gray transition-colors ${
                  conversationId === conv.id ? 'bg-nvidia-gray border-l-2 border-nvidia-green' : ''
                }`}
              >
                <MessageSquare className="w-4 h-4 text-nvidia-text-secondary flex-shrink-0" />
                <span className="text-sm truncate flex-1">
                  {conv.title || 'Untitled Chat'}
                </span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-nvidia-gray-light">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-nvidia-green/10">
              <Bot className="w-5 h-5 text-nvidia-green" />
            </div>
            <div>
              <h1 className="font-semibold">NVIDIA Nemotron-3</h1>
              <p className="text-xs text-nvidia-text-secondary">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-nvidia-text-secondary">
            <div className="w-2 h-2 rounded-full bg-nvidia-green animate-pulse" />
            Online
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-nvidia-green/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-nvidia-green" />
              </div>
              <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
              <p className="text-nvidia-text-secondary max-w-md">
                I can help you organize files, analyze documents, generate reports,
                or answer questions about your data.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-nvidia-green/20' : 'bg-nvidia-gray-light'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-nvidia-green" />
                    ) : (
                      <Bot className="w-4 h-4 text-nvidia-text-secondary" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-nvidia-green text-black'
                        : 'bg-nvidia-gray-light text-nvidia-text-primary'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-black/60' : 'text-nvidia-text-secondary'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoadingChat && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nvidia-gray-light flex items-center justify-center">
                    <Bot className="w-4 h-4 text-nvidia-text-secondary" />
                  </div>
                  <div className="bg-nvidia-gray-light rounded-lg px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-nvidia-green" />
                    <span className="text-nvidia-text-secondary">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Attached files chips */}
        {attachedFiles.length > 0 && (
          <div className="px-4 flex flex-wrap gap-2">
            {attachedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-2 py-1 bg-nvidia-gray rounded text-xs text-nvidia-text-secondary"
              >
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removeAttachment(i)} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-nvidia-gray-light">
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-lg hover:bg-nvidia-gray transition-colors text-nvidia-text-secondary"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="nvidia-input w-full resize-none py-3"
              rows={1}
              disabled={isLoadingChat}
            />
            <button
              onClick={handleSend}
              disabled={isLoadingChat || !input.trim()}
              className="nvidia-button p-3 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
