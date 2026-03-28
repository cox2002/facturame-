import { Box, Plus } from 'lucide-react';

const Products = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in duration-500">
      <div className="bg-surface-container-low w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-ambient border border-ghost">
        <Box className="w-10 h-10 text-primary opacity-80" />
      </div>
      <h2 className="text-2xl font-bold text-secondary text-center">Catálogo de Productos</h2>
      <p className="text-on-surface-variant font-medium mt-3 mb-8 text-center max-w-md">
        No hay productos o servicios registrados aún. Comienza añadiendo ítems para agilizar tu proceso de emisión de facturas.
      </p>
      <button className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all hover:-translate-y-0.5 shadow-md border border-primary/20">
        <Plus className="w-5 h-5 stroke-[2.5px]" />
        Nuevo Producto
      </button>
    </div>
  );
};

export default Products;
