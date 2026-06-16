import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart3, ShieldCheck, Wallet, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">T</span>
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">Tenant Finance</span>
          </div>
          <nav className="flex items-center gap-4">
            <div className="hidden md:flex gap-6 mr-6 text-sm font-medium text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a>
              <a href="#beneficios" className="hover:text-primary transition-colors">Benefícios</a>
            </div>
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Acessar
            </Button>
            <Button onClick={() => navigate('/auth?signup=true')} className="hidden sm:flex">
              Começar Grátis
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />
          
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>O sistema financeiro inteligente para o seu negócio</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto mb-6 text-foreground leading-tight">
              Gestão financeira <span className="text-primary">descomplicada</span> para empresas modernas
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Controle fluxo de caixa, receba pagamentos, gerencie comissões e tenha visão completa do seu negócio em uma única plataforma.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-14 px-8 text-base" onClick={() => navigate('/auth?signup=true')}>
                Criar minha conta grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-muted-foreground sm:hidden mt-2">Teste grátis, sem compromisso.</p>
            </div>
            
            {/* Hero Dashboard Preview (Abstract UI representation) */}
            <div className="mt-20 mx-auto max-w-5xl bg-card rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col relative z-10">
              <div className="h-12 bg-muted/50 border-b flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-br from-background to-muted/20">
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="h-8 w-48 bg-muted rounded-md mb-8" />
                  <div className="h-40 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center relative overflow-hidden">
                     <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                     <BarChart3 className="h-12 w-12 text-primary/40" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-24 bg-card border rounded-lg p-4 flex flex-col justify-center">
                    <div className="h-3 w-20 bg-emerald-100 rounded mb-2" />
                    <div className="h-6 w-32 bg-emerald-500/20 rounded" />
                  </div>
                  <div className="h-24 bg-card border rounded-lg p-4 flex flex-col justify-center">
                    <div className="h-3 w-20 bg-red-100 rounded mb-2" />
                    <div className="h-6 w-32 bg-red-500/20 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="funcionalidades" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo o que você precisa</h2>
              <p className="text-lg text-muted-foreground">
                Deixamos a complexidade de lado para focar no que realmente importa: o crescimento do seu negócio.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-2xl shadow-sm border transition-shadow hover:shadow-md">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 text-primary">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Fluxo de Caixa Claro</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Visualize suas receitas e despesas em tempo real. Identifique para onde seu dinheiro está indo com gráficos intuitivos e relatórios simplificados.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl shadow-sm border transition-shadow hover:shadow-md">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 text-primary">
                  <Wallet className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Controle de Múltiplas Empresas</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Gerencie diferentes filiais ou empresas na mesma conta (Multi-tenant). Alterne entre elas com um clique e mantenha os dados 100% separados e seguros.
                </p>
              </div>

              <div className="bg-card p-8 rounded-2xl shadow-sm border transition-shadow hover:shadow-md">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Papéis e Permissões</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Convide sua equipe. Defina quem é Dono (acesso total) e quem é Colaborador (apenas registro de lançamentos), garantindo segurança total da informação.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits List */}
        <section id="beneficios" className="py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">Por que escolher o Tenant Finance?</h2>
                <p className="text-lg text-muted-foreground">
                  Desenvolvido com tecnologia de ponta, focado na experiência do usuário e na segurança dos seus dados financeiros.
                </p>
                <ul className="space-y-4 pt-4">
                  {[
                    "Integração nativa com meios de pagamento (Pagar.me)",
                    "Gestão avançada de comissões para prestadores de serviço",
                    "Assinaturas flexíveis com período de teste grátis",
                    "Acesso seguro (PCI Compliance) e isolamento de dados (RLS)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full max-w-md mx-auto relative">
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full -z-10" />
                <div className="bg-gradient-to-br from-card to-muted p-1 rounded-2xl border shadow-xl">
                  <img 
                    src="/logo.png" 
                    alt="Tenant Finance" 
                    className="w-full h-auto rounded-xl bg-white mix-blend-multiply"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x600/f8fafc/0f172a?text=Tenant+Finance';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Pronto para transformar sua gestão?</h2>
            <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Junte-se a dezenas de empresas que simplificaram suas finanças. Comece hoje mesmo o seu período de teste.
            </p>
            <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-semibold" onClick={() => navigate('/auth?signup=true')}>
              Começar meu teste grátis
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-foreground">Tenant Finance</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Tenant Finance. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-sm">
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}