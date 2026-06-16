import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Cancellation() {
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
            <span className="font-bold">Cancelamento</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl prose prose-slate dark:prose-invert">
        <h1>Política de Cancelamento e Reembolso</h1>
        <p><strong>Última atualização:</strong> 16 de Junho de 2026</p>

        <p>
          A Previna tem o compromisso de garantir uma relação transparente com nossos clientes. Esta política define as regras e procedimentos para cancelamento de assinaturas e solicitação de reembolsos.
        </p>

        <h2>1. Direito de Arrependimento (Garantia de 7 Dias)</h2>
        <p>
          Em conformidade com o Artigo 49 do Código de Defesa do Consumidor (CDC), o usuário tem o direito de cancelar a sua assinatura e solicitar o reembolso integral do valor pago em até <strong>7 (sete) dias corridos</strong> após a data da primeira contratação.
        </p>
        <p>
          <strong>Atenção:</strong> Como oferecemos um período de teste gratuito (Free Trial) para a maioria dos nossos planos, o período de 7 dias de arrependimento é contado a partir da data de criação da conta/assinatura, e não da data da primeira cobrança após o término do trial.
        </p>

        <h2>2. Como Solicitar o Cancelamento</h2>
        <p>O cancelamento da assinatura pode ser realizado de forma autônoma e imediata através do próprio sistema:</p>
        <ol>
          <li>Acesse a sua conta no Previna.</li>
          <li>Navegue até a seção <strong>Configurações</strong>.</li>
          <li>Selecione a aba <strong>Assinatura</strong>.</li>
          <li>Clique na opção <strong>"Cancelar Assinatura"</strong> e confirme a ação.</li>
        </ol>

        <h2>3. Efeitos do Cancelamento</h2>
        <p>Ao realizar o cancelamento de um plano após o período de arrependimento de 7 dias:</p>
        <ul>
          <li><strong>Não haverá reembolso proporcional:</strong> O cancelamento impede a renovação da assinatura no ciclo seguinte. Não reembolsamos valores referentes aos dias não utilizados no mês em que o cancelamento for solicitado.</li>
          <li><strong>Acesso garantido:</strong> Você continuará tendo acesso total às funcionalidades premium do seu plano até o último dia do ciclo de faturamento já pago.</li>
          <li><strong>Modo Leitura:</strong> Após o fim do ciclo pago, sua conta entrará em "Modo Leitura". Você não perderá seus dados financeiros, mas perderá o acesso de escrita (lançar novas transações, adicionar novos colaboradores, etc) até que uma nova assinatura seja ativada.</li>
        </ul>

        <h2>4. Reembolsos por Falhas Técnicas</h2>
        <p>
          Caso ocorra uma cobrança indevida por falha técnica comprovada no nosso sistema ou duplicidade de pagamento no cartão de crédito, o Usuário deverá entrar em contato com o suporte em até 30 dias após o evento. Constatado o erro, o reembolso será processado no mesmo cartão de crédito utilizado na compra, obedecendo aos prazos da operadora do cartão (podendo levar de 1 a 2 faturas para constar).
        </p>
      </main>
    </div>
  );
}
