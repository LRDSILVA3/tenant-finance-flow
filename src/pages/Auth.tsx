// Authentication Page - Login
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido').max(255);
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(72);

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  type AuthView = 'login' | 'forgot-password' | 'reset-password';
  const [view, setView] = useState<AuthView>('login');

  useEffect(() => {
    // Check if user is already logged in or if it is a recovery session
    const checkSession = async () => {
      const isRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !isRecovery) {
        navigate('/app', { replace: true });
      }
      if (isRecovery) {
        setView('reset-password');
      }
      setCheckingAuth(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset-password');
      } else if (session && event !== 'PASSWORD_RECOVERY') {
        navigate('/app', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateInputs = (): boolean => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      let message = 'Erro ao fazer login';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email ou senha incorretos';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Por favor, confirme seu email antes de fazer login';
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe seu email.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar email de recuperação',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'O link de recuperação foi enviado para o seu email.',
      });
      setView('login');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao redefinir a senha',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Sua senha foi alterada com sucesso! Redirecionando...',
      });
      setTimeout(() => {
        navigate('/app', { replace: true });
      }, 1500);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {view === 'login' && (
        <Card className="w-full max-w-md shadow-xl border-border/80">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 cursor-pointer" onClick={() => navigate('/')}>
              <div className="flex h-20 w-auto items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Previna Logo" className="h-full w-auto object-contain hover:scale-105 transition-transform" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Acesse sua Conta</CardTitle>
            <CardDescription>
              Informe seus dados para acessar a plataforma Previna.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="login-password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => setView('forgot-password')}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="text-center pt-2 text-sm text-muted-foreground">
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/onboarding')}
                  className="text-primary hover:underline font-semibold"
                >
                  Cadastre-se grátis
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {view === 'forgot-password' && (
        <Card className="w-full max-w-md shadow-xl border-border/80">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 cursor-pointer" onClick={() => setView('login')}>
              <div className="flex h-20 w-auto items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Previna Logo" className="h-full w-auto object-contain hover:scale-105 transition-transform" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Recuperar Acesso</CardTitle>
            <CardDescription>
              Digite seu e-mail de login para receber o link de redefinição de senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando link...
                  </>
                ) : (
                  'Enviar link de redefinição'
                )}
              </Button>

              <div className="text-center pt-2 text-sm">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-primary hover:underline font-semibold"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {view === 'reset-password' && (
        <Card className="w-full max-w-md shadow-xl border-border/80">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-20 w-auto items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Previna Logo" className="h-full w-auto object-contain" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Criar Nova Senha</CardTitle>
            <CardDescription>
              Defina uma nova senha segura para acessar a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pwd">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-pwd"
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pwd">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-pwd"
                    type="password"
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Auth;
