import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { chatApi } from '../services/api';
import { Send, Paperclip, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import type { Message } from '../types';

export default function Chat() {
  const { messages, isLoadingChat, addMessage, setChatLoading, addToast } = useStore();
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoadingChat) return;

    // Clear input immediately
    setInput('');

    // Add user message to store
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    // Set loading state
    setChatLoading(true);

    try {
      // Call the backend API
      const response = await chatApi.sendMessage({
        message: trimmedInput,
        conversation_id: conversationId ?? undefined,
      });

      // Save conversation ID for future messages
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      // Add assistant response to store
      const assistantMessage: Message = {
        id: response.message_id || crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMessage);
    } catch (error) {
      console.error('Chat error:', error);
      addToast('error', 'Failed to send message. Please check if the backend is running.');

      // Add error message to chat
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-nvidia-gray-light">
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

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
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
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                    ? 'bg-nvidia-green/20'
                    : 'bg-nvidia-gray-light'
                    }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-nvidia-green" />
                  ) : (
                    <Bot className="w-4 h-4 text-nvidia-text-secondary" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${message.role === 'user'
                    ? 'bg-nvidia-green text-black'
                    : 'bg-nvidia-gray-light text-nvidia-text-primary'
                    }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${message.role === 'user' ? 'text-black/60' : 'text-nvidia-text-secondary'
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

      <div className="pt-4 border-t border-nvidia-gray-light">
        <div className="flex gap-3">
          <button className="p-3 rounded-lg hover:bg-nvidia-gray transition-colors text-nvidia-text-secondary">
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
  );
}
