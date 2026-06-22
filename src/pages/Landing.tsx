import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  ArrowRight, 
  BarChart3, 
  ShieldCheck, 
  Wallet, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  Check, 
  X,
  Star, 
  HelpCircle,
  MessageSquare,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Upload
} from 'lucide-react';

// Mapeamento de detalhes visuais e de exibição dos planos
const planDisplayMetadata: Record<string, { description: string, features: { text: string, included: boolean }[], cta: string, popular: boolean }> = {
  "Básico": {
    description: "Ideal para autônomos e microempresas começando a organizar suas finanças.",
    features: [
      { text: "1 Usuário (Dono)", included: true },
      { text: "Fluxo de caixa básico", included: true },
      { text: "Importação de extratos (OFX/CSV)", included: true },
      { text: "Relatórios de receitas e despesas", included: true },
      { text: "Sem colaboradores", included: true },
      { text: "Suporte por e-mail", included: true },
      { text: "Controle de Múltiplas Empresas", included: false },
      { text: "Gestão avançada de comissões", included: false },
      { text: "Exportação de relatórios em CSV", included: false },
      { text: "Dashboards e projeções avançadas", included: false },
    ],
    cta: "Começar Teste Grátis",
    popular: false,
  },
  "Intermediário": {
    description: "Perfeito para pequenas empresas com equipes em crescimento e fluxo constante.",
    features: [
      { text: "Até 1 Colaborador", included: true },
      { text: "Importação de extratos (OFX/CSV)", included: true },
      { text: "Controle de Múltiplas Empresas", included: true },
      { text: "Gestão avançada de comissões", included: true },
      { text: "Exportação de relatórios em CSV", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Dashboards e projeções avançadas", included: false },
      { text: "Gerente de contas dedicado", included: false },
    ],
    cta: "Começar Teste Grátis",
    popular: false,
  },
  "Avançado": {
    description: "Para empresas que necessitam de automação robusta e recursos sem limites.",
    features: [
      { text: "Até 10 Colaboradores", included: true },
      { text: "Importação de extratos (OFX/CSV)", included: true },
      { text: "Controle de Múltiplas Empresas", included: true },
      { text: "Gestão avançada de comissões", included: true },
      { text: "Exportação de relatórios em CSV", included: true },
      { text: "Dashboards e projeções avançadas", included: true },
      { text: "Regras de segurança RLS reforçadas", included: true },
      { text: "Gerente de contas dedicado", included: true },
      { text: "Suporte 24/7 prioritário", included: true },
    ],
    cta: "Experimentar Plano Recomendado",
    popular: true,
  },
};

const previewChartData = [
  { month: 'Jan', income: 18000, expense: 11000 },
  { month: 'Fev', income: 22000, expense: 12500 },
  { month: 'Mar', income: 25000, expense: 14000 },
  { month: 'Abr', income: 23000, expense: 13000 },
  { month: 'Mai', income: 27000, expense: 15500 },
  { month: 'Jun', income: 28450, expense: 14120 },
];

export default function Landing() {
  const navigate = useNavigate();
  const { plans: dbPlans } = useSubscription();
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const displayedPlans = React.useMemo(() => {
    if (!dbPlans || dbPlans.length === 0) {
      // Fallback para quando o banco não tiver carregado ou retornado dados
      return [
        {
          name: "Básico",
          description: planDisplayMetadata["Básico"].description,
          price: 0,
          features: planDisplayMetadata["Básico"].features,
          cta: planDisplayMetadata["Básico"].cta,
          popular: false,
        },
        {
          name: "Intermediário",
          description: planDisplayMetadata["Intermediário"].description,
          price: 49.90,
          features: planDisplayMetadata["Intermediário"].features,
          cta: planDisplayMetadata["Intermediário"].cta,
          popular: false,
        },
        {
          name: "Avançado",
          description: planDisplayMetadata["Avançado"].description,
          price: 99.90,
          features: planDisplayMetadata["Avançado"].features,
          cta: planDisplayMetadata["Avançado"].cta,
          popular: true,
        }
      ];
    }

    return dbPlans.map(dbPlan => {
      const meta = planDisplayMetadata[dbPlan.name] || {
        description: dbPlan.description || "",
        features: Object.entries(dbPlan.features).map(([k, v]) => ({ text: `${k}: ${v}`, included: true })),
        cta: "Começar Agora",
        popular: false
      };
      return {
        name: dbPlan.name,
        description: meta.description,
        price: dbPlan.price,
        features: meta.features,
        cta: meta.cta,
        popular: meta.popular
      };
    });
  }, [dbPlans]);

  const testimonials = [
    {
      name: "Mariana Costa",
      role: "CEO da Costa & Cia",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      content: "O Previna mudou completamente a forma como lidamos com a nossa gestão multi-tenant. Agora alternamos entre nossas 3 filiais sem nenhuma dor de cabeça.",
      stars: 5,
    },
    {
      name: "Rodrigo Almeida",
      role: "Diretor Financeiro no Grupo TechHub",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80",
      content: "O gerenciamento automático e o controle de comissões de colaboradores nos poupa pelo menos 15 horas de trabalho administrativo por semana.",
      stars: 5,
    },
    {
      name: "Gabriela Fernandes",
      role: "Sócia-Fundadora da Florescer Consultoria",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
      content: "O sistema é incrível! O controle de lançamentos e o plano de contas facilitaram demais a nossa rotina diária, poupando muito tempo.",
      stars: 5,
    },
  ];

  const faqs = [
    {
      question: "Como funciona o período de teste gratuito?",
      answer: "Você pode se cadastrar e utilizar qualquer um dos planos gratuitamente por até 7 dias, sem precisar inserir dados de cartão de crédito no momento do registro. Caso decida continuar, poderá cadastrar seu meio de pagamento de forma segura.",
    },
    {
      question: "Posso gerenciar mais de uma empresa na mesma conta?",
      answer: "Sim! O Previna é um sistema multi-empresa (multi-tenant) nativo. A partir do plano Intermediário, você pode criar e alternar entre diferentes empresas/clientes com extrema facilidade, mantendo os dados financeiros de cada uma totalmente isolados.",
    },
    {
      question: "Meus dados de pagamento estão seguros?",
      answer: "Absolutamente. Nossa integração de pagamentos utiliza tecnologia de tokenização segura, garantindo total conformidade com os padrões de segurança PCI Compliance. Suas informações de cartão nunca tocam nossos servidores diretamente.",
    },
    {
      question: "Como funciona a política de cancelamento?",
      answer: "O cancelamento pode ser feito a qualquer momento diretamente pelo painel do cliente, sem multas ou taxas de fidelidade. Você continuará com acesso aos seus dados no modo 'Apenas Leitura' mesmo após o término do período pago.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased text-foreground selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.png" alt="Previna Logo" className="h-10 sm:h-12 w-auto object-contain transition-transform hover:scale-105" />
          </div>
          <nav className="flex items-center gap-6">
            <div className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a>
              <a href="#beneficios" className="hover:text-primary transition-colors">Benefícios</a>
              <a href="#precos" className="hover:text-primary transition-colors">Planos</a>
              <a href="#depoimentos" className="hover:text-primary transition-colors">Clientes</a>
              <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={async () => {
                try {
                  await supabase.auth.signOut();
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (e) {
                  console.error(e);
                }
                navigate('/auth');
              }}>
                Acessar
              </Button>
              <Button onClick={() => navigate('/onboarding')} className="hidden sm:flex bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                Começar Grátis
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
          {/* Decorative glowing backdrops */}
          <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-primary/10 blur-[100px] rounded-full -z-10" />
          <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-indigo-500/10 blur-[90px] rounded-full -z-10" />
          
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-semibold mb-6 animate-fade-in">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Gestão Inteligente & Automação Financeira</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto mb-6 text-foreground leading-tight">
              O controle financeiro que a sua empresa <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">merece ter</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Simplifique o fluxo de caixa, organize comissões de colaboradores, receba pagamentos recorrentes e automatize lançamentos de forma simples e rápida.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xl shadow-primary/25 group transition-all" onClick={() => navigate('/onboarding')}>
                Experimentar 7 dias grátis
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base" onClick={() => {
                const el = document.getElementById('precos');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Ver Planos & Preços
              </Button>
            </div>
            
            {/* Interactive Dashboard Preview */}
            <div className="mt-20 mx-auto max-w-5xl bg-card/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/80 overflow-hidden flex flex-col relative z-10 transition-all hover:border-primary/30">
              <div className="h-12 bg-muted/30 border-b flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded">previna.app/dashboard</span>
              </div>
              <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-br from-background to-muted/20">
                <div className="col-span-1 md:col-span-2 space-y-4 text-left">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">Visão Geral da Empresa</h3>
                      <p className="text-xs text-muted-foreground">Competência: Junho de 2026</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold rounded-full flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> +42% este mês
                    </div>
                  </div>
                  <div className="h-[240px] bg-primary/5 border border-primary/10 rounded-xl relative overflow-hidden p-4">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={previewChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                          tickFormatter={(v) => `R$ ${v/1000}k`}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                          formatter={(value: number, name: string) => [
                            `R$ ${value.toLocaleString('pt-BR')}`,
                            name === 'income' ? 'Receitas' : 'Despesas'
                          ]}
                        />
                        <Area 
                          type="monotone"
                          dataKey="income" 
                          name="income"
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorIncome)"
                        />
                        <Area 
                          type="monotone"
                          dataKey="expense" 
                          name="expense"
                          stroke="#ef4444" 
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorExpense)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border rounded-xl p-4 text-sm flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs font-medium">Total Recebido</span>
                        <span className="font-bold text-xl text-emerald-500">R$ 28.450,00</span>
                    </div>
                    <div className="bg-card border rounded-xl p-4 text-sm flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs font-medium">Total Pago</span>
                        <span className="font-bold text-xl text-red-500">R$ 14.120,00</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 text-left">
                  <div className="bg-card border rounded-xl p-4 shadow-sm">
                    <h4 className="font-bold mb-3 text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Colaboradores & Comissões
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-center justify-between text-xs border-b pb-2">
                        <span>Carla Silva</span>
                        <span className="font-semibold text-emerald-500">R$ 1.840,00</span>
                      </li>
                      <li className="flex items-center justify-between text-xs border-b pb-2">
                        <span>Eduardo Souza</span>
                        <span className="font-semibold text-emerald-500">R$ 950,00</span>
                      </li>
                      <li className="flex items-center justify-between text-xs">
                        <span>Aline Lima</span>
                        <span className="font-semibold text-emerald-500">R$ 1.220,00</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-card border rounded-xl p-4 bg-gradient-to-r from-primary/5 to-indigo-500/5 border-primary/20">
                    <h4 className="font-bold mb-1 text-sm flex items-center gap-1.5 text-primary">
                      <FileSpreadsheet className="h-4 w-4" /> Relatórios Exportáveis
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      "Gere e exporte relatórios completos do fluxo de caixa em formato PDF e CSV."
                    </p>
                    <div className="mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-block font-semibold">
                      ✓ Download Disponível
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="funcionalidades" className="py-24 bg-muted/40 relative">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Recursos completos para sua empresa crescer</h2>
              <p className="text-lg text-muted-foreground">
                Toda a complexidade financeira reduzida a telas simples, automatizadas e inteligentes.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-card p-8 rounded-2xl shadow-sm border border-border/80 transition-all hover:shadow-md hover:border-primary/20 group">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Fluxo de Caixa Simples</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gerencie lançamentos recorrentes, visualize saldos futuros e filtre receitas e despesas por categorias e formas de pagamento em tempo real.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl shadow-sm border border-border/80 transition-all hover:shadow-md hover:border-primary/20 group">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Importação de Extrato</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Suba arquivos de extratos bancários nos formatos OFX e CSV diretamente no sistema para agilizar e facilitar seus lançamentos diários.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl shadow-sm border border-border/80 transition-all hover:shadow-md hover:border-primary/20 group">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <Wallet className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Multi-Tenancy Integrado</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cadastre múltiplas filiais ou CNPJs. Mude de ambiente instantaneamente de forma isolada, com total segurança de dados.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl shadow-sm border border-border/80 transition-all hover:shadow-md hover:border-primary/20 group">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">Controle de Equipes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Delegue tarefas administrativas com segurança. Defina papéis como Dono (Owner) ou Colaborador, limitando acessos a relatórios críticos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits List */}
        <section id="beneficios" className="py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">O que torna o Previna a escolha certa?</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Desenvolvemos a plataforma combinando segurança bancária e facilidade máxima de uso diário.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "Tokenização PCI Compliance e criptografia para transações de cartão super seguras.",
                    "Divisão automática e precisa de comissões por colaborador.",
                    "Exportação rápida de relatórios completos em formatos PDF e CSV.",
                    "Conformidade total RLS (Row Level Security) garantindo o sigilo das suas informações.",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
                      <p className="text-base font-semibold text-foreground/90">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full max-w-md mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-indigo-500/10 blur-[80px] rounded-full -z-10" />
                <div className="bg-gradient-to-br from-card to-muted p-8 rounded-3xl border shadow-xl flex flex-col items-center justify-center aspect-square transition-all hover:scale-105">
                  <img 
                    src="/logo.png" 
                    alt="Previna" 
                    className="w-3/5 h-auto object-contain drop-shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x600/f8fafc/0f172a?text=Previna';
                    }}
                  />
                  <div className="mt-6 text-center">
                    <p className="text-sm font-bold text-foreground">Previna Finanças</p>
                    <p className="text-xs text-muted-foreground">Segurança, Simplicidade e Controle</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section (NEW) */}
        <section id="precos" className="py-24 bg-muted/40 relative">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Escolha o plano ideal para a sua empresa</h2>
              <p className="text-lg text-muted-foreground">
                Comece grátis por 7 dias em qualquer modalidade. Cancele quando quiser.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              {displayedPlans.map((plan, index) => (
                <div 
                  key={index} 
                  className={`bg-card rounded-3xl border flex flex-col relative transition-all duration-300 hover:shadow-xl ${plan.popular ? 'border-primary shadow-md scale-105 md:translate-y-[-8px] z-10' : 'border-border/80'}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-1/2 translate-x-1/2 translate-y-[-50%] bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-md uppercase tracking-wider">
                      Recomendado
                    </div>
                  )}
                  <div className="p-8 border-b">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground min-h-[40px]">{plan.description}</p>
                    <div className="mt-6 flex items-baseline">
                      <span className="text-4xl font-extrabold tracking-tight">
                        R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-muted-foreground ml-1 text-sm">/mês</span>
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          {feature.included ? (
                            <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                          )}
                          <span className={feature.included ? "text-foreground/90" : "text-muted-foreground/60 line-through"}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => navigate(`/onboarding?plan=${plan.name.toLowerCase()}`)} 
                      className={`w-full h-12 text-sm font-semibold rounded-xl ${plan.popular ? 'bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20' : 'bg-secondary hover:bg-secondary/90 text-secondary-foreground'}`}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section (NEW) */}
        <section id="depoimentos" className="py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Aprovado por líderes de finanças</h2>
              <p className="text-lg text-muted-foreground">
                Descubra por que centenas de empreendedores e gestores confiam no Previna diariamente.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {testimonials.map((t, idx) => (
                <div key={idx} className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    <div className="flex gap-0.5">
                      {[...Array(t.stars)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic leading-relaxed text-sm">
                      "{t.content}"
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-8 pt-4 border-t">
                    <img 
                      src={t.avatar} 
                      alt={t.name} 
                      className="w-12 h-12 rounded-full object-cover border" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/150x150/f8fafc/0f172a?text=' + t.name.charAt(0);
                      }}
                    />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{t.name}</h4>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section (NEW) */}
        <section id="faq" className="py-24 bg-muted/40 relative">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Dúvidas Frequentes</h2>
              <p className="text-lg text-muted-foreground">
                Tem alguma pergunta sobre a plataforma? Confira as respostas abaixo.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div 
                    key={index} 
                    className="bg-card border rounded-2xl overflow-hidden transition-all duration-300"
                  >
                    <button 
                      onClick={() => toggleFaq(index)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-foreground hover:text-primary transition-colors focus:outline-none"
                    >
                      <span className="flex items-center gap-3">
                        <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                        {faq.question}
                      </span>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                    </button>
                    <div 
                      className={`px-6 overflow-hidden transition-all duration-300 ${isOpen ? 'pb-6 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-28 bg-primary text-primary-foreground relative overflow-hidden">
          {/* Subtle grid background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0c_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          <div className="absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%] w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full -z-10" />
          
          <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight">Simplifique a gestão financeira hoje mesmo</h2>
            <p className="text-primary-foreground/90 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Junte-se a centenas de empresas que escolheram a automação e o controle inteligente para crescer de forma sustentável.
            </p>
            <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-bold shadow-2xl hover:scale-105 transition-transform" onClick={() => navigate('/onboarding')}>
              Começar Teste de 7 Dias Grátis
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-16 text-muted-foreground">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b pb-8 mb-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src="/logo.png" alt="Previna Logo" className="h-8 w-auto object-contain hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/termos" className="hover:text-foreground transition-colors font-medium">Termos de Uso</a>
              <a href="/privacidade" className="hover:text-foreground transition-colors font-medium">Política de Privacidade</a>
              <a href="/cancelamento" className="hover:text-foreground transition-colors font-medium">Política de Cancelamento</a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>
              © {new Date().getFullYear()} Previna por NEWFEEL TEC. Todos os direitos reservados. CNPJ: 43.186.726/0001-73.
            </p>
            <p className="text-muted-foreground/60">
              Desenvolvido em conformidade com as regras de PCI Compliance e RLS do banco de dados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}