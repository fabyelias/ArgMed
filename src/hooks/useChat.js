import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export const useChat = (consultationId, userId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const fetchMessages = async () => {
    if (!consultationId) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || !userId || !consultationId) return false;

    setSending(true);
    try {
      const payload = {
        consultation_id: consultationId,
        sender_id: userId,
        message: text.trim(),
        is_read: false
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert(payload);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error sending message:", err);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
      return false;
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!consultationId) return;

    const channel = supabase
      .channel(`chat-${consultationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `consultation_id=eq.${consultationId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId]);

  return { messages, loading, sending, sendMessage };
};