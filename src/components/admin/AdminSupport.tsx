import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, CheckCircle, Clock, User, Building2, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  category: string;
  status: string;
  created_at: string;
  last_message_at: string;
  profiles?: {
    email?: string;
  };
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
}

export const AdminSupport: React.FC = () => {
  const { userProfile } = useFinance();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadTickets();
    
    const ticketChannel = supabase
      .channel('admin_support_tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      
      const msgChannel = supabase
        .channel(`admin_messages:${selectedTicket.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(msgChannel);
      };
    } else {
      setMessages([]);
    }
  }, [selectedTicket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('last_message_at', { ascending: false });
    
    if (error) {
      toast({ title: "Erro ao carregar tickets", description: error.message, variant: "destructive" });
    } else if (data) {
      setTickets(data);
    }
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !userProfile) return;

    const content = newMessage;
    setNewMessage('');

    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: userProfile.id,
        content,
        is_admin_reply: true
      });

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      setNewMessage(content);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'resolved' })
      .eq('id', ticketId);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Atendimento encerrado" });
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'resolved' } : null);
      }
    }
  };

  const filteredTickets = tickets.filter(t => 
    (t.guest_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (t.guest_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Aberto</Badge>;
      case 'in_progress': return <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">Em Atendimento</Badge>;
      case 'resolved': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Resolvido</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Ticket List */}
      <div className="md:col-span-4 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Atendimentos
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, e-mail..." 
                className="pl-8" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1",
                      selectedTicket?.id === ticket.id && "bg-muted"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm truncate max-w-[150px]">
                        {ticket.guest_name || 'Usuário Logado'}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {ticket.guest_email || 'Cliente do Sistema'}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full uppercase font-bold">
                        {ticket.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredTickets.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum atendimento encontrado.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="md:col-span-8">
        {selectedTicket ? (
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {selectedTicket.user_id ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div>
                  <CardTitle className="text-base">{selectedTicket.guest_name || 'Cliente Logado'}</CardTitle>
                  <CardDescription className="text-xs">{selectedTicket.guest_email || 'Acesso Interno'}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTicket.status !== 'resolved' && (
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 gap-1" onClick={() => handleResolveTicket(selectedTicket.id)}>
                    <CheckCircle className="h-4 w-4" />
                    Encerrar Atendimento
                  </Button>
                )}
                {getStatusBadge(selectedTicket.status)}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 bg-muted/20">
              <ScrollArea className="h-full p-4">
                <div className="flex flex-col gap-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn(
                      "max-w-[75%] rounded-lg p-3 text-sm",
                      msg.is_admin_reply 
                        ? "bg-primary text-primary-foreground self-end rounded-tr-none" 
                        : "bg-background border self-start rounded-tl-none"
                    )}>
                      {msg.content}
                      <div className={cn(
                        "text-[10px] mt-1 opacity-70",
                        msg.is_admin_reply ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 border-t bg-background">
              <div className="flex w-full gap-2">
                <Input 
                  placeholder={selectedTicket.status === 'resolved' ? "Atendimento encerrado" : "Digite sua resposta..."} 
                  disabled={selectedTicket.status === 'resolved'}
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || selectedTicket.status === 'resolved'}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center text-muted-foreground border-dashed">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Selecione um atendimento para visualizar a conversa.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
