// BusinessTutorialDialog.tsx - Central Oficial de Tutoriais e Guia de Módulos por Tipo de Negócio

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { BusinessSegment } from '@/types/finance';
import { BUSINESS_SEGMENT_GUIDES, BusinessSegmentGuide } from '@/utils/businessTutorialsData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Wrench,
  ShoppingBag,
  Calendar,
  Utensils,
  Briefcase,
  LayoutGrid,
  CheckCircle2,
  EyeOff,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  ExternalLink,
  Settings2,
} from 'lucide-react';

interface BusinessTutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToView?: (view: string) => void;
}

const getSegmentIcon = (iconName: string, className = "h-5 w-5") => {
  switch (iconName) {
    case 'Wrench': return <Wrench className={className} />;
    case 'ShoppingBag': return <ShoppingBag className={className} />;
    case 'Calendar': return <Calendar className={className} />;
    case 'Utensils': return <Utensils className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    default: return <LayoutGrid className={className} />;
  }
};

export const BusinessTutorialDialog: React.FC<BusinessTutorialDialogProps> = ({
  open,
  onOpenChange,
  onNavigateToView,
}) => {
  const { businessSegment = 'full' } = useFinance();
  const [selectedSegment, setSelectedSegment] = useState<BusinessSegment>(businessSegment);
  const [activeTab, setActiveTab] = useState<'workflow' | 'modules' | 'faq'>('workflow');

  // Atualizar para o segmento ativo quando abrir
  React.useEffect(() => {
    if (open) {
      setSelectedSegment(businessSegment);
      setActiveTab('workflow');
    }
  }, [open, businessSegment]);

  const guide: BusinessSegmentGuide = BUSINESS_SEGMENT_GUIDES[selectedSegment] || BUSINESS_SEGMENT_GUIDES.full;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-5 pb-4 border-b bg-gradient-to-r from-primary/10 via-background to-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Central de Tutoriais & Guias de Uso
                  <Badge variant="outline" className="text-xs bg-background/80 font-semibold">
                    {guide.badge}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Aprenda as melhores práticas, fluxos recomendados e quais módulos atendem seu negócio.
                </DialogDescription>
              </div>
            </div>

            {/* Seletor de Perfil para Consulta Rápida */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">Perfil:</span>
              <select
                aria-label="Selecionar perfil de negócio para o tutorial"
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value as BusinessSegment)}
                className="text-xs font-semibold bg-background border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-2xs"
              >
                <option value="repair">🔧 Oficina Mecânica</option>
                <option value="retail">👗 Loja & Varejo</option>
                <option value="services">✂️ Serviços & Estética</option>
                <option value="food">🍽️ Alimentos & Gastronomia</option>
                <option value="b2b">💼 Prestador B2B</option>
                <option value="full">⭐ Modo Completo</option>
              </select>
            </div>
          </div>

          {/* Abas Superiores */}
          <div className="w-full mt-4">
            <div className="grid grid-cols-3 w-full bg-muted/70 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('workflow')}
                className={cn(
                  "text-xs font-medium flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors",
                  activeTab === 'workflow' ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Passo a Passo Diário
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('modules')}
                className={cn(
                  "text-xs font-medium flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors",
                  activeTab === 'modules' ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings2 className="h-3.5 w-3.5 text-blue-500" />
                Módulos Ativos & Ocultos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('faq')}
                className={cn(
                  "text-xs font-medium flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors",
                  activeTab === 'faq' ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HelpCircle className="h-3.5 w-3.5 text-teal-500" />
                Dúvidas Frequentes
              </button>
            </div>
          </div>
        </div>

        {/* Corpo com Scroll Suave */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Banner de Contexto do Segmento */}
          <div className="p-3.5 rounded-xl border bg-muted/30 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-background border shadow-2xs shrink-0 text-primary">
              {getSegmentIcon(guide.iconName, "h-5 w-5")}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-foreground">{guide.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{guide.summary}</p>
            </div>
          </div>

          {/* ABA 1: FLUXO DE TRABALHO DIÁRIO */}
          {activeTab === 'workflow' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Rotina Recomendada Passo a Passo
              </h4>

              <div className="space-y-3">
                {guide.dailyWorkflow.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-border bg-card shadow-2xs transition-all hover:border-primary/40 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-foreground flex items-center gap-2">
                        {step.title}
                      </span>
                      {step.badge && (
                        <Badge variant="secondary" className="text-[10px] font-semibold h-5 px-2">
                          {step.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>

                    {step.tips && step.tips.length > 0 && (
                      <div className="pt-2 border-t border-border/50 space-y-1">
                        {step.tips.map((tip, tIdx) => (
                          <div key={tIdx} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <span className="text-primary font-bold shrink-0">•</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 2: MÓDULOS ATIVOS E OCULTOS */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              {/* Módulos Ativos */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Módulos Habilitados para {guide.title}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {guide.visibleModules.map((mod, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-foreground">{mod.name}</span>
                        <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 text-[9px] h-4 px-1.5 uppercase font-medium">
                          {mod.tag}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{mod.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Módulos Ocultados para Simplificar */}
              {guide.hiddenModules.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <EyeOff className="h-4 w-4" />
                    Módulos Ocultos (Evita poluição visual)
                  </h4>
                  <div className="space-y-2">
                    {guide.hiddenModules.map((mod, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-border bg-muted/20 flex items-start justify-between gap-3">
                        <div>
                          <span className="font-medium text-xs text-muted-foreground line-through block">{mod.name}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{mod.reason}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground shrink-0">Oculto</Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    💡 Dica: Caso queira utilizar todos os módulos sem nenhuma restrição, basta mudar para o perfil <strong>Modo Completo Avançado</strong> nas Configurações.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: PERGUNTAS FREQUENTES */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-teal-500" />
                Respostas Rápidas
              </h4>
              <div className="space-y-2.5">
                {guide.faq.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
                    <span className="font-semibold text-xs text-foreground block">
                      ❓ {item.q}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/30">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground"
          >
            Fechar Tutorial
          </Button>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onNavigateToView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onNavigateToView('settings');
                }}
                className="text-xs gap-1.5"
              >
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                Mudar Meu Perfil
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs gap-1.5"
            >
              Entendi, Vamos Lá!
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
