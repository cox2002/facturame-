import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Configuración</h1>
          <p className="text-gray-500 font-medium mt-1">Ajustes generales del sistema y preferencias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest border border-borderC rounded-2xl p-6 shadow-ambient opacity-60 cursor-not-allowed">
              <div className="flex items-center gap-4 border-b border-borderC pb-4 mb-4">
                  <div className="p-3 bg-surface-container-low rounded-xl text-primary border border-ghost">
                      <SettingsIcon className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="font-bold text-secondary">Datos de la Empresa</h3>
                      <p className="text-xs font-medium text-on-surface-variant">RUC, Logo, Dirección fiscal</p>
                  </div>
              </div>
              <p className="text-sm text-gray-400 font-semibold mb-4">Módulo en construcción o pendiente de permisos de administrador superior.</p>
              <button disabled className="w-full py-2 bg-surface border border-ghost rounded-lg text-sm font-bold text-gray-400">Ver Perfil</button>
          </div>
      </div>
    </div>
  );
};

export default Settings;
