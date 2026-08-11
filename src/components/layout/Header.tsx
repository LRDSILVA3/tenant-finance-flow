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
import { 
  Building2, 
  Globe, 
  Plus, 
  LogOut, 
  User, 
  Loader2, 
  Sparkles, 
  Bell, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Check, 
  CheckCheck, 
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

interface HeaderProps {
  onViewChange?: (view: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ onViewChange }) => {
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
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    t 
  } = useFinance();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme === 'system' ? resolvedTheme : theme;

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

            {/* Sino de Notificações */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative hover:bg-muted/60 transition-all rounded-full duration-300 h-9 w-9"
                  title="Notificações"
                >
                  <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors duration-200" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm animate-pulse">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 shadow-xl border-border bg-card/95 backdrop-blur-md overflow-hidden rounded-xl animate-in fade-in zoom-in-95 duration-200" align="end">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-primary" /> Notificações
                  </span>
                  {unreadNotificationsCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={markAllNotificationsAsRead}
                      className="h-7 text-[10px] px-2 text-primary hover:text-primary-hover font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> Ler todas
                    </Button>
                  )}
                </div>
                
                {/* List */}
                <div className="max-h-[300px] overflow-y-auto divide-y divide-border/60">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 text-muted-foreground/30 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-medium">Nenhuma notificação por aqui!</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Tudo limpo e sob controle.</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      let Icon = Bell;
                      let iconColor = "text-blue-500 bg-blue-500/10";
                      if (n.type === 'low_stock') {
                        Icon = AlertTriangle;
                        iconColor = "text-amber-500 bg-amber-500/10";
                      } else if (n.type === 'expired_product') {
                        Icon = Clock;
                        iconColor = "text-red-500 bg-red-500/10";
                      } else if (n.type === 'expiring_product') {
                        Icon = Clock;
                        iconColor = "text-amber-500 bg-amber-500/10";
                      } else if (n.type === 'plan_expiration') {
                        Icon = Calendar;
                        iconColor = "text-purple-500 bg-purple-500/10";
                      }
                      
                      return (
                        <div 
                          key={n.id} 
                          className={cn(
                            "p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors relative group",
                            !n.read && "bg-primary/5/30"
                          )}
                        >
                          <div className={cn("p-1.5 rounded-lg shrink-0", iconColor)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <p className={cn("text-xs font-semibold leading-normal truncate", !n.read ? "text-foreground" : "text-muted-foreground")}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-normal mt-0.5 break-words">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-muted-foreground/60 block mt-1.5">
                              {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(n.date))}
                            </span>
                          </div>
                          
                          {/* Actions overlay */}
                          <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {!n.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-muted"
                                onClick={() => markNotificationAsRead(n.id)}
                                title="Marcar como lida"
                              >
                                <Check className="h-3 w-3 text-emerald-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive"
                              onClick={() => clearNotification(n.id)}
                              title="Excluir alerta"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* Footer */}
                {onViewChange && (
                  <div className="border-t p-2 text-center bg-muted/10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs text-primary hover:text-primary-hover font-semibold py-1 h-8"
                      onClick={() => onViewChange('notifications')}
                    >
                      Ver todas as notificações
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            title={currentTheme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            className="h-9 w-9 text-muted-foreground hover:text-foreground mr-1"
          >
            {currentTheme === 'dark' ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </Button>

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
              {/* <DropdownMenuItem onClick={() => {
                setWhatsappNumber(userProfile?.whatsappNumber || '');
                setIsProfileOpen(true);
              }}>
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator /> */}
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile Dialog (Commented out because WhatsApp IA is not ready to sell yet) */}
      {/* <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
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
      </Dialog> */}

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
