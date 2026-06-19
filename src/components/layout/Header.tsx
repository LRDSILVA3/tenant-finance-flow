// Header Component with Client and Language Selectors

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Language } from '@/types/finance';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Globe, Plus, LogOut, User, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const languageLabels: Record<Language, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
};

const languageFlags: Record<Language, string> = {
  pt: '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸',
};

export const Header: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    clients, 
    currentClient, 
    setCurrentClient, 
    addClient,
    loadingClients,
    signOut,
    updateProfile,
    userProfile,
    userSettings,
    currentPlan,
    t 
  } = useFinance();

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTaxId, setNewClientTaxId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(userProfile?.whatsappNumber || '');
  const [addingClient, setAddingClient] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const canUseIA = userSettings.enableWhatsappIA || userProfile?.isAdmin;

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    
    setAddingClient(true);
    await addClient({
      name: newClientName.trim(),
      taxId: newClientTaxId.trim() || undefined,
    });
    setAddingClient(false);
    setNewClientName('');
    setNewClientTaxId('');
    setIsAddClientOpen(false);
  };

  const handleUpdateProfile = async () => {
    if (!canUseIA) return;
    setUpdatingProfile(true);
    // Remove tudo que não for número antes de salvar
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    await updateProfile({ whatsappNumber: cleanNumber || undefined });
    setUpdatingProfile(false);
    setIsProfileOpen(false);
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
    if (numbers.length <= 9) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-24 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-auto min-w-[80px] items-center justify-center rounded-lg overflow-hidden">
            <img src="/logo.png" alt="Previna Logo" className="h-full w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Client Selector */}
          <div className="flex items-center gap-2">
            <Select
              value={currentClient?.id || ''}
              onValueChange={(id) => {
                const client = clients.find((c) => c.id === id);
                if (client) setCurrentClient(client);
              }}
              disabled={loadingClients}
            >
              <SelectTrigger className="w-[160px] sm:w-[200px] bg-background">
                {loadingClients ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <SelectValue placeholder={t.selectClient} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
                {clients.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {t.noData}
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsAddClientOpen(true)}
              title={t.addCategory}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Language Selector */}
          <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
            <SelectTrigger className="w-[120px] bg-background">
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(languageLabels) as Language[]).map((lang) => (
                <SelectItem key={lang} value={lang}>
                  <span className="flex items-center gap-2">
                    <span>{languageFlags[lang]}</span>
                    <span>{languageLabels[lang]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setWhatsappNumber(userProfile?.whatsappNumber || '');
                setIsProfileOpen(true);
              }}>
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meu Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className={cn("space-y-2", !canUseIA && "opacity-60")}>
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp">Número de WhatsApp (IA)</Label>
                {!canUseIA && (
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1">
                    <Sparkles className="h-3 w-3" /> Requer Plano Avançado
                  </Badge>
                )}
              </div>
              <Input
                id="whatsapp"
                value={formatPhoneNumber(whatsappNumber)}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="+55 (11) 99999-9999"
                disabled={!canUseIA}
              />
              <p className="text-xs text-muted-foreground">
                Informe seu número com DDI e DDD (somente números) para testar a integração com a IA via WhatsApp.
              </p>
              {!canUseIA && (
                <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-100">
                  <p className="text-xs text-amber-700 font-medium">
                    Funcionalidade exclusiva do plano Avançado. Faça um upgrade para habilitar o lançamento automático via WhatsApp.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleUpdateProfile} disabled={updatingProfile || !canUseIA}>
              {updatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                t.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome da Empresa</Label>
              <Input
                id="client-name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-taxid">CNPJ (opcional)</Label>
              <Input
                id="client-taxid"
                value={newClientTaxId}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  let masked = val;
                  if (val.length <= 11) {
                    masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                  } else {
                    masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                  }
                  setNewClientTaxId(masked.substring(0, 18));
                }}
                placeholder="00.000.000/0001-00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleAddClient} disabled={!newClientName.trim() || addingClient}>
              {addingClient ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                t.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};
