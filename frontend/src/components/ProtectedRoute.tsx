import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Estado de carga ultramoderno mientras verifica Firebase
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
        <Lock className="w-10 h-10 text-primary animate-pulse mb-4" />
        <h2 className="text-secondary font-bold tracking-tight">Verificando Credenciales...</h2>
      </div>
    );
  }

  if (!user) {
    // Redirige al login, pero guarda a dónde intentaba ir el usuario
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si está logueado, permite el acceso al componente (ej. DashboardLayout)
  return children;
};
