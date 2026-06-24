import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, X, Send, Loader2, User, Headset } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
}

export const SupportWidget: React.FC = () => {
  const { userProfile, isAuthenticated } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'chat'>('form');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<string>('duvida');
  const [initialMessage, setInitialMessage] = useState('');
  
  // Chat State
  const [ticketId, setTicketId] = useState<string | null>(localStorage.getItem('active_support_ticket'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (step === 'chat') {
      scrollToBottom();
    }
  }, [messages, step]);

  // Sync ticket status
  useEffect(() => {
    if (ticketId) {
      setStep('chat');
      loadMessages(ticketId);
      
      const channel = supabase
        .channel(`support_messages:${ticketId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [ticketId]);

  const loadMessages = async (id: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleStartSupport = async () => {
    if (!initialMessage.trim()) return;
    if (!isAuthenticated && (!name.trim() || !email.trim())) {
      toast({ title: "Dados incompletos", description: "Preencha seu nome e e-mail para continuar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Create Ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userProfile?.id || null,
          guest_name: isAuthenticated ? null : name,
          guest_email: isAuthenticated ? null : email,
          category,
          status: 'open'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Create Initial Message
      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: userProfile?.id || null,
          content: initialMessage,
          is_admin_reply: false
        });

      if (msgError) throw msgError;

      setTicketId(ticket.id);
      localStorage.setItem('active_support_ticket', ticket.id);
      setStep('chat');
      setInitialMessage('');
    } catch (error: any) {
      toast({ title: "Erro ao iniciar suporte", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticketId) return;

    const currentMsg = newMessage;
    setNewMessage('');
    
    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: userProfile?.id || null,
        content: currentMsg,
        is_admin_reply: false
      });

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      setNewMessage(currentMsg);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[350px] sm:w-[400px] h-[500px] shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-xl p-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Headset className="h-5 w-5" />
              <div>
                <CardTitle className="text-lg">Suporte Previna</CardTitle>
                <CardDescription className="text-primary-foreground/70 text-xs">Estamos aqui para ajudar</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={closeChat}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === 'form' ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                {!isAuthenticated && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Como podemos te chamar? *</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Qual seu e-mail? *</Label>
                      <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="category">Assunto *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duvida">Dúvida</SelectItem>
                      <SelectItem value="suporte">Suporte Técnico</SelectItem>
                      <SelectItem value="sugestao">Sugestão</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Como podemos ajudar? *</Label>
                  <Input 
                    id="message" 
                    value={initialMessage} 
                    onChange={e => setInitialMessage(e.target.value)} 
                    placeholder="Descreva brevemente sua necessidade..." 
                    onKeyDown={(e) => e.key === 'Enter' && handleStartSupport()}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "max-w-[85%] rounded-lg p-3 text-sm animate-in zoom-in-95 duration-200",
                    msg.is_admin_reply 
                      ? "bg-muted self-start rounded-tl-none" 
                      : "bg-primary text-primary-foreground self-end rounded-tr-none"
                  )}>
                    {msg.content}
                    <div className={cn(
                      "text-[10px] mt-1 opacity-70",
                      msg.is_admin_reply ? "text-muted-foreground" : "text-primary-foreground"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t">
            {step === 'form' ? (
              <Button className="w-full" onClick={handleStartSupport} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Atendimento
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Input 
                  placeholder="Digite sua mensagem..." 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      )}

      <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
};
