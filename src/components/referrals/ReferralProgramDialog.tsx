// src/components/referrals/ReferralProgramDialog.tsx
// Diálogo oficial do Programa "Indique e Ganhe" (Member-Get-Member)

import React, { useState, useEffect, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import {
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import {
  getReferralLink,
  getWhatsAppShareUrl,
  generateReferralCode,
  cleanReferralCode,
} from '@/utils/referralUtils';

interface ReferralProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReferralItem {
  id: string;
  referralCode: string;
  referredCompanyName?: string;
  referredEmail?: string;
  status: 'trialing' | 'active' | 'rewarded' | 'churned';
  rewardMonthsAwarded: number;
  createdAt: string;
}

export const ReferralProgramDialog: React.FC<ReferralProgramDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { currentClient } = useFinance();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCode, setActiveCode] = useState<string>('');

  // Garantir que a empresa tenha um código de indicação limpo (apenas o código, sem prefixos ou hífens)
  useEffect(() => {
    if (!currentClient) return;

    const rawCode = currentClient.referralCode;
    const cleanedCode = cleanReferralCode(rawCode);

    // Se já tiver um código válido e SEM hífen/prefixo com pelo menos 5 caracteres:
    if (rawCode && !rawCode.includes('-') && cleanedCode && cleanedCode.length >= 5) {
      setActiveCode(cleanedCode);
    } else {
      // Se não possui, ou se possui prefixo (continha '-'), gera um novo código puro
      const newCode = (cleanedCode && cleanedCode.length >= 6) ? cleanedCode : generateReferralCode();
      setActiveCode(newCode);

      // Persistir no banco sem bloquear a interface
      (async () => {
        try {
          await (supabase.from('clients') as any)
            .update({ referral_code: newCode })
            .eq('id', currentClient.id);
        } catch (err) {
          console.warn('Could not auto-persist referral_code:', err);
        }
      })();
    }
  }, [currentClient]);

  // Carregar lista de indicados
  const loadReferrals = useCallback(async () => {
    if (!currentClient?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Tabela pode ainda estar sendo criada em ambientes de teste
        setReferrals([]);
        return;
      }

      if (data) {
        setReferrals(
          data.map((r: any) => ({
            id: r.id,
            referralCode: r.referral_code,
            referredCompanyName: r.referred_company_name || 'Empresa Amiga',
            referredEmail: r.referred_email,
            status: r.status,
            rewardMonthsAwarded: r.reward_months_awarded || 0,
            createdAt: r.created_at,
          }))
        );
      }
    } catch {
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [currentClient?.id]);

  useEffect(() => {
    if (open) {
      loadReferrals();
    }
  }, [open, loadReferrals]);

  const referralLink = activeCode ? getReferralLink(activeCode) : '';

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'Compartilhe com seus amigos empresários no WhatsApp ou redes.',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: 'Falha ao copiar',
        description: 'Copie manualmente o link destacado na tela.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenWhatsApp = () => {
    if (!activeCode) return;
    const url = getWhatsAppShareUrl(activeCode, currentClient?.name);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Métricas
  const totalInvited = referrals.length;
  const inTrial = referrals.filter((r) => r.status === 'trialing').length;
  const activeSubs = referrals.filter(
    (r) => r.status === 'active' || r.status === 'rewarded'
  ).length;
  const freeMonthsEarned = referrals.reduce(
    (acc, r) => acc + (r.rewardMonthsAwarded || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col p-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                Indique e Ganhe Meses Grátis
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Ganha-Ganha
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                Convide amigos empresários: eles ganham +15 dias grátis e você ganha 1 mensalidade sem pagar nada por cada amigo que assinar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Card de Como Funciona */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                  Seu Amigo Ganha
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  <strong>22 dias de teste gratuito</strong> (15 dias extras de bônus) para experimentar todas as ferramentas sem compromisso.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Você Ganha
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  <strong>1 mês 100% grátis</strong> na sua mensalidade para cada amigo indicado que assinar qualquer plano pago (acumulativo!).
                </p>
              </div>
            </div>
          </div>

          {/* Card com Link e Ações */}
          <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-card to-primary/[0.02]">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Seu Código & Link de Indicação
                  </label>
                  <span className="font-mono font-bold text-sm text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                    {activeCode || '...'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    readOnly
                    value={referralLink || 'Carregando link...'}
                    className="font-mono text-xs bg-muted/40 h-10 select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="h-10 px-3 shrink-0 flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleOpenWhatsApp}
                  className="w-full sm:flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 font-semibold"
                >
                  <MessageCircle className="h-4 w-4 fill-white" />
                  Compartilhar no WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto h-11 px-4 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  Copiar Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPIs de Desempenho */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Suas Recompensas & Indicações
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border bg-card text-center">
                <p className="text-2xl font-bold text-foreground">{totalInvited}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Amigos Convidados</p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center">
                <p className="text-2xl font-bold text-amber-500">{inTrial}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Em Teste Grátis</p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center">
                <p className="text-2xl font-bold text-emerald-600">{activeSubs}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Assinaturas Ativas</p>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center bg-primary/5 border-primary/20">
                <p className="text-2xl font-bold text-primary">{freeMonthsEarned}</p>
                <p className="text-xs font-medium text-primary mt-0.5">Meses Grátis Ganhos</p>
              </div>
            </div>
          </div>

          {/* Tabela de Amigos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Histórico de Amigos
              </h4>
              <span className="text-xs text-muted-foreground">
                {referrals.length} registro{referrals.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Carregando indicações...
              </div>
            ) : referrals.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed text-center space-y-3 bg-muted/10">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h5 className="font-semibold text-sm text-foreground">
                    Você ainda não convidou nenhum amigo
                  </h5>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                    Envie o seu link para donos de lojas, mecânicas e prestadores de serviço que você conhece e comece a economizar na sua mensalidade.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenWhatsApp}
                  className="text-xs flex items-center gap-1.5 mx-auto"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Convidar Primeiro Amigo
                </Button>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden divide-y">
                {referrals.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {r.referredCompanyName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div>
                      {r.status === 'trialing' && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Em Teste (22 dias)
                        </Badge>
                      )}
                      {r.status === 'active' && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Assinante Ativo
                        </Badge>
                      )}
                      {r.status === 'rewarded' && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20"
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Mês Grátis Concedido
                        </Badge>
                      )}
                      {r.status === 'churned' && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Cancelado
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-muted/10 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
