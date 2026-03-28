import { Search, Filter, Download, Plus, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Formateador de moneda
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: currency === 'PEN' ? 'PEN' : 'USD' }).format(amount);
};

const StatusBadge = ({ status }: { status: string }) => {
  let baseClass = "px-3 py-1.5 rounded-full font-bold text-label-sm inline-flex items-center gap-1.5";
  
  if (status === 'Aceptado') {
    return <span className={`${baseClass} bg-emerald-700/10 text-emerald-700`}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{status}</span>;
  }
  if (status === 'Pendiente') {
    return <span className={`${baseClass} bg-amber-700/10 text-amber-700`}><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{status}</span>;
  }
  return <span className={`${baseClass} bg-error/10 text-error`}><span className="w-1.5 h-1.5 rounded-full bg-error"></span>{status}</span>;
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/facturas/`)
      .then(res => res.json())
      .then(data => {
        setInvoices(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching invoices:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-display-sm font-bold text-on-surface">Comprobantes</h1>
          <p className="text-body-md text-on-surface-variant font-medium">Gestiona y consulta el estado de tus emisiones.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button className="flex items-center justify-center w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-bold text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <Link to="/invoice/new" className="flex items-center justify-center w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-bold text-on-primary bg-gradient-to-br from-primary to-primary-container shadow-ambient hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Factura
          </Link>
        </div>
      </header>

      {/* Filter Bar (Glass/Surface Low) */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between border border-ghost">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Buscar por cliente, RUC o serie..." 
            className="w-full bg-surface-container-lowest border-none rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-secondary/40 focus:bg-surface-container-lowest/90 transition-all outline-none placeholder:text-on-surface-variant/50 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* TODO: Lógica para conectar endpoint de filtros (filtroXfecha, estado) */}
          <button className="flex items-center justify-center w-full md:w-auto px-4 py-3 rounded-xl bg-surface-container-lowest text-on-surface-variant text-sm font-bold hover:text-primary transition-colors shadow-sm border border-ghost">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-transparent">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-label-sm text-on-surface-variant border-b border-ghost mb-4">
          <div className="col-span-3">Nº COMPROBANTE</div>
          <div className="col-span-4">CLIENTE</div>
          <div className="col-span-2">FECHA</div>
          <div className="col-span-2 text-right">TOTAL</div>
          <div className="col-span-1 text-center">ESTADO</div>
        </div>

        <div className="space-y-4">
          {loading ? (
             <div className="p-8 text-center text-on-surface-variant animate-pulse font-bold text-sm">Cargando comprobantes...</div>
          ) : invoices.length === 0 ? (
             <div className="p-8 text-center text-on-surface-variant font-medium text-sm">No hay comprobantes registrados.</div>
          ) : invoices.map((invoice) => (
            <div 
              key={invoice.id} 
              className="flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center bg-surface-container-lowest rounded-xl px-6 py-5 shadow-ambient hover:bg-surface-container-high hover:shadow-lg transition-all duration-300 border border-transparent hover:border-ghost/50"
            >
              <div className="col-span-3 flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary border border-ghost">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-1">
                   <span className="font-bold text-on-surface">{invoice.serie}-{invoice.numero}</span>
                   <span className="md:hidden text-xs text-on-surface-variant">{invoice.fecha_emision}</span>
                </div>
              </div>
              <div className="col-span-4 font-medium text-body-md text-on-surface-variant truncate w-full">
                <span className="md:hidden text-xs font-bold text-gray-400 block mb-0.5 uppercase">Cliente</span>
                {invoice.razon_social}
              </div>
              <div className="hidden md:block col-span-2 text-body-md text-on-surface-variant">
                {invoice.fecha_emision}
              </div>
              <div className="col-span-2 md:text-right font-bold text-on-surface w-full flex md:block justify-between items-center">
                <span className="md:hidden text-xs font-bold text-gray-400 uppercase">Total</span>
                {formatCurrency(invoice.total_venta, invoice.moneda)}
              </div>
              <div className="col-span-1 flex md:justify-center w-full mt-2 md:mt-0 pt-3 md:pt-0 border-t border-ghost md:border-none">
                <StatusBadge status={invoice.estado_sunat} />
              </div>
            </div>
          ))}
          {/* TODO: Conectar Endpoint para paginación (e.g., page, limit) */}
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;
