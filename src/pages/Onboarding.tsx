import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, CreditCard, Sparkles, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function Onboarding() {
  const navigate = useNavigate();
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
    loadingSubscription
  } = useFinance();
  
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address State
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
  const { currentAddress, saveAddress } = useFinance();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
      return;
    }

    if (userProfile?.isAdmin) {
      navigate('/app', { replace: true });
      return;
    }

    if (!loadingClients && !loadingSubscription && clients.length > 0 && currentSubscription) {
      navigate('/app', { replace: true });
    }
    
    if (!loadingClients && !loadingSubscription && clients.length > 0 && !currentSubscription) {
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

  const handleNext = () => {
    if (step === 1) {
      if (!companyName.trim()) {
        toast({ title: 'Erro', description: 'Por favor, informe o nome da empresa', variant: 'destructive' });
        return;
      }
      if (!zipCode || !street || !numberStr || !city || !stateCode) {
        toast({ title: 'Erro', description: 'Por favor, preencha os campos obrigatórios do endereço', variant: 'destructive' });
        return;
      }
    }
    if (step === 2 && !selectedPlanId) {
      toast({ title: 'Erro', description: 'Por favor, selecione um plano', variant: 'destructive' });
      return;
    }
    setStep(s => s + 1);
  };

  const handleComplete = async () => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCVC) {
      toast({ title: 'Erro', description: 'Preencha os dados do cartão', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    
    try {
      let clientId = clients.length > 0 ? clients[0].id : null;
      if (!clientId) {
        clientId = await addClient({ name: companyName, taxId }) || null;
      }
      
      if (clientId && selectedPlanId) {
        // Save Address
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

        
        // 2. Add subscription
        if (targetPlan && targetPlan.price > 0) {
          // 2.1 Tokenization via Pagar.me API v5 (Secure)
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
          
          // 2.2 Call backend with the safe TOKEN
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
          // Simple change for free plans
          await changePlan(clientId, selectedPlanId);
        }

        // 3. Save local billing method reference
        await saveBillingMethod(clientId, {
          cardHolderName: cardName,
          cardLast4: cardNumber.slice(-4),
          cardBrand: 'Visa', 
          cardExpiry: cardExpiry,
          isDefault: true
        });
        
        toast({ title: 'Sucesso!', description: 'Conta configurada com sucesso.' });
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao configurar sua conta', variant: 'destructive' });
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
  const requiresImmediatePayment = selectedPlan?.trialMonths === 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
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
              <CardTitle className="text-2xl">Dados da Empresa</CardTitle>
              <CardDescription>Qual empresa você vai gerenciar?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
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

              <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mt-4">Endereço de Cobrança</h4>
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

            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={handleNext}>Continuar</Button>
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
                      <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
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
                    {plan.trialMonths > 0 ? (
                      <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        {plan.trialMonths} {plan.trialMonths === 1 ? 'mês grátis' : 'meses grátis'}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Cobrança imediata
                      </p>
                    )}
                    <ul className="space-y-2 pt-4 border-t">
                      <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-500" /> Fluxo de caixa básico</li>
                      <li className={cn("flex items-center gap-2 text-sm", !plan.features.payment_methods && "text-muted-foreground opacity-60")}><Check className={cn("h-4 w-4", plan.features.payment_methods ? "text-emerald-500" : "opacity-0")} /> Formas de Recebimento</li>
                      <li className={cn("flex items-center gap-2 text-sm", !plan.features.commissions && "text-muted-foreground opacity-60")}><Check className={cn("h-4 w-4", plan.features.commissions ? "text-emerald-500" : "opacity-0")} /> Gestão de Comissões</li>
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-between mt-8 max-w-3xl mx-auto px-4">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>Voltar</Button>
              <Button size="lg" onClick={handleNext}>Continuar para Pagamento</Button>
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
              <CardTitle className="text-2xl">Forma de Pagamento</CardTitle>
              <CardDescription>
                {requiresImmediatePayment 
                  ? "Seu plano será cobrado imediatamente." 
                  : `Você terá ${selectedPlan?.trialMonths} meses grátis. A cobrança ocorrerá apenas após este período.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do Cartão</Label>
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
                <Label htmlFor="cardName">Nome no Cartão</Label>
                <Input id="cardName" placeholder="NOME COMO ESTÁ NO CARTÃO" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Validade</Label>
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
                  <Label htmlFor="cardCVC">CVV</Label>
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
              
              <div className="p-4 bg-muted/50 rounded-lg mt-4 border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Plano selecionado:</span>
                  <span className="font-semibold">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold text-primary">
                    {requiresImmediatePayment ? `R$ ${selectedPlan?.price.toFixed(2)}/mês` : 'Grátis (período de teste)'}
                  </span>
                </div>
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
