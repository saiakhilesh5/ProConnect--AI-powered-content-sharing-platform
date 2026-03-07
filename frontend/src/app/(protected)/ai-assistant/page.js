"use client";
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Loader2, 
  Sparkles, 
  Bot, 
  User,
  TrendingUp,
  ImageIcon,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "Why isn't my post trending?", label: "Trending Help" },
  { icon: ImageIcon, text: "How can I improve my image engagement?", label: "Engagement Tips" },
  { icon: Lightbulb, text: "Suggest captions for my latest image", label: "Caption Ideas" },
  { icon: Sparkles, text: "What are the trending topics right now?", label: "Trending Topics" },
];

const AIAssistantPage = () => {
  const api = useApi();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! 👋 I'm your ProConnect AI Assistant. I can help you with:\n\n• Understanding your image performance\n• Tips to improve engagement\n• Caption suggestions\n• Explaining trending content\n\nHow can I assist you today?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    setInputMessage('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.post('/api/images/ai-chat', {
        message: userMessage,
      });

      if (response.data?.data?.reply) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.data.reply 
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I'm having trouble right now. Please try again in a moment. 🙏" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleQuickPrompt = (prompt) => {
    sendMessage(prompt);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! 👋 I'm your ProConnect AI Assistant. I can help you with:\n\n• Understanding your image performance\n• Tips to improve engagement\n• Caption suggestions\n• Explaining trending content\n\nHow can I assist you today?"
      }
    ]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              AI Assistant
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </h1>
            <p className="text-sm text-muted-foreground">Powered by Gemini AI</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4 mr-2" />
          Clear Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-primary' 
                  : 'bg-gradient-to-r from-primary to-accent'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                message.role === 'user'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-card border border-border text-foreground rounded-bl-md'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts - Show only at start */}
      {messages.length <= 1 && (
        <div className="px-4 md:px-6 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground mb-3">Quick questions:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {QUICK_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPrompt(prompt.text)}
                  className="flex items-center gap-2 p-3 bg-card border border-border hover:bg-muted rounded-xl text-left transition-colors"
                >
                  <prompt.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-muted-foreground line-clamp-1">{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 md:p-6 border-t border-border bg-card/50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about your content..."
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isLoading}
              maxLength={500}
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIAssistantPage;
