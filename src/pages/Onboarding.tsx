import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, CreditCard, Sparkles, Building2, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan');

  const { 
    isAuthenticated,
    authLoading,
    userProfile,
    plans, 
    loadingPlans, 
    addClient, 
    changePlan, 
    subscribeWithPagarme,
    saveBillingMethod, 
    clients, 
    loadingClients,
    currentSubscription,
    loadingSubscription,
    currentAddress, 
    saveAddress
  } = useFinance();
  
  const [step, setStep] = useState(1);
  
  // Credentials State for guests
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Company State
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address State (Moved to Step 3 / billing)
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [numberStr, setNumberStr] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-select plan from query parameter or default to 'Avançado'
  useEffect(() => {
    if (plans.length > 0) {
      if (planParam) {
        const matchedPlan = plans.find(p => p.name.toLowerCase() === planParam.toLowerCase());
        if (matchedPlan) {
          setSelectedPlanId(matchedPlan.id);
          return;
        }
      }
      // Default fallback to 'Avançado' plan if not specified or not matched
      const defaultPlan = plans.find(p => p.name.toLowerCase() === 'avançado');
      if (defaultPlan) {
        setSelectedPlanId(defaultPlan.id);
      }
    }
  }, [planParam, plans]);

  useEffect(() => {
    // Redirect only if authenticated and already fully onboarded (has client & active subscription)
    if (!authLoading && isAuthenticated && userProfile?.isAdmin) {
      navigate('/app', { replace: true });
      return;
    }

    if (!authLoading && isAuthenticated && !loadingClients && !loadingSubscription && clients.length > 0 && currentSubscription) {
      navigate('/app', { replace: true });
    }
    
    // If authenticated but without plan subscription, auto-set step 2
    if (!authLoading && isAuthenticated && !loadingClients && !loadingSubscription && clients.length > 0 && !currentSubscription) {
      setStep(2);
      if (clients[0]) {
        setCompanyName(clients[0].name);
        setTaxId(clients[0].taxId || '');
      }
      if (currentAddress) {
        setZipCode(currentAddress.zipCode || '');
        setStreet(currentAddress.street || '');
        setNumberStr(currentAddress.number || '');
        setComplement(currentAddress.complement || '');
        setNeighborhood(currentAddress.neighborhood || '');
        setCity(currentAddress.city || '');
        setStateCode(currentAddress.state || '');
      }
    }
  }, [isAuthenticated, authLoading, userProfile, clients, loadingClients, currentSubscription, loadingSubscription, navigate, currentAddress]);

  const handleZipCodeBlur = async () => {
    const cleanZip = zipCode.replace(/\D/g, '');
    if (cleanZip.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setStreet(data.logradouro);
          setNeighborhood(data.bairro);
          setCity(data.localidade);
          setStateCode(data.uf);
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!companyName.trim()) {
        toast({ title: 'Erro', description: 'Por favor, informe o nome da empresa', variant: 'destructive' });
        return;
      }
      if (!phone.trim()) {
        toast({ title: 'Erro', description: 'Por favor, informe o telefone', variant: 'destructive' });
        return;
      }

      // If user is a guest, we must register first
      if (!isAuthenticated) {
        if (!email.trim() || !password.trim()) {
          toast({ title: 'Erro', description: 'E-mail e senha são obrigatórios para criar sua conta', variant: 'destructive' });
          return;
        }
        if (password.length < 6) {
          toast({ title: 'Erro', description: 'A senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
          return;
        }

        setLoading(true);
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
          });

          if (error) throw error;

          if (!data.session) {
            toast({
              title: 'Conta criada!',
              description: 'Verifique seu e-mail para ativar sua conta antes de continuar.',
            });
            setLoading(false);
            return;
          }

          // Create client under new user session (address is created in step 3 or saved as blank for now)
          await addClient({ name: companyName, taxId });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          toast({ title: 'Erro ao criar conta', description: message, variant: 'destructive' });
          setLoading(false);
          return;
        }
        setLoading(false);
      } else {
        // If authenticated but no client, create client
        if (clients.length === 0) {
          setLoading(true);
          try {
            await addClient({ name: companyName, taxId });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            toast({ title: 'Erro ao criar empresa', description: message, variant: 'destructive' });
            setLoading(false);
            return;
          }
          setLoading(false);
        }
      }
    }

    if (step === 2) {
      if (!selectedPlanId) {
        toast({ title: 'Erro', description: 'Por favor, selecione um plano', variant: 'destructive' });
        return;
      }

      const targetPlan = plans.find(p => p.id === selectedPlanId);
      if (targetPlan && targetPlan.price === 0) {
        // Free Plan: complete onboarding directly without payment step!
        setLoading(true);
        try {
          const clientId = clients.length > 0 ? clients[0].id : null;
          if (clientId) {
            await changePlan(clientId, selectedPlanId);
            toast({ title: 'Sucesso!', description: 'Conta configurada com sucesso no plano grátis.' });
            navigate('/app', { replace: true });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          toast({ title: 'Erro', description: message, variant: 'destructive' });
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    setStep(s => s + 1);
  };

  const handleComplete = async () => {
    if (!zipCode || !street || !numberStr || !city || !stateCode) {
      toast({ title: 'Erro', description: 'Por favor, preencha os campos obrigatórios do endereço de cobrança', variant: 'destructive' });
      return;
    }
    
    if (!cardNumber || !cardName || !cardExpiry || !cardCVC) {
      toast({ title: 'Erro', description: 'Preencha os dados do cartão de crédito', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    
    try {
      let clientId = clients.length > 0 ? clients[0].id : null;
      if (!clientId) {
        clientId = await addClient({ name: companyName, taxId }) || null;
      }
      
      if (clientId && selectedPlanId) {
        // Save Address in Step 3
        await saveAddress(clientId, {
          type: 'billing',
          zipCode,
          street,
          number: numberStr,
          complement,
          neighborhood,
          city,
          state: stateCode,
          country: 'BR',
          isMain: true
        });

        const targetPlan = plans.find(p => p.id === selectedPlanId);
        
        // Add subscription
        if (targetPlan && targetPlan.price > 0) {
          // Tokenization via Pagar.me API v5
          const publicKey = import.meta.env.VITE_PAGARME_PUBLIC_KEY;
          if (!publicKey) {
            throw new Error("Chave pública do Pagar.me não encontrada.");
          }

          const [expMonth, expYearStr] = cardExpiry.split('/');
          const expYear = parseInt(expYearStr) + 2000;

          const tokenResponse = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${publicKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'card',
              card: {
                number: cardNumber.replace(/\s/g, ''),
                holder_name: cardName.trim(),
                exp_month: parseInt(expMonth),
                exp_year: expYear,
                cvv: cardCVC,
              }
            })
          });

          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            throw new Error(tokenData.message || "Dados do cartão inválidos.");
          }

          const cardToken = tokenData.id;
          
          const success = await subscribeWithPagarme(
            clientId, 
            selectedPlanId, 
            cardToken, 
            taxId.replace(/\D/g, ''), 
            cardName.trim(),
            phone.replace(/\D/g, ''),
            {
              zipCode,
              street,
              number: numberStr,
              complement,
              neighborhood,
              city,
              state: stateCode,
            }
          );
          
          if (!success) throw new Error("Falha ao processar assinatura.");
        } else {
          // Simple change for free plans (fallback safety)
          await changePlan(clientId, selectedPlanId);
        }

        // Save local billing method reference
        await saveBillingMethod(clientId, {
          cardHolderName: cardName,
          cardLast4: cardNumber.slice(-4),
          cardBrand: 'Visa', 
          cardExpiry: cardExpiry,
          isDefault: true
        });
        
        toast({ title: 'Sucesso!', description: 'Conta configurada com sucesso.' });
        navigate('/app', { replace: true });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro desconhecido';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingClients || loadingPlans || (isAuthenticated && loadingSubscription)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const requiresImmediatePayment = selectedPlan?.trialDays === 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 font-sans">
      <div className="max-w-4xl w-full">
        {/* Header Steps */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-4">
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-bold", step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>1</div>
            <div className={cn("h-1 w-16", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-bold", step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</div>
            <div className={cn("h-1 w-16", step >= 3 ? "bg-primary" : "bg-muted")} />
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-bold", step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>3</div>
          </div>
        </div>

        {step === 1 && (
          <Card className="max-w-md mx-auto animate-fade-in shadow-lg border-primary/20">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">Dados Cadastrais</CardTitle>
              <CardDescription>Crie seus dados de acesso e da sua empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              
              {/* Credentials Form (Only shown if guest) */}
              {!isAuthenticated && (
                <>
                  <h4 className="font-semibold text-sm text-primary border-b pb-1">Dados de Acesso</h4>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="seu@email.com" 
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="Mínimo 6 caracteres" 
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <h4 className="font-semibold text-sm text-primary border-b pb-1 pt-2">Empresa & Contato</h4>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa *</Label>
                <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Minha Empresa LTDA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">CNPJ / CPF (Opcional)</Label>
                <Input 
                  id="taxId" 
                  value={taxId} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    let masked = val;
                    if (val.length <= 11) {
                      masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                    } else {
                      masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                    }
                    setTaxId(masked.substring(0, 18));
                  }} 
                  placeholder="00.000.000/0001-00" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <Input 
                  id="phone" 
                  value={phone} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    let masked = val;
                    if (val.length <= 10) {
                      masked = val.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                    } else {
                      masked = val.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                    }
                    setPhone(masked.substring(0, 15));
                  }} 
                  placeholder="(11) 99999-9999" 
                />
              </div>

            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full" size="lg" onClick={handleNext} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Criando Conta...' : 'Continuar'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                      await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (err) {
                      console.error("Sign out error:", err);
                    }
                    navigate('/auth');
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Entre aqui
                </button>
              </div>
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Escolha seu plano</h2>
              <p className="text-muted-foreground">Selecione o plano ideal para o seu negócio</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:border-primary/50 relative shadow-sm",
                    selectedPlanId === plan.id && "border-primary ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md bg-primary/5"
                  )}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {plan.name === 'Avançado' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-primary to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Sparkles className="h-3 w-3" /> Recomendado
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                    {plan.trialDays > 0 ? (
                      <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        {plan.trialDays} dias grátis (período de testes)
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Cobrança imediata
                      </p>
                    )}
                    <ul className="space-y-2 pt-4 border-t">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500" /> 
                        Fluxo de caixa básico
                      </li>
                      <li className={cn("flex items-center gap-2 text-sm", !plan.features.payment_methods && "text-muted-foreground opacity-60")}>
                        <Check className={cn("h-4 w-4", plan.features.payment_methods ? "text-emerald-500" : "opacity-0")} /> 
                        Formas de Recebimento
                      </li>
                      <li className={cn("flex items-center gap-2 text-sm", !plan.features.commissions && "text-muted-foreground opacity-60")}>
                        <Check className={cn("h-4 w-4", plan.features.commissions ? "text-emerald-500" : "opacity-0")} /> 
                        Gestão de Comissões
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-between mt-8 max-w-3xl mx-auto px-4">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>Voltar</Button>
              <Button size="lg" onClick={handleNext}>
                {plans.find(p => p.id === selectedPlanId)?.price === 0 ? 'Concluir Cadastro' : 'Continuar para Pagamento'}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <Card className="max-w-md mx-auto animate-fade-in shadow-lg border-primary/20">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-2xl">Dados de Faturamento</CardTitle>
              <CardDescription>
                {requiresImmediatePayment 
                  ? "Seu plano será cobrado imediatamente." 
                  : "Você terá 7 dias grátis. A cobrança ocorrerá apenas após este período."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              
              {/* Billing Address (Moved here) */}
              <h4 className="font-semibold text-sm text-primary border-b pb-1">Endereço de Cobrança</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2 col-span-1">
                  <Label htmlFor="zipCode">CEP *</Label>
                  <Input 
                    id="zipCode" 
                    placeholder="00000-000" 
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9))}
                    onBlur={handleZipCodeBlur}
                  />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="street">Rua *</Label>
                  <Input id="street" value={street} onChange={e => setStreet(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2 col-span-1">
                  <Label htmlFor="numberStr">Número *</Label>
                  <Input id="numberStr" value={numberStr} onChange={e => setNumberStr(e.target.value)} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input id="complement" value={complement} onChange={e => setComplement(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2 col-span-1">
                  <Label htmlFor="stateCode">Estado *</Label>
                  <Input id="stateCode" maxLength={2} placeholder="UF" value={stateCode} onChange={e => setStateCode(e.target.value.toUpperCase())} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} />
                </div>
              </div>

              {/* Credit Card Details */}
              <h4 className="font-semibold text-sm text-primary border-b pb-1 mt-6">Dados do Cartão</h4>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do Cartão *</Label>
                <Input 
                  id="cardNumber" 
                  placeholder="0000 0000 0000 0000" 
                  value={cardNumber} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19);
                    setCardNumber(val);
                  }} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardName">Nome no Cartão *</Label>
                <Input id="cardName" placeholder="NOME COMO ESTÁ NO CARTÃO" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Validade *</Label>
                  <Input 
                    id="cardExpiry" 
                    placeholder="MM/AA" 
                    value={cardExpiry} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
                      setCardExpiry(val);
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardCVC">CVV *</Label>
                  <Input 
                    id="cardCVC" 
                    type="password" 
                    maxLength={4} 
                    placeholder="123" 
                    value={cardCVC} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                      setCardCVC(val);
                    }} 
                  />
                </div>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg mt-4 border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plano selecionado:</span>
                  <span className="font-semibold">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Cobrado Hoje:</span>
                  <span className="font-semibold text-emerald-600">
                    {requiresImmediatePayment ? `R$ ${selectedPlan?.price.toFixed(2)}/mês` : 'R$ 0,00 (Teste Grátis)'}
                  </span>
                </div>
                {!requiresImmediatePayment && (
                  <div className="flex justify-between text-sm pt-2 border-t border-dashed">
                    <span className="text-muted-foreground">Após o período gratuito:</span>
                    <span className="font-semibold text-red-500">
                      R$ {selectedPlan?.price.toFixed(2)}/mês
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? 'Finalizando...' : 'Concluir Cadastro'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
