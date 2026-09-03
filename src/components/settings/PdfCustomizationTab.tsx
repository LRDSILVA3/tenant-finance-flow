// PdfCustomizationTab.tsx - Aba de Personalização Visual de Documentos e PDFs para o Usuário

import React, { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import {
  PdfCustomizationSettings,
  defaultPdfSettings,
  pdfThemePresets,
  getPdfSettings,
  savePdfSettings,
} from '@/lib/pdfCustomization';
import { generateOrderPdf } from '@/components/orders/OrderPdf';
import { generateServiceOrderPdf } from '@/components/service-orders/ServiceOrderPdf';
import { Order, ServiceOrder } from '@/types/finance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Palette,
  FileText,
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Download,
  Sparkles,
  Eye,
  RotateCcw,
} from 'lucide-react';

export const PdfCustomizationTab: React.FC = () => {
  const { currentClient } = useFinance();

  const [settings, setSettings] = useState<PdfCustomizationSettings>(() =>
    getPdfSettings(currentClient?.id)
  );

  useEffect(() => {
    if (currentClient?.id) {
      const current = getPdfSettings(currentClient.id);
      if (!current.companyName || current.companyName === 'Previna Gestão') {
        current.companyName = currentClient.name || 'Previna Gestão';
      }
      setSettings(current);
    }
  }, [currentClient]);

  const handleApplyPreset = (preset: (typeof pdfThemePresets)[0]) => {
    setSettings((prev) => ({
      ...prev,
      headerColor: preset.headerColor,
      accentColor: preset.accentColor,
      tableHeaderColor: preset.tableHeaderColor,
    }));
    toast({
      title: 'Tema aplicado!',
      description: `Paleta "${preset.name}" selecionada. Não esqueça de salvar.`,
    });
  };

  const handleSave = () => {
    savePdfSettings(settings, currentClient?.id);
    toast({
      title: 'Configurações de PDF salvas com sucesso! ✨',
      description: 'Todos os novos comprovantes e ordens de serviço usarão este estilo.',
    });
  };

  const handleReset = () => {
    setSettings({
      ...defaultPdfSettings,
      companyName: currentClient?.name || defaultPdfSettings.companyName,
    });
    toast({ title: 'Configurações redefinidas para o padrão.' });
  };

  // Demonstração rápida de Pedido
  const handleGenerateDemoOrder = () => {
    savePdfSettings(settings, currentClient?.id);
    const mockOrder: Order = {
      id: 'demo-order',
      clientId: currentClient?.id || '',
      orderNumber: 'PED-DEMO',
      status: 'completed',
      subtotalAmount: 350.0,
      discountAmount: 30.0,
      totalAmount: 320.0,
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      notes: 'Pedido de demonstração gerado para teste de layout.',
      customer: {
        id: 'c1',
        clientId: currentClient?.id || '',
        name: 'Cliente Exemplo Demonstração Ltda',
        phone: '(11) 98765-4321',
        email: 'contato@clienteexemplo.com.br',
        document: '12.345.678/0001-90',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collaborator: {
        id: 'col1',
        userId: '',
        clientId: currentClient?.id || '',
        name: 'Consultor de Vendas',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      items: [
        {
          id: 'i1',
          orderId: 'demo-order',
          productId: 'p1',
          productName: 'Filtro de Óleo Automotivo Premium',
          productSku: '789123456001',
          quantity: 2,
          unitPrice: 55.0,
          costPrice: 28.0,
          discountAmount: 0,
          totalPrice: 110.0,
          createdAt: new Date(),
        },
        {
          id: 'i2',
          orderId: 'demo-order',
          productId: 'p2',
          productName: 'Óleo Sintético 5W30 1L Galão',
          productSku: '789123456002',
          quantity: 4,
          unitPrice: 60.0,
          costPrice: 35.0,
          discountAmount: 30.0,
          totalPrice: 210.0,
          createdAt: new Date(),
        },
        {
          id: 'i3',
          orderId: 'demo-order',
          productId: 'p3',
          productName: 'Aditivo para Radiador Concentrado',
          productSku: '789123456003',
          quantity: 1,
          unitPrice: 30.0,
          costPrice: 14.0,
          discountAmount: 0,
          totalPrice: 30.0,
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    generateOrderPdf(mockOrder, settings.companyName || currentClient?.name || 'Previna Gestão');
  };

  // Demonstração rápida de OS
  const handleGenerateDemoOS = () => {
    savePdfSettings(settings, currentClient?.id);
    const mockOS: ServiceOrder = {
      id: 'demo-os',
      clientId: currentClient?.id || '',
      osNumber: 'OS-DEMO',
      title: 'Revisão Preventiva e Troca de Componentes',
      status: 'completed',
      equipmentInfo: 'Veículo Toyota Corolla 2.0 Flex 2022 - Placa ABC-1234',
      reportedDefect: 'Ruído no sistema de freios dianteiro e revisão de 40.000 km.',
      technicalDiagnosis: 'Substituição das pastilhas dianteiras e troca de óleo/filtros recomendada.',
      servicesTotal: 250.0,
      productsTotal: 320.0,
      discountAmount: 20.0,
      totalAmount: 550.0,
      paymentMethod: 'card',
      paymentStatus: 'paid',
      warrantyTerms: settings.serviceOrderTerms,
      customer: {
        id: 'c1',
        clientId: currentClient?.id || '',
        name: 'Roberto de Oliveira Santos',
        phone: '(11) 99999-8888',
        email: 'roberto@email.com',
        document: '321.654.987-00',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      collaborator: {
        id: 't1',
        userId: '',
        clientId: currentClient?.id || '',
        name: 'Carlos Técnico Chefe',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      services: [
        {
          id: 's1',
          serviceOrderId: 'demo-os',
          name: 'Mão de Obra de Troca de Pastilhas e Fluido',
          quantity: 2,
          unitPrice: 80.0,
          discountAmount: 0,
          totalPrice: 160.0,
          createdAt: new Date(),
        },
        {
          id: 's2',
          serviceOrderId: 'demo-os',
          name: 'Alinhamento e Balanceamento 3D',
          quantity: 1,
          unitPrice: 90.0,
          discountAmount: 0,
          totalPrice: 90.0,
          createdAt: new Date(),
        },
      ],
      products: [
        {
          id: 'p1',
          serviceOrderId: 'demo-os',
          productId: 'pr1',
          productName: 'Jogo de Pastilhas de Freio Cerâmica',
          productSku: 'PST-9988',
          quantity: 1,
          unitPrice: 180.0,
          costPrice: 95.0,
          discountAmount: 0,
          totalPrice: 180.0,
          createdAt: new Date(),
        },
        {
          id: 'p2',
          serviceOrderId: 'demo-os',
          productId: 'pr2',
          productName: 'Fluido de Freio DOT 5.1 500ml',
          productSku: 'FLD-500',
          quantity: 2,
          unitPrice: 70.0,
          costPrice: 32.0,
          discountAmount: 0,
          totalPrice: 140.0,
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    generateServiceOrderPdf(mockOS, settings.companyName || currentClient?.name || 'Previna Gestão');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Personalização de Documentos & PDFs
          </h3>
          <p className="text-xs text-muted-foreground">
            Defina as cores, cabeçalhos, dados da empresa e termos de garantia dos PDFs gerados.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrão
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs bg-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Salvar Configurações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LADO ESQUERDO: FORMULÁRIO DE CUSTOMIZAÇÃO */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Cores e Identidade Visual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Cores do Documento
              </CardTitle>
              <CardDescription className="text-xs">
                Escolha a paleta de cores dos cabeçalhos, títulos e tabelas dos PDFs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Paletas Prontas */}
              <div>
                <Label className="text-xs font-semibold mb-2 block">Temas Predefinidos</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {pdfThemePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2.5 rounded-lg border text-left hover:border-primary transition-all flex flex-col justify-between gap-2 bg-card hover:bg-muted/40"
                    >
                      <span className="font-semibold text-[11px] truncate">{preset.name}</span>
                      <div className="flex gap-1.5 items-center">
                        <span
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: preset.headerColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: preset.tableHeaderColor }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor Customizado de Cores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                <div>
                  <Label className="text-[11px] text-muted-foreground block mb-1">
                    Fundo do Cabeçalho
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.headerColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, headerColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded border cursor-pointer shrink-0"
                    />
                    <Input
                      value={settings.headerColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, headerColor: e.target.value }))
                      }
                      className="h-8 text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground block mb-1">
                    Linha de Acento / Destaque
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, accentColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded border cursor-pointer shrink-0"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, accentColor: e.target.value }))
                      }
                      className="h-8 text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground block mb-1">
                    Cabeçalho da Tabela
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.tableHeaderColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, tableHeaderColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded border cursor-pointer shrink-0"
                    />
                    <Input
                      value={settings.tableHeaderColor}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, tableHeaderColor: e.target.value }))
                      }
                      className="h-8 text-xs uppercase"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Dados do Emissor / Empresa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Informações da Empresa no Documento
              </CardTitle>
              <CardDescription className="text-xs">
                Estes dados serão impressos no topo do cabeçalho do PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Nome da Empresa / Razão Social *</Label>
                  <Input
                    placeholder="Ex: Minha Empresa Ltda"
                    value={settings.companyName}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">CNPJ ou CPF</Label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={settings.documentNumber}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, documentNumber: e.target.value }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={settings.phone}
                    onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">E-mail Comercial</Label>
                  <Input
                    placeholder="contato@empresa.com.br"
                    value={settings.email}
                    onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Endereço Comercial</Label>
                <Input
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  value={settings.address}
                  onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Termos de Garantia e Canhoto */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Textos & Cláusulas Padrão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <Label className="text-xs font-semibold">
                  Termos de Garantia Padrão (Ordens de Serviço)
                </Label>
                <Textarea
                  value={settings.serviceOrderTerms}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, serviceOrderTerms: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Texto de Declaração de Aceite (Pedidos de Venda)
                </Label>
                <Textarea
                  value={settings.orderTerms}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, orderTerms: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border">
                  <div>
                    <Label className="text-xs font-semibold">Exibir Assinaturas</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Linhas para vendedor e cliente
                    </p>
                  </div>
                  <Switch
                    checked={settings.showSignatures}
                    onCheckedChange={(val) =>
                      setSettings((prev) => ({ ...prev, showSignatures: val }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border">
                  <div>
                    <Label className="text-xs font-semibold">Coluna SKU / Código</Label>
                    <p className="text-[10px] text-muted-foreground">Exibir código do produto</p>
                  </div>
                  <Switch
                    checked={settings.showSku}
                    onCheckedChange={(val) =>
                      setSettings((prev) => ({ ...prev, showSku: val }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LADO DIREITO: PREVIEW VISUAL E TESTES */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-primary/30 shadow-md">
            <CardHeader className="pb-3 bg-muted/30">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Pré-visualização do Layout
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Tempo Real
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {/* Mock do Cabeçalho do PDF */}
              <div
                className="p-3 rounded-t-md text-white space-y-1 relative shadow"
                style={{ backgroundColor: settings.headerColor }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm tracking-wide">
                    {settings.companyName || 'Nome da Empresa'}
                  </span>
                  <span className="text-[10px] uppercase font-semibold opacity-90">
                    PEDIDO / OS #0001
                  </span>
                </div>
                <div className="text-[10px] opacity-75">
                  {settings.phone ? `Tel: ${settings.phone} | ` : ''}
                  {settings.email || 'contato@empresa.com'}
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: settings.accentColor }}
                />
              </div>

              {/* Mock Tabela */}
              <div className="border rounded-b-md overflow-hidden bg-white dark:bg-slate-900">
                <div
                  className="p-2 text-[10px] font-bold text-white flex justify-between"
                  style={{ backgroundColor: settings.tableHeaderColor }}
                >
                  <span>DESCRIÇÃO</span>
                  <span>TOTAL</span>
                </div>
                <div className="p-2 flex justify-between text-[11px] border-b text-foreground">
                  <span>Produto Exemplo de Demonstração</span>
                  <span className="font-semibold">R$ 150,00</span>
                </div>
                <div className="p-2 flex justify-between text-[11px] bg-muted/30 text-foreground">
                  <span>Serviço Especializado Aplicado</span>
                  <span className="font-semibold">R$ 120,00</span>
                </div>
                <div className="p-2 flex justify-between items-center border-t bg-muted/50 font-bold">
                  <span>VALOR TOTAL:</span>
                  <span className="text-primary text-xs">R$ 270,00</span>
                </div>
              </div>

              {/* Botões de Demonstração */}
              <div className="pt-2 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Clique abaixo para gerar e baixar um arquivo PDF real com essas configurações:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateDemoOrder}
                    className="w-full text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Demo Pedido
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateDemoOS}
                    className="w-full text-xs gap-1.5 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Demo OS
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
