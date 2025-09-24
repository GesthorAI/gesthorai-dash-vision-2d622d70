import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Users, Building2 } from 'lucide-react';

interface InviteData {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_at: string;
  expires_at: string;
  organization_name: string;
}

export const InviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de convite inválido');
      setLoading(false);
      return;
    }

    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    try {
      // Use the secure function to get invite by token
      const { data, error } = await supabase.rpc('get_invite_by_token', {
        invite_token: token
      });

      if (error) {
        console.error('Error fetching invite:', error);
        setError('Convite não encontrado ou inválido');
        return;
      }

      if (!data || data.length === 0) {
        setError('Convite não encontrado, já aceito ou expirado');
        return;
      }

      setInvite(data[0]);
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!user || !invite) return;

    setAccepting(true);
    setError(null);

    try {
      // Call the accept_organization_invite function
      const { error } = await supabase.rpc('accept_organization_invite', {
        invite_token: token
      });

      if (error) {
        console.error('Error accepting invite:', error);
        setError(error.message || 'Erro ao aceitar convite');
        return;
      }

      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      console.error('Error:', err);
      setError('Erro interno do servidor');
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/auth');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-red-600">Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-green-600">Convite Aceito!</CardTitle>
            <CardDescription>
              Você foi adicionado à organização com sucesso. Redirecionando...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 text-blue-500 mx-auto mb-2" />
            <CardTitle>Convite para se Juntar</CardTitle>
            <CardDescription>
              Você precisa fazer login para aceitar este convite
            </CardDescription>
          </CardHeader>
          {invite && (
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">{invite.organization_name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Função: {invite.role === 'admin' ? 'Administrador' : 'Membro'}
                </div>
              </div>
              
              <Alert>
                <AlertDescription>
                  Você precisa fazer login com o email <strong>{invite.email}</strong> para aceitar este convite.
                </AlertDescription>
              </Alert>

              <Button onClick={handleLogin} className="w-full">
                Fazer Login
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // Check if the user's email matches the invite email
  if (user.email !== invite?.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-red-600">Email Incorreto</CardTitle>
            <CardDescription>
              Este convite foi enviado para {invite?.email}, mas você está logado como {user.email}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
              variant="outline"
            >
              Fazer Login com Outro Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 text-blue-500 mx-auto mb-2" />
          <CardTitle>Convite para se Juntar</CardTitle>
          <CardDescription>
            Você foi convidado para se juntar a uma organização
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-600" />
              <span className="font-medium">{invite.organization_name}</span>
            </div>
            <div className="text-sm text-gray-600">
              Função: {invite.role === 'admin' ? 'Administrador' : 'Membro'}
            </div>
            <div className="text-sm text-gray-600">
              Email: {invite.email}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={acceptInvite} 
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aceitando...
                </>
              ) : (
                'Aceitar Convite'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Recusar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};