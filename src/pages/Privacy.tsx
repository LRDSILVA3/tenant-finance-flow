import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
            <span className="font-bold">Privacidade</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl prose prose-slate dark:prose-invert">
        <h1>Política de Privacidade</h1>
        <p><strong>Última atualização:</strong> 16 de Junho de 2026</p>

        <p>
          A NEWFEEL TEC, sob o CNPJ 43.186.726/0001-73 ("Nós"), proprietária do Previna, valoriza a sua privacidade. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e compartilhamos os seus dados pessoais e empresariais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
        </p>

        <h2>1. Dados que Coletamos</h2>
        <p>Ao utilizar nosso Sistema, podemos coletar os seguintes dados:</p>
        <ul>
          <li><strong>Dados de Cadastro:</strong> Nome, E-mail, Senha (criptografada).</li>
          <li><strong>Dados da Empresa:</strong> Nome da Empresa, CNPJ/CPF, Telefone, Endereço de Cobrança.</li>
          <li><strong>Dados Financeiros:</strong> Lançamentos de receitas e despesas que você insere no sistema. <em>Nota: Dados de cartão de crédito não são armazenados em nossos servidores, sendo diretamente tokenizados e processados pelo nosso provedor de pagamentos (Pagar.me).</em></li>
          <li><strong>Dados de Navegação:</strong> Endereço IP, tipo de navegador e dados de uso (cookies) para melhorar a experiência no sistema.</li>
        </ul>

        <h2>2. Como Usamos os Dados</h2>
        <p>Os dados coletados são utilizados estritamente para:</p>
        <ul>
          <li>Fornecer, operar e manter o Sistema funcionando.</li>
          <li>Processar transações financeiras e emitir cobranças referentes às assinaturas.</li>
          <li>Enviar avisos técnicos, atualizações de segurança e alertas de suporte.</li>
          <li>Prestar atendimento ao cliente e suporte técnico.</li>
        </ul>

        <h2>3. Compartilhamento de Dados</h2>
        <p>Nós não vendemos seus dados. Seus dados só são compartilhados com terceiros nas seguintes situações:</p>
        <ul>
          <li><strong>Provedores de Pagamento:</strong> Compartilhamos dados cadastrais (Nome, CPF/CNPJ, Endereço, E-mail) e tokens de cartão com o <strong>Pagar.me</strong> exclusivamente para o processamento da sua assinatura.</li>
          <li><strong>Infraestrutura:</strong> Utilizamos serviços de nuvem de empresas reconhecidas mundialmente (como Supabase) para hospedar o banco de dados com segurança.</li>
          <li><strong>Obrigação Legal:</strong> Para cumprir ordens judiciais ou solicitações de autoridades governamentais competentes.</li>
        </ul>

        <h2>4. Armazenamento e Segurança</h2>
        <p>
          Adotamos as melhores práticas de segurança da informação (como criptografia em trânsito e em repouso, e controle de acesso via Row Level Security - RLS) para proteger seus dados contra acesso não autorizado, alteração ou destruição. Seus dados são isolados para garantir que apenas membros autorizados da sua empresa possam visualizá-los.
        </p>

        <h2>5. Seus Direitos (LGPD)</h2>
        <p>Você tem o direito de, a qualquer momento:</p>
        <ul>
          <li>Solicitar acesso aos dados que temos sobre você.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.</li>
          <li>Solicitar a portabilidade dos dados ou a exclusão definitiva da sua conta e registros financeiros (Direito ao Esquecimento).</li>
        </ul>
        <p>Para exercer seus direitos, entre em contato conosco através dos nossos canais de suporte.</p>
      </main>
    </div>
  );
}
