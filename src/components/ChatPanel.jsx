import React, { useEffect, useRef, useState } from 'react';
import { Send, X, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const ChatPanel = ({ 
  isOpen, 
  onClose, 
  messages = [], 
  onSendMessage, 
  currentUserId, 
  sending, 
  loading 
}) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages change or panel opens
  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const success = await onSendMessage(inputText);
    if (success) {
      setInputText('');
    }
  };

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full md:w-[350px] bg-slate-950 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white">Chat de Consulta</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 h-full bg-slate-950/50">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
              <MessageCircle className="w-12 h-12 mb-2" />
              <p className="text-sm">No hay mensajes aún.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-gray-400 truncate max-w-[100px]">{isMe ? 'Tú' : msg.sender_name}</span>
                      <span className="text-[10px] text-gray-600">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={cn(
                      "px-3 py-2 rounded-2xl text-sm shadow-sm break-words w-full",
                      isMe 
                        ? "bg-cyan-600 text-white rounded-tr-none" 
                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                    )}>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="bg-slate-950 border-slate-700 text-white focus-visible:ring-cyan-500"
              disabled={sending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
              disabled={!inputText.trim() || sending}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;