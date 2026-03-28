import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, FileText, CheckCircle, Clock } from 'lucide-react';

import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api/v1';

const StatCard = ({ title, value, change, isPositive, icon: Icon, colorClass }: any) => {
  // Use Status Badges rules from Design System
  const badgeClass = isPositive 
    ? "text-emerald-700 bg-emerald-700/10" 
    : "text-error bg-error/10";

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-label-sm text-on-surface-variant">{title}</p>
          <p className="text-display-sm font-bold text-on-surface tracking-tight">{value}</p>
        </div>
        <div className={`p-3.5 rounded-xl ${colorClass} bg-opacity-10 backdrop-blur-md shadow-sm flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-').replace('-100', '-600')}`} />
        </div>
      </div>
      <div className="mt-8 flex items-center text-sm">
        <div className={`flex items-center font-bold px-3 py-1.5 rounded-full ${badgeClass}`}>
          {isPositive ? (
            <ArrowUpRight className="w-4 h-4 mr-1.5" />
          ) : (
            <ArrowDownRight className="w-4 h-4 mr-1.5" />
          )}
          {change}
        </div>
        <span className="text-label-sm text-on-surface-variant ml-4">VS MES ANTERIOR</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/facturas/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-12 text-center text-on-surface-variant text-label-sm font-bold animate-pulse">CARGANDO MÉTRICAS...</div>;
  if (!stats) return <div className="p-12 text-center text-error text-label-sm font-bold">ERROR AL CARGAR DATOS FINANCIEROS</div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-sm font-bold text-on-surface">Dashboard General</h1>
        <p className="text-body-md text-on-surface-variant font-medium">Resumen ejecutivo y control de facturas</p>
      </header>
      
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <StatCard 
          title="Ingresos Totales (Mes)" 
          value={stats.ventas_mes} 
          change={stats.cambio_ventas} 
          isPositive={stats.is_positive_ventas}
          icon={FileText}
          colorClass="bg-blue-100 text-primary-container"
        />
        <StatCard 
          title="Documentos Emitidos" 
          value={stats.emitidos} 
          change={stats.cambio_emitidos} 
          isPositive={stats.is_positive_emitidos}
          icon={CheckCircle}
          colorClass="bg-emerald-100 text-emerald-600"
        />
        <StatCard 
          title="Pendientes SUNAT" 
          value={stats.pendientes} 
          change={stats.cambio_pendientes} 
          isPositive={stats.is_positive_pendientes}
          icon={Clock}
          colorClass="bg-amber-100 text-amber-600"
        />
      </section>

      <section className="bg-surface-container-lowest rounded-2xl shadow-ambient p-8 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-title-md font-bold text-on-surface">Rendimiento Financiero</h2>
          <select className="bg-surface-container-low border border-ghost text-on-surface text-sm rounded-lg focus:ring-secondary focus:border-secondary block px-5 py-2.5 font-medium appearance-none cursor-pointer hover:bg-surface-container transition-colors">
            <option>Últimos 7 días</option>
            <option>Último mes</option>
          </select>
        </div>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.grafico_ventas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#c4c6cd" opacity={0.3} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#43474c', fontSize: 13, fontWeight: 500 }} dy={20} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#43474c', fontSize: 13, fontWeight: 500 }} dx={-15} tickFormatter={(value) => `S/${value}`} />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 244, 248, 0.4)' }}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid rgba(196, 198, 205, 0.15)', boxShadow: '0 12px 32px rgba(22, 40, 57, 0.06)', padding: '16px', fontWeight: 'bold', color: '#181c1f' }}
                itemStyle={{ color: '#162839' }}
              />
              <Bar dataKey="sales" fill="url(#colorSales)" radius={[6, 6, 0, 0]} maxBarSize={64} />
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#162839" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#2c3e50" stopOpacity={0.9}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
