// System Tour Component for Interactive Onboarding Guided Tour
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, X, Sparkles, LayoutDashboard, ArrowRightLeft, Users, BarChart3, Building2, Bell } from 'lucide-react';
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
}

export const SystemTour: React.FC<SystemTourProps> = ({ open, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties | null>(null);

  const steps: Step[] = [
    {
      title: "Bem-vindo ao Tenant Finance Flow! 🚀",
      description: "Este é o seu painel de controle financeiro multi-tenant. Vamos fazer um tour rápido de 1 minuto para te mostrar onde tudo fica e como começar com o pé direito!",
      icon: <Sparkles className="h-8 w-8 text-primary animate-bounce" />
    },
    {
      title: "1. Painel Geral (Dashboard) 📊",
      description: "O Dashboard exibe um resumo financeiro consolidado de suas receitas, despesas, faturamento mensal e saldo total, com gráficos dinâmicos de fluxo de caixa e atalhos rápidos.",
      selector: '[data-tour="nav-dashboard"]',
      icon: <LayoutDashboard className="h-8 w-8 text-primary" />
    },
    {
      title: "2. Gestão Financeira 💸",
      description: "No menu Financeiro, você gerencia seu livro-caixa de transações, contas a receber (receitas pendentes) e contas a pagar (despesas pendentes) de forma simples e rápida.",
      selector: '[data-tour="nav-financeiro"]',
      icon: <ArrowRightLeft className="h-8 w-8 text-primary" />
    },
    {
      title: "3. Clientes, Agenda e Estoque 👥",
      description: "Gerencie toda a sua operação! Cadastre clientes e fornecedores, agende serviços diários com faturamento automático e controle o estoque por lotes e validades.",
      selector: '[data-tour="nav-cadastros"]',
      icon: <Users className="h-8 w-8 text-primary" />
    },
    {
      title: "4. Relatórios Completos 📈",
      description: "Acompanhe a saúde do seu negócio através do DRE Simplificado, demonstrativos de repasses/comissões, projeções de caixa e análise de margens por categoria.",
      selector: '[data-tour="nav-relatorios"]',
      icon: <BarChart3 className="h-8 w-8 text-primary" />
    },
    {
      title: "5. Troca de Empresa 🏢",
      description: "Caso você gerencie mais de uma empresa ou unidade, utilize este seletor de clientes no cabeçalho para alternar instantaneamente entre elas.",
      selector: '[data-tour="client-select"]',
      icon: <Building2 className="h-8 w-8 text-primary" />
    },
    {
      title: "6. Central de Alertas e Notificações 🔔",
      description: "O sino no cabeçalho avisa em tempo real sobre alertas importantes do sistema, como vencimentos de produtos do estoque ou níveis críticos de armazenamento.",
      selector: '[data-tour="notifications-bell"]',
      icon: <Bell className="h-8 w-8 text-primary" />
    }
  ];

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
          <div className="flex gap-2">
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
