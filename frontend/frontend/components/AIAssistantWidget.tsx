import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, X, Send, Sparkles, Loader2, Shirt, 
  ChevronDown, HelpCircle, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import { getImageUrl } from '../pages/ProductList';
import { Product } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
}

const AIAssistantWidget: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to GENTWear! I am your premium AI Shopping Assistant. Ask me to find blazers, suits, or recommend items matching your taste."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Alert user of unread messages when widget is closed
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasUnread(true);
    }
  }, [messages, isOpen]);

  const handleOpenToggle = () => {
    setIsOpen(!isOpen);
    setHasUnread(false);
  };

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    // Clear input
    if (!textToSend) setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: messageText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data } = await api.post('/assistant', { messages: newMessages });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        products: data.products
      }]);
    } catch (err) {
      console.error('AI assistant widget chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I am experiencing issues communicating with my database. Please try again shortly.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const quickChips = [
    "Suggest a navy blue suit",
    "Show me casual shirts",
    "Blazers under $300"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      {/* Chat window panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[550px] bg-slate-950/90 backdrop-blur-2xl border border-slate-850 rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden animate-slideUp text-left">
          
          {/* Header Panel */}
          <div className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-slate-100 tracking-wider">AI Assistant</h3>
                <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> Online
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleOpenToggle}
              className="text-slate-450 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Flow Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-950/20">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1.5 animate-fadeIn`}
              >
                {/* Bubble Container */}
                <div 
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                      : 'bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Inline Product Cards */}
                {msg.products && msg.products.length > 0 && (
                  <div className="w-full mt-2 grid grid-cols-2 gap-3 pl-2">
                    {msg.products.map((prod) => {
                      const primaryImage = prod.images?.find(img => img.is_primary) || prod.images?.[0];
                      return (
                        <div 
                          key={prod.id}
                          onClick={() => { navigate(`/products/${prod.id}`); setIsOpen(false); }}
                          className="bg-slate-900 border border-slate-850 hover:border-indigo-500/40 rounded-xl overflow-hidden cursor-pointer group transition-all"
                        >
                          <div className="aspect-[4/5] bg-slate-950 overflow-hidden relative">
                            <img 
                              src={getImageUrl(primaryImage?.url)} 
                              alt={prod.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="p-2 text-[10px]">
                            <h4 className="font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                              {prod.name}
                            </h4>
                            <span className="font-extrabold text-slate-350 mt-0.5 block">
                              ${parseFloat(prod.price as any).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Pulsing loading response */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold pl-2">
                <Loader2 className="animate-spin text-indigo-400" size={13} />
                Assistant is typing...
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions chips */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 py-2 border-t border-slate-900/60 bg-slate-900/10 flex flex-wrap gap-2 justify-start">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-350 hover:text-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  {chip} <ArrowRight size={10} />
                </button>
              ))}
            </div>
          )}

          {/* Input control block */}
          <div className="p-3 bg-slate-900 border-t border-slate-850 flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Ask anything about sizing, fit, or style..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-45"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Bubble Button */}
      <button 
        onClick={handleOpenToggle}
        className={`w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 hover:scale-105 hover:rotate-3 transition-transform cursor-pointer relative group ${
          isOpen ? 'rotate-90' : ''
        }`}
      >
        {isOpen ? <ChevronDown size={22} /> : <MessageSquare size={22} />}
        
        {/* Sparkles indicator overlay */}
        <span className="absolute -top-1.5 -right-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-indigo-400 shadow-md group-hover:scale-115 transition-transform">
          <Sparkles size={11} className="animate-spin" style={{ animationDuration: '6s' }} />
        </span>

        {/* Unread indicator */}
        {hasUnread && !isOpen && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
        )}
      </button>

    </div>
  );
};

export default AIAssistantWidget;
