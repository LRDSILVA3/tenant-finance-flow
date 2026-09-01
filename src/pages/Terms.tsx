import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Previna Logo" className="h-6 w-auto" />
            <span className="font-bold">Termos de Uso</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl prose prose-slate dark:prose-invert">
        <h1>Termos e Condições de Uso</h1>
        <p><strong>Última atualização:</strong> 16 de Junho de 2026</p>

        <p>
          Bem-vindo ao Previna. Estes Termos de Uso regulam a utilização do software de gestão financeira ("Sistema") oferecido pela NEWFEEL TEC, sob o CNPJ 43.186.726/0001-73 ("Nós", "Nossa", "Empresa"). Ao criar uma conta e utilizar o Sistema, você ("Usuário", "Cliente") concorda expressamente com todas as regras aqui descritas.
        </p>

        <h2>1. Objeto</h2>
        <p>
          O Previna é uma plataforma online (SaaS - Software as a Service) desenvolvida para auxiliar empresas na gestão de fluxo de caixa, controle de comissões, gerenciamento de múltiplos CNPJs (multi-empresas) e recebimentos.
        </p>

        <h2>2. Responsabilidades do Usuário</h2>
        <ul>
          <li><strong>Veracidade dos Dados:</strong> O Usuário é o único responsável pela precisão, legalidade e veracidade dos dados financeiros, fiscais e pessoais inseridos no Sistema.</li>
          <li><strong>Uso Legal:</strong> É terminantemente proibido o uso do Sistema para atividades ilícitas, fraudes, lavagem de dinheiro ou qualquer fim que viole a legislação brasileira.</li>
          <li><strong>Segurança da Conta:</strong> O Usuário é responsável por manter a confidencialidade de suas credenciais de acesso (e-mail e senha) e pelas ações realizadas por colaboradores convidados para o seu ambiente.</li>
        </ul>

        <h2>3. Isenção de Responsabilidade e Ausência de Garantia de Resultados</h2>
        <p>
          O Previna atua exclusivamente como uma plataforma de registro de lançamentos e cálculo de métricas financeiras. Nós <strong>não</strong> entregamos, prometemos ou garantimos quaisquer resultados financeiros, lucros, melhorias de performance ou sucesso empresarial. O Sistema é uma ferramenta de meio para organização de dados inseridos pelo próprio Usuário, e <strong>não</strong> presta serviços de contabilidade, auditoria, assessoria jurídica ou consultoria financeira. Qualquer decisão de negócios ou financeira tomada com base nas métricas e relatórios gerados pelo Sistema é de responsabilidade única e exclusiva do Usuário.
        </p>
        <p>
          Embora nos esforcemos para manter o Sistema operando 24/7, não garantimos a disponibilidade ininterrupta do serviço, podendo ocorrer paradas para manutenção programada ou falhas de provedores de infraestrutura (nuvem). Não nos responsabilizamos por perdas de lucro cessante decorrentes de indisponibilidade temporária.
        </p>

        <h2>4. Propriedade Intelectual</h2>
        <p>
          Todo o código-fonte, design, logotipos, marcas e interfaces do Previna são de propriedade exclusiva da Empresa. A contratação de um plano concede ao Usuário uma licença de uso temporária, não exclusiva e revogável, não configurando venda do software.
        </p>

        <h2>5. Pagamentos e Assinaturas</h2>
        <p>
          Os valores dos planos, periodicidade e métodos de pagamento estão descritos na plataforma e na página de contratação. O processamento dos pagamentos é realizado por empresas terceiras (gateways de pagamento), sendo o Usuário submetido também aos termos destas intermediadoras.
        </p>
        <p>
          Caso o plano contratado inclua um período de testes gratuito (Free Trial), a cobrança recorrente será iniciada automaticamente após o término do referido período, a menos que o Usuário solicite o cancelamento da assinatura através da plataforma antes do encerramento do prazo de testes.
        </p>

        <h2>6. Cancelamento e Encerramento</h2>
        <p>
          O Usuário pode cancelar a assinatura a qualquer momento através do painel de Configurações. Consulte nossa Política de Cancelamento para mais detalhes sobre prazos e reembolsos. A Empresa reserva-se o direito de suspender ou encerrar contas que violem estes Termos de Uso.
        </p>

        <h2>7. Foro</h2>
        <p>
          Fica eleito o foro da comarca da sede da Empresa para dirimir quaisquer controvérsias oriundas destes Termos, com renúncia a qualquer outro.
        </p>
      </main>
    </div>
  );
}
