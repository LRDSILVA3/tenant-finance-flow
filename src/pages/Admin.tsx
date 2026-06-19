// Admin Page

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanManagement } from '@/components/admin/PlanManagement';
import { ClientOverview } from '@/components/admin/ClientOverview';
import { BillingDashboard } from '@/components/admin/BillingDashboard';
import { AdminSupport } from '@/components/admin/AdminSupport';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { ShieldCheck, CreditCard, Users, Loader2, DollarSign, Headset } from 'lucide-react';

const Admin: React.FC = () => {
  const { userProfile, authLoading, isAuthenticated } = useFinance();

  // Guard: Check if user is admin
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !userProfile?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="container px-4 sm:px-6 py-6 space-y-8 animate-fade-in">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-muted-foreground text-lg">Gerencie a infraestrutura da plataforma</p>
          </div>
        </div>

        <Tabs defaultValue="billing" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Faturamento
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <Headset className="h-4 w-4" />
              Suporte
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="billing" className="mt-6">
            <BillingDashboard />
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <ClientOverview />
          </TabsContent>
          
          <TabsContent value="plans" className="mt-6">
            <PlanManagement />
          </TabsContent>

          <TabsContent value="support" className="mt-6">
            <AdminSupport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
