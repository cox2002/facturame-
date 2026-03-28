import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Users, Box, LogOut, Bell, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout = () => {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { user, logout } = useAuth();
  
  // Custom Hook for clicking outside could go here for production, but simple toggle serves demo.

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Comprobantes', href: '/invoice/list', icon: FileText },
    { name: 'Nueva Factura', href: '/invoice/new', icon: FileText },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Catálogo', href: '/products', icon: Box },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans">
      {/* Sidebar Desktop - surface-container-low con No-Line Rule */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-container-low z-20 shadow-ambient">
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="facturame+" className="w-10 h-10 object-contain rounded-xl hover:scale-105 transition-transform" />
            <span className="font-bold text-lg text-primary tracking-tight">facturame+</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300
                  ${isActive 
                    ? 'bg-surface-container-lowest text-primary shadow-ambient' 
                    : 'text-on-surface hover:bg-surface-container-lowest/50 hover:text-primary'
                  }
                `}
              >
                <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-secondary' : 'text-on-surface-variant group-hover:text-primary'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4">
          <button 
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-on-surface-variant rounded-lg hover:bg-error-container hover:text-error transition-colors group"
          >
            <LogOut className="mr-3 h-5 w-5 text-on-surface-variant group-hover:text-error" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-surface">
        {/* Header - The Glass & Gradient Rule */}
        <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 glass-panel sticky top-0 z-10 transition-all border-b border-ghost shadow-sm">
          <div className="flex items-center md:hidden gap-2">
            <img src="/logo.png" alt="facturame+" className="w-8 h-8 object-contain rounded-lg" />
            <span className="font-bold text-lg text-primary">facturame+</span>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-6 relative">
            {/* Notifications Toggle */}
            <div className="relative">
              <button 
                onClick={() => {setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false);}}
                className={`p-2 rounded-full transition-colors relative ${isNotifOpen ? 'bg-surface-container text-primary' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'}`}
              >
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border border-surface-container-lowest"></span>
                <Bell className="h-5 w-5" />
              </button>
              
              {/* Notifications Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-surface-container-lowest border border-ghost rounded-2xl shadow-ambient overflow-hidden z-50 animate-in slide-in-from-top-2">
                  <div className="p-4 border-b border-ghost flex justify-between items-center bg-surface">
                     <h3 className="font-bold text-secondary text-sm">Notificaciones</h3>
                     <span className="text-xs text-primary font-bold cursor-pointer hover:underline">Marcar leídas</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="p-4 border-b border-ghost hover:bg-surface transition-colors cursor-pointer">
                      <p className="text-sm font-bold text-on-surface">Comprobante F001-20 Emitido</p>
                      <p className="text-xs text-on-surface-variant mt-1">La factura se derivó correctamente a SUNAT.</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Hace 2 min</p>
                    </div>
                    <div className="p-4 border-b border-ghost hover:bg-surface transition-colors cursor-pointer opacity-70">
                      <p className="text-sm font-bold text-on-surface">Resumen de Cierre Diario</p>
                      <p className="text-xs text-on-surface-variant mt-1">S/ 4,200 procesados en Boletas.</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase">Ayer 18:00</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Toggle */}
            <div className="relative">
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false);}}
              >
                {/* Advanced Avatar with Fallback (No se ve feo si no hay img) */}
                 <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-ambient border border-ghost group-hover:ring-2 ring-primary/20 transition-all overflow-hidden relative">
                   {user?.photoURL ? (
                     <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover absolute" />
                   ) : (
                     <span className="text-sm">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                   )}
                </div>
                <div className="hidden md:block text-sm">
                  <p className="font-semibold text-primary">{user?.displayName || user?.email?.split('@')[0] || 'Usuario'}</p>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">Admin</p>
                </div>
              </div>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-surface-container-lowest border border-ghost rounded-2xl shadow-ambient overflow-hidden z-50 animate-in slide-in-from-top-2">
                  <div className="p-2 border-b border-ghost bg-surface">
                     <p className="px-3 md:hidden font-bold py-1 text-sm text-primary">Joseph Padilla</p>
                     <p className="px-3 md:hidden text-xs text-on-surface-variant pb-2">Admin</p>
                  </div>
                  <div className="p-2">
                    <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-on-surface hover:text-primary hover:bg-surface-container rounded-lg transition-colors">
                      <Settings className="w-4 h-4 mr-3" /> Configuración
                    </Link>
                    <Link to="/clients" onClick={() => setIsProfileOpen(false)} className="flex items-center px-3 py-2 text-sm font-medium text-on-surface hover:text-primary hover:bg-surface-container rounded-lg transition-colors">
                      <UserIcon className="w-4 h-4 mr-3" /> Mi Perfil
                    </Link>
                  </div>
                  <div className="p-2 border-t border-ghost">
                    <button 
                      onClick={logout}
                      className="flex items-center w-full px-3 py-2 text-sm font-medium text-error hover:bg-error-container rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Outlet */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          <div className="max-w-[1400px] mx-auto h-full space-y-8">
             <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
