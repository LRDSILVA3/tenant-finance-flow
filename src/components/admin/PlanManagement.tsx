// Admin: Plan Management Component

import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Plan, PlanFeatures } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Save, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const PlanManagement: React.FC = () => {
  const { plans, updatePlan, t } = useFinance();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (plan: Plan) => {
    setEditingPlan({ ...plan, features: { ...plan.features } });
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    setSaving(true);

    try {
      await updatePlan(editingPlan.id, {
        name: editingPlan.name,
        description: editingPlan.description,
        price: editingPlan.price,
        trialMonths: editingPlan.trialMonths,
        features: editingPlan.features,
      });
      setEditingPlan(null);
    } catch (error) {
      console.error('Error updating plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (feature: keyof PlanFeatures, value: boolean) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: { ...editingPlan.features, [feature]: value }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Planos</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço (R$)</TableHead>
              <TableHead>Trial (Meses)</TableHead>
              <TableHead>Funcionalidades</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">
                  {editingPlan?.id === plan.id ? (
                    <Input 
                      value={editingPlan.name} 
                      onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                    />
                  ) : plan.name}
                </TableCell>
                <TableCell>
                  {editingPlan?.id === plan.id ? (
                    <MoneyInput 
                      value={editingPlan.price} 
                      onChange={value => setEditingPlan({...editingPlan, price: value})}
                    />
                  ) : `R$ ${plan.price.toFixed(2)}`}
                </TableCell>
                <TableCell>
                  {editingPlan?.id === plan.id ? (
                    <Input 
                      type="number"
                      value={editingPlan.trialMonths} 
                      onChange={e => setEditingPlan({...editingPlan, trialMonths: Number(e.target.value)})}
                    />
                  ) : `${plan.trialMonths} meses`}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {editingPlan?.id === plan.id ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Switch
                            checked={editingPlan.features.payment_methods}       
                            onCheckedChange={v => updateFeature('payment_methods', v)}
                          />
                          <span className="text-xs">Recebimentos</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Switch
                            checked={editingPlan.features.commissions}
                            onCheckedChange={v => updateFeature('commissions', v)}
                          />
                          <span className="text-xs">Comissões</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs w-24">Max Colabs:</span>
                          <Input
                            type="number"
                            className="h-6 w-16 text-xs p-1"
                            value={editingPlan.features.max_collaborators ?? 0}
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              updateFeature('max_collaborators', isNaN(val) ? 0 : val);
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-24">Max Recorrência:</span>
                          <Input
                            type="number"
                            className="h-6 w-16 text-xs p-1"
                            value={editingPlan.features.max_recurring_transactions ?? 1}
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              updateFeature('max_recurring_transactions', isNaN(val) ? 1 : val);
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          {plan.features.payment_methods && <Sparkles className="h-4 w-4 text-blue-500" title="Recebimentos" />}
                          {plan.features.commissions && <Sparkles className="h-4 w-4 text-amber-500" title="Comissões" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Colabs: {plan.features.max_collaborators ?? 0} | Rec: {plan.features.max_recurring_transactions ?? 1}
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {editingPlan?.id === plan.id ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingPlan(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(plan)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
