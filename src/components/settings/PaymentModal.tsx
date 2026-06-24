import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { Plan } from '@/types/finance';

interface PaymentModalProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ plan, isOpen, onClose }) => {
  const { currentClient, subscribeWithPagarme, currentAddress, saveAddress } = useFinance();
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    number: '',
    holderName: '',
    expiry: '',
    cvv: '',
    document: currentClient?.taxId || '',
    phone: '',
    zipCode: currentAddress?.zipCode || '',
    street: currentAddress?.street || '',
    numberStr: currentAddress?.number || '',
    complement: currentAddress?.complement || '',
    neighborhood: currentAddress?.neighborhood || '',
    city: currentAddress?.city || '',
    state: currentAddress?.state || '',
  });

  if (!plan || !currentClient) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'number') {
      maskedValue = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19);
    } else if (name === 'expiry') {
      maskedValue = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
    } else if (name === 'cvv') {
      maskedValue = value.replace(/\D/g, '').substring(0, 4);
    } else if (name === 'document') {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 11) {
        maskedValue = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      } else {
        maskedValue = clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      maskedValue = maskedValue.substring(0, 18);
    } else if (name === 'phone') {
      const clean = value.replace(/\D/g, '');
      if (clean.length <= 10) {
        maskedValue = clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else {
        maskedValue = clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      maskedValue = maskedValue.substring(0, 15);
    } else if (name === 'zipCode') {
      maskedValue = value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
    }

    setCardData(prev => ({ ...prev, [name]: maskedValue }));
  };

  const handleZipCodeBlur = async () => {
    const cleanZip = cardData.zipCode.replace(/\D/g, '');
    if (cleanZip.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setCardData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const publicKey = import.meta.env.VITE_PAGARME_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error("Chave pública (ou de criptografia) não encontrada. Verifique seu painel Pagar.me.");
      }

      // 1. Save Address first
      await saveAddress(currentClient.id, {
        type: 'billing',
        zipCode: cardData.zipCode,
        street: cardData.street,
        number: cardData.numberStr,
        complement: cardData.complement,
        neighborhood: cardData.neighborhood,
        city: cardData.city,
        state: cardData.state,
        country: 'BR',
        isMain: true
      });

      // 2. Tokenization via Pagar.me API v5 (Secure)
      const [expMonth, expYearStr] = cardData.expiry.split('/');
      const expYear = parseInt(expYearStr) + 2000;

      const response = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${publicKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card',
          card: {
            number: cardData.number.replace(/\s/g, ''),
            holder_name: cardData.holderName.trim(),
            exp_month: parseInt(expMonth),
            exp_year: expYear,
            cvv: cardData.cvv,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Dados do cartão inválidos.");
      }

      const cardToken = data.id;

      // 3. Call our backend with the safe TOKEN
      const success = await subscribeWithPagarme(
        currentClient.id, 
        plan.id, 
        cardToken, 
        cardData.document.replace(/\D/g, ''),
        cardData.holderName.trim(),
        cardData.phone.replace(/\D/g, ''),
        {
          zipCode: cardData.zipCode,
          street: cardData.street,
          number: cardData.numberStr,
          complement: cardData.complement,
          neighborhood: cardData.neighborhood,
          city: cardData.city,
          state: cardData.state,
        }
      );

      if (success) {
        onClose();
      }
    } catch (error: any) {
      console.error("Erro no processamento do pagamento:", error);
      toast({
        title: "Falha no Pagamento",
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Assinar Plano {plan.name}
            </DialogTitle>
            <DialogDescription>
              Insira os dados do seu cartão para ativar sua assinatura de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}/mês.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">Dados Pessoais</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="document">CPF ou CNPJ</Label>
                <Input 
                  id="document" 
                  name="document"
                  placeholder="000.000.000-00" 
                  required 
                  value={cardData.document}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input 
                  id="phone" 
                  name="phone"
                  placeholder="(00) 00000-0000" 
                  required 
                  value={cardData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mt-2">Endereço de Cobrança</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="zipCode">CEP</Label>
                <Input 
                  id="zipCode" 
                  name="zipCode"
                  placeholder="00000-000" 
                  required 
                  value={cardData.zipCode}
                  onChange={handleInputChange}
                  onBlur={handleZipCodeBlur}
                />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input 
                  id="street" 
                  name="street"
                  required 
                  value={cardData.street}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="numberStr">Número</Label>
                <Input 
                  id="numberStr" 
                  name="numberStr"
                  required 
                  value={cardData.numberStr}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input 
                  id="complement" 
                  name="complement"
                  value={cardData.complement}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2 col-span-1">
                <Label htmlFor="state">Estado</Label>
                <Input 
                  id="state" 
                  name="state"
                  required 
                  maxLength={2}
                  placeholder="UF"
                  value={cardData.state}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="city">Cidade</Label>
                <Input 
                  id="city" 
                  name="city"
                  required 
                  value={cardData.city}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1 mt-2">Dados do Cartão</h4>
            <div className="grid gap-2">
              <Label htmlFor="holderName">Nome no Cartão</Label>
              <Input 
                id="holderName" 
                name="holderName"
                placeholder="Como impresso no cartão" 
                required 
                value={cardData.holderName}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="number">Número do Cartão</Label>
              <Input 
                id="number" 
                name="number"
                placeholder="0000 0000 0000 0000" 
                required 
                value={cardData.number}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expiry">Validade</Label>
                <Input 
                  id="expiry" 
                  name="expiry"
                  placeholder="MM/AA" 
                  required 
                  value={cardData.expiry}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input 
                  id="cvv" 
                  name="cvv"
                  placeholder="123" 
                  required 
                  value={cardData.cvv}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mr-auto mb-2 sm:mb-0">
              <Lock className="h-3 w-3" />
              Pagamento Seguro via Pagar.me
            </div>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Ativar Agora'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
