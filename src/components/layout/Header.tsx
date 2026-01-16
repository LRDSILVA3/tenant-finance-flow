// Header Component with Client and Language Selectors

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Language } from '@/types/finance';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Globe } from 'lucide-react';

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
  const { language, setLanguage, clients, currentClient, setCurrentClient, t } = useFinance();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">
            {t.appName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Client Selector */}
          <Select
            value={currentClient?.id || ''}
            onValueChange={(id) => {
              const client = clients.find((c) => c.id === id);
              if (client) setCurrentClient(client);
            }}
          >
            <SelectTrigger className="w-[180px] sm:w-[220px] bg-background">
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={t.selectClient} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Language Selector */}
          <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
            <SelectTrigger className="w-[130px] bg-background">
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
        </div>
      </div>
    </header>
  );
};
