// System Tour Component for Interactive Onboarding Guided Tour
import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, Sparkles, LayoutDashboard, ArrowRightLeft, Users, BarChart3, Building2, Bell, Wrench, ShoppingBag, Utensils, Calendar, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  description: string;
  selector?: string;
  icon: React.ReactNode;
}

interface SystemTourProps {
  open: boolean;
  onClose: () => void;
  onOpenTutorials?: () => void;
}

export const SystemTour: React.FC<SystemTourProps> = ({ open, onClose, onOpenTutorials }) => {
  const { businessSegment = 'full' } = useFinance();
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties | null>(null);

  const steps: Step[] = useMemo(() => {
    const isRetail = businessSegment === 'retail';
    const isRepair = businessSegment === 'repair';
    const isServices = businessSegment === 'services';
    const isFood = businessSegment === 'food';
    const isB2B = businessSegment === 'b2b';

    // Passo 3 Dinâmico conforme segmento
    let step3: Step = {
      title: "3. Incluir: Vendas & Ordens de Serviço 🛒🛠️",
      description: "Agilidade comercial máxima! Crie pedidos de venda com catálogo de estoque ou emita Ordens de Serviço completas para clientes.",
      selector: '[data-tour="nav-incluir"]',
      icon: <Sparkles className="h-8 w-8 text-primary" />
    };

    if (isRepair) {
      step3 = {
        title: "3. Ordens de Serviço (Mecânica) 🔧🚗",
        description: "Recepção ágil de veículos! Abra Ordens de Serviço estruturadas informando Placa, Modelo, Ano e Odômetro (KM). Lance peças com baixa de estoque, mão de obra e imprima o termo de garantia.",
        selector: '[data-tour="nav-incluir"]',
        icon: <Wrench className="h-8 w-8 text-primary" />
      };
    } else if (isRetail) {
      step3 = {
        title: "3. Modo Loja & Pedidos de Venda 👗🛒",
        description: "Frente de caixa rápida e catálogo visual! Realize vendas no PDV Touch com leitor de código de barras, fotos de peças, tamanhos P/M/G e controle de recebíveis.",
        selector: '[data-tour="nav-incluir"]',
        icon: <ShoppingBag className="h-8 w-8 text-primary" />
      };
    } else if (isB2B) {
      step3 = {
        title: "3. Propostas Comerciais & Orçamentos 💼📄",
        description: "Gere propostas comerciais em PDF com escopo de prestação de serviços e condições de pagamento. Ao aprovar, converta diretamente em faturamento.",
        selector: '[data-tour="nav-incluir"]',
        icon: <Briefcase className="h-8 w-8 text-primary" />
      };
    } else if (isFood) {
      step3 = {
        title: "3. Modo Loja & Comandas de Consumo 🍽️🧾",
        description: "Atendimento expresso! Abra comandas por mesa ou cliente, adicione porções e bebidas e feche a conta emitindo cupom conferencial em segundos.",
        selector: '[data-tour="nav-incluir"]',
        icon: <Utensils className="h-8 w-8 text-primary" />
      };
    }

    // Passo 4 Dinâmico
    let step4: Step = {
      title: "4. Cadastros & Operação 👥",
      description: "Gerencie toda a sua base: clientes com ficha financeira, fornecedores e controle de estoque completo com códigos e categorias.",
      selector: '[data-tour="nav-cadastros"]',
      icon: <Users className="h-8 w-8 text-primary" />
    };

    if (isServices) {
      step4 = {
        title: "4. Grade Horária, Clientes & Profissionais ✂️📅",
        description: "Cadastre clientes e colaboradores, configure turnos e jornadas com pausas de almoço, e agende atendimentos na grade diária ou semanal com cálculo de comissões.",
        selector: '[data-tour="nav-cadastros"]',
        icon: <Calendar className="h-8 w-8 text-primary" />
      };
    } else if (isRepair) {
      step4 = {
        title: "4. Clientes, Peças & Fornecedores 👥⚙️",
        description: "Histórico de manutenções por cliente e veículo, controle de estoque de peças automotivas por medida/aplicação e gestão de distribuidoras de autopeças.",
        selector: '[data-tour="nav-cadastros"]',
        icon: <Users className="h-8 w-8 text-primary" />
      };
    }

    return [
      {
        title: "Bem-vindo ao Previna! 🚀",
        description: `Este painel está personalizado para o seu perfil (${isRepair ? 'Oficina Mecânica' : isRetail ? 'Loja & Varejo' : isServices ? 'Serviços & Estética' : isFood ? 'Alimentos & Gastronomia' : isB2B ? 'Prestador B2B' : 'Modo Completo'}). Vamos fazer um tour rápido de 1 minuto pelos recursos essenciais!`,
        icon: <Sparkles className="h-8 w-8 text-primary animate-bounce" />
      },
      {
        title: "1. Painel Geral (Dashboard) 📊",
        description: "O Dashboard exibe seu fluxo de caixa consolidado, entradas, saídas e um Hub de Ações Rápidas adaptado exatamente para a rotina do seu negócio.",
        selector: '[data-tour="nav-dashboard"]',
        icon: <LayoutDashboard className="h-8 w-8 text-primary" />
      },
      {
        title: "2. Gestão Financeira 💸",
        description: "No menu Financeiro, você gerencia seu livro-caixa, contas a receber (receitas pendentes e fiado) e contas a pagar (boletos e despesas fixas) com baixa parcial e total.",
        selector: '[data-tour="nav-financeiro"]',
        icon: <ArrowRightLeft className="h-8 w-8 text-primary" />
      },
      step3,
      step4,
      {
        title: "5. Relatórios & Demonstração de Lucro 📈",
        description: "Acompanhe a lucratividade através do DRE Simplificado, relatórios de movimentação por período e demonstrativos de comissão.",
        selector: '[data-tour="nav-relatorios"]',
        icon: <BarChart3 className="h-8 w-8 text-primary" />
      },
      {
        title: "6. Central de Alertas e Notificações 🔔",
        description: "O sino no cabeçalho avisa em tempo real sobre alertas importantes, como vencimentos de contas e estoque mínimo.",
        selector: '[data-tour="notifications-bell"]',
        icon: <Bell className="h-8 w-8 text-primary" />
      }
    ];
  }, [businessSegment]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setHighlightStyle(null);
      return;
    }

    const step = steps[currentStep];
    const target = step.selector ? document.querySelector(step.selector) : null;

    if (target) {
      const updatePosition = () => {
        const rect = target.getBoundingClientRect();
        setHighlightStyle({
          position: 'fixed',
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'all 0.3s ease-in-out',
        });
      };

      // Inicializar posição e rolar suavemente para o elemento
      updatePosition();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('tour-highlight-active');

      // Escutar redimensionamento da janela para atualizar o holofote
      window.addEventListener('resize', updatePosition);

      return () => {
        target.classList.remove('tour-highlight-active');
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setHighlightStyle(null);
    }
  }, [currentStep, open]);

  if (!open) return null;

  const activeStep = steps[currentStep];

  return (
    <>
      <style>{`
        @keyframes tour-pulse {
          0%, 100% {
            box-shadow: 0 0 0 2px hsl(var(--primary)), 0 0 0 6px rgba(124, 58, 237, 0.3);
          }
          50% {
            box-shadow: 0 0 0 2px hsl(var(--primary)), 0 0 0 12px rgba(124, 58, 237, 0);
          }
        }
        .tour-highlight-active {
          animation: tour-pulse 1.8s infinite;
          border-color: hsl(var(--primary)) !important;
          z-index: 10000 !important;
          position: relative;
        }
      `}</style>

      {/* Spotlight Cutout Overlay */}
      {highlightStyle && (
        <div style={highlightStyle} className="tour-spotlight-cutout" />
      )}

      {/* Central Background Blur if no spotlight (welcome slide) */}
      {!highlightStyle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={handleClose} />
      )}

      {/* Tour Dialogue Box Card */}
      <div 
        className={cn(
          "fixed z-[10000] p-6 bg-card border border-border/80 shadow-2xl rounded-2xl flex flex-col gap-4 transition-all duration-300 animate-in fade-in zoom-in-95",
          highlightStyle 
            ? "bottom-6 right-6 left-6 md:left-auto md:w-[380px]" 
            : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[450px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            {currentStep === 0 ? "Início" : `Passo ${currentStep} de ${steps.length - 1}`}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" onClick={handleClose}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex gap-4 items-start py-2">
          <div className="p-3 bg-primary/10 rounded-xl shrink-0">
            {activeStep.icon}
          </div>
          <div className="space-y-1.5 min-w-0">
            <h4 className="font-bold text-base text-foreground leading-tight">{activeStep.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{activeStep.description}</p>
          </div>
        </div>

        {/* Progress dots & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          {/* Dots */}
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <span 
                key={idx} 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentStep ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/35"
                )}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onOpenTutorials && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleClose();
                  onOpenTutorials();
                }}
                className="h-8 text-xs text-primary hover:text-primary/90 hover:bg-primary/10 mr-auto"
                title="Abrir Central de Tutoriais e Passo a Passo"
              >
                Ver Tutoriais
              </Button>
            )}
            {currentStep > 0 ? (
              <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 gap-1 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Pular
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="h-8 gap-1 text-xs font-semibold">
              {currentStep === steps.length - 1 ? "Concluir" : "Próximo"} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
