/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { CustomerVehicle } from '@/types/finance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Car, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  formatVehiclePlate,
  cleanPlate,
  isValidPlate,
  VEHICLE_BRANDS,
  FUEL_TYPES,
  VEHICLE_COLORS,
} from '@/utils/vehicleUtils';

export interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: CustomerVehicle | null;
  defaultCustomerId?: string;
  onSuccess?: (savedVehicle: CustomerVehicle) => void;
}

export const VehicleDialog: React.FC<VehicleDialogProps> = ({
  open,
  onOpenChange,
  vehicle,
  defaultCustomerId,
  onSuccess,
}) => {
  const { currentClient, customers = [] } = useFinance();

  const [customerId, setCustomerId] = useState<string>('');
  const [plate, setPlate] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [modelYear, setModelYear] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [fuelType, setFuelType] = useState<string>('Flex');
  const [chassis, setChassis] = useState<string>('');
  const [renavam, setRenavam] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Inicializa o formulário com dados existentes ou valores padrão
  useEffect(() => {
    if (open) {
      if (vehicle) {
        setCustomerId(vehicle.customerId || defaultCustomerId || '');
        setPlate(formatVehiclePlate(vehicle.plate));
        setBrand(vehicle.brand || '');
        setModel(vehicle.model || '');
        setModelYear(vehicle.modelYear || '');
        setColor(vehicle.color || '');
        setFuelType(vehicle.fuelType || 'Flex');
        setChassis(vehicle.chassis || '');
        setRenavam(vehicle.renavam || '');
        setNotes(vehicle.notes || '');
      } else {
        setCustomerId(defaultCustomerId || '');
        setPlate('');
        setBrand('');
        setModel('');
        setModelYear('');
        setColor('');
        setFuelType('Flex');
        setChassis('');
        setRenavam('');
        setNotes('');
      }
    }
  }, [open, vehicle, defaultCustomerId]);

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatVehiclePlate(e.target.value);
    setPlate(formatted);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentClient?.id) {
      toast({
        title: 'Empresa não selecionada',
        description: 'Selecione uma empresa ativa para cadastrar o veículo.',
        variant: 'destructive',
      });
      return;
    }

    const selectedCustId = customerId || defaultCustomerId;
    if (!selectedCustId || selectedCustId === 'none') {
      toast({
        title: 'Cliente obrigatório',
        description: 'Selecione o proprietário do veículo.',
        variant: 'destructive',
      });
      return;
    }

    if (!model.trim() && !plate.trim()) {
      toast({
        title: 'Dados insuficientes',
        description: 'Informe ao menos o modelo ou a placa do veículo.',
        variant: 'destructive',
      });
      return;
    }

    const cleaned = cleanPlate(plate);
    if (cleaned && !isValidPlate(cleaned)) {
      toast({
        title: 'Placa incompleta ou inválida',
        description: 'Informe uma placa válida no formato Mercosul (ABC1D23) ou Tradicional (ABC-1234).',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        client_id: currentClient.id,
        customer_id: selectedCustId,
        plate: cleaned || null,
        brand: brand.trim() || null,
        model: model.trim() || 'Veículo',
        model_year: modelYear.trim() || null,
        color: color.trim() || null,
        fuel_type: fuelType.trim() || null,
        chassis: chassis.trim() || null,
        renavam: renavam.trim() || null,
        notes: notes.trim() || null,
      };

      let resultData: any;

      if (vehicle?.id) {
        // Atualização
        const { data, error } = await supabase
          .from('customer_vehicles')
          .update(payload)
          .eq('id', vehicle.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;
        toast({
          title: 'Veículo atualizado!',
          description: `Os dados do veículo ${resultData.model} foram atualizados.`,
        });
      } else {
        // Inserção
        const { data, error } = await supabase
          .from('customer_vehicles')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        resultData = data;
        toast({
          title: 'Veículo cadastrado!',
          description: `O veículo ${resultData.model} foi adicionado à garagem com sucesso.`,
        });
      }

      const formattedVehicle: CustomerVehicle = {
        id: resultData.id,
        clientId: resultData.client_id,
        customerId: resultData.customer_id,
        plate: resultData.plate,
        brand: resultData.brand,
        model: resultData.model,
        modelYear: resultData.model_year,
        color: resultData.color,
        fuelType: resultData.fuel_type,
        chassis: resultData.chassis,
        renavam: resultData.renavam,
        notes: resultData.notes,
        createdAt: new Date(resultData.created_at),
        updatedAt: new Date(resultData.updated_at),
      };

      if (onSuccess) {
        onSuccess(formattedVehicle);
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao salvar veículo:', err);
      toast({
        title: 'Erro ao salvar veículo',
        description: err.message || 'Ocorreu um erro ao registrar o veículo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isMercosul = cleanPlate(plate).length >= 5 && isNaN(Number(cleanPlate(plate)[4]));
  const plateValid = isValidPlate(plate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {vehicle ? 'Editar Veículo da Garagem' : 'Cadastrar Novo Veículo'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Vincule o veículo ao cliente para histórico de manutenções, quilometragem e Ordens de Serviço.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* 1. SELEÇÃO DO PROPRIETÁRIO / CLIENTE */}
          <div>
            <Label className="text-xs font-semibold">Cliente Proprietário *</Label>
            <Select
              value={customerId || defaultCustomerId || ''}
              onValueChange={setCustomerId}
              disabled={Boolean(defaultCustomerId && defaultCustomerId !== 'none')}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {(customers || []).map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. DADOS PRINCIPAIS DO VEÍCULO (Placa, Marca, Modelo) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* PLACA COM MÁSCARA AUTOMÁTICA */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Placa do Veículo *</Label>
                {plateValid && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 font-mono font-bold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40"
                  >
                    <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                    {isMercosul ? 'Mercosul' : 'Padrão BR'}
                  </Badge>
                )}
              </div>
              <Input
                placeholder="Ex: ABC1D23"
                value={plate}
                onChange={handlePlateChange}
                maxLength={8}
                className="mt-1 h-9 text-xs font-mono font-black uppercase tracking-wider bg-background"
                autoFocus
              />
            </div>

            {/* MARCA / MONTADORA COM SEARCHABLE SELECT OFICIAL */}
            <div>
              <Label className="text-xs font-semibold">Marca / Montadora</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={VEHICLE_BRANDS}
                  value={brand}
                  onChange={setBrand}
                  placeholder="Selecione a marca..."
                  searchPlaceholder="Buscar ou digitar marca..."
                  emptyMessage="Nenhuma marca encontrada."
                  addNewLabel="Usar marca"
                  allowAdd={true}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* MODELO / VERSÃO */}
            <div>
              <Label className="text-xs font-semibold">Modelo / Versão *</Label>
              <Input
                placeholder="Ex: Onix 1.0 Turbo"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 h-9 text-xs font-medium"
                required
              />
            </div>
          </div>

          {/* 3. CARACTERÍSTICAS (Ano, Cor, Combustível) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Ano / Modelo</Label>
              <Input
                placeholder="Ex: 2022 ou 2022/2023"
                value={modelYear}
                onChange={(e) => setModelYear(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Cor Predominante</Label>
              <div className="mt-1">
                <SearchableSelect
                  options={VEHICLE_COLORS}
                  value={color}
                  onChange={setColor}
                  placeholder="Selecione a cor..."
                  searchPlaceholder="Buscar ou digitar cor..."
                  emptyMessage="Nenhuma cor encontrada."
                  addNewLabel="Usar cor"
                  allowAdd={true}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Combustível</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. DOCUMENTAÇÃO TÉCNICA (Chassi e Renavam - Opcionais) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Chassi (Opcional)
              </Label>
              <Input
                placeholder="Número do Chassi"
                value={chassis}
                onChange={(e) => setChassis(e.target.value.toUpperCase())}
                className="mt-1 h-8 text-xs font-mono uppercase"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Renavam (Opcional)
              </Label>
              <Input
                placeholder="Código Renavam"
                value={renavam}
                onChange={(e) => setRenavam(e.target.value.replace(/\D/g, ''))}
                className="mt-1 h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* 5. OBSERVAÇÕES TÉCNICAS E HISTÓRICO */}
          <div>
            <Label className="text-xs font-semibold">
              Observações Técnicas / Particularidades do Veículo
            </Label>
            <Textarea
              placeholder="Ex: Veículo possui engate para reboque, kit gás instalado, manual com carimbos de revisão..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 text-xs min-h-[68px] resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8 text-xs gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {vehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
