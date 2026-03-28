import { useState, useEffect } from 'react';
import { Search, Plus, User, Edit2, Trash2, X, MapPin, Mail, Phone } from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1';

const EditClientModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay con Blur (Glass & Gradient Rule para fondos levados) */}
      <div 
        className="absolute inset-0 bg-primary/20 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-ambient border border-ghost overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-ghost bg-surface/50">
          <h2 className="text-title-md font-bold text-on-surface">Editar Cliente</h2>
          <button 
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase">RUC / DNI</label>
              <input type="text" defaultValue="20123456789" className="w-full bg-surface-container-low border border-transparent focus:border-ghost focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase">Razón Social / Nombre</label>
              <input type="text" defaultValue="Constructora Atlas S.A.C." className="w-full bg-surface-container-low border border-transparent focus:border-ghost focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface transition-all outline-none" />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Dirección Fiscal
              </label>
              <input type="text" defaultValue="Av. Javier Prado Este 1234, San Isidro, Lima" className="w-full bg-surface-container-low border border-transparent focus:border-ghost focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface transition-all outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase flex items-center gap-2">
                <Mail className="w-4 h-4" /> Correo Electrónico
              </label>
              <input type="email" defaultValue="contacto@atlas.pe" className="w-full bg-surface-container-low border border-transparent focus:border-ghost focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface transition-all outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-label-sm font-bold text-on-surface-variant uppercase flex items-center gap-2">
                <Phone className="w-4 h-4" /> Teléfono
              </label>
              <input type="text" defaultValue="+51 987 654 321" className="w-full bg-surface-container-low border border-transparent focus:border-ghost focus:bg-surface-container-lowest rounded-xl px-4 py-3 text-sm text-on-surface transition-all outline-none" />
            </div>
          </div>
          {/* TODO: Conectar Endpoint de actualización de cliente de FastAPI */}
        </div>

        <div className="px-8 py-5 border-t border-ghost bg-surface/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Cancelar
          </button>
          <button 
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-container shadow-ambient hover:opacity-90 transition-opacity"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

const Clients = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/clients/`)
      .then(res => res.json())
      .then(data => {
        setClients(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching clients:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-display-sm font-bold text-on-surface">Gestión de Clientes</h1>
          <p className="text-body-md text-on-surface-variant font-medium">Administra tu cartera de clientes y direcciones.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-5 py-2.5 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-container shadow-ambient hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-ghost">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Buscar por Razón Social o RUC..." 
            className="w-full bg-surface-container-lowest border-none rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary/40 focus:bg-surface-container-lowest/90 transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-transparent">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-label-sm text-on-surface-variant border-b border-ghost mb-4">
          <div className="col-span-4">RAZÓN SOCIAL / RUC</div>
          <div className="col-span-3">CONTACTO</div>
          <div className="col-span-3">CORREO</div>
          <div className="col-span-1 text-center">ESTADO</div>
          <div className="col-span-1 text-right">ACCIONES</div>
        </div>

        <div className="space-y-4">
          {loading ? (
             <div className="p-8 text-center text-on-surface-variant animate-pulse font-bold text-sm">Cargando clientes...</div>
          ) : clients.length === 0 ? (
             <div className="p-8 text-center text-on-surface-variant font-medium text-sm">No hay clientes registrados.</div>
          ) : clients.map((client) => (
            <div 
              key={client.id} 
              className="grid grid-cols-12 gap-4 items-center bg-surface-container-lowest rounded-xl px-6 py-4 shadow-ambient hover:bg-surface-container-high transition-all duration-300 border border-transparent hover:border-ghost/50"
            >
              <div className="col-span-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-surface text-primary border border-ghost flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm truncate">{client.name}</p>
                  <p className="text-body-md text-on-surface-variant mt-0.5">RUC: {client.ruc}</p>
                </div>
              </div>
              <div className="col-span-3 text-body-md text-on-surface-variant font-medium">
                {client.contact}
              </div>
              <div className="col-span-3 text-body-md text-primary font-medium truncate">
                {client.email}
              </div>
              <div className="col-span-1 flex justify-center">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${client.status === 'Activo' ? 'bg-emerald-700/10 text-emerald-700' : 'bg-surface-container bg-opacity-50 text-on-surface-variant'}`}>
                  {client.status}
                </span>
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {/* TODO: Real endpoints para setear los datos de clientes */}
        </div>
      </div>

      <EditClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Clients;
