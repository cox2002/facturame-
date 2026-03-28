import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Printer, CheckCircle2, Lock } from 'lucide-react';

type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  igvType: 'GRAVADO' | 'EXONERADO' | 'INAFECTO';
};

type InvoiceForm = {
  clientDocument: string;
  clientName: string;
  voucherType: '01' | '03';
  serie: string;
  lines: InvoiceLine[];
};

const NewInvoice = () => {
  const { register, control, watch, setValue, handleSubmit, reset } = useForm<InvoiceForm>({
    defaultValues: {
      voucherType: '01',
      serie: 'F001',
      clientDocument: '',
      clientName: '',
      lines: [{ description: '', quantity: 1, unitPrice: 0, igvType: 'GRAVADO' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines'
  });

  const watchLines = watch('lines');
  const watchVoucherType = watch('voucherType');

  // Lógica UX Senior: Autoajuste de series basado en tipo documento SUNAT
  useEffect(() => {
    if (watchVoucherType === '01') {
      setValue('serie', 'F001');
    } else if (watchVoucherType === '03') {
      setValue('serie', 'B001');
    }
  }, [watchVoucherType, setValue]);
  
  // LIVE Totals Calculation for SUNAT specifications
  const totals = watchLines.reduce((acc, curr) => {
    const qty = Number(curr.quantity) || 0;
    const price = Number(curr.unitPrice) || 0;
    const lineTotal = qty * price;
    
    if (curr.igvType === 'GRAVADO') {
      const subtotal = lineTotal / 1.18;
      const igv = lineTotal - subtotal;
      acc.taxed += subtotal;
      acc.igv += igv;
    } else if (curr.igvType === 'EXONERADO') {
      acc.exonerated += lineTotal;
    } else {
      acc.unaffected += lineTotal;
    }
    acc.total += lineTotal;
    return acc;
  }, { taxed: 0, exonerated: 0, unaffected: 0, igv: 0, total: 0 });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: InvoiceForm) => {
    setIsSubmitting(true);
    try {
      // Mapear datos del frontend al formato FacturaCreate del backend
      const payload = {
        serie: data.serie,
        numero: Math.floor(Math.random() * 100000) + 1, // Simulación de correlativo automático
        fecha_emision: new Date().toISOString().split('T')[0],
        ruc_cliente: data.clientDocument,
        razon_social: data.clientName || 'Cliente Genérico',
        moneda: "PEN", // Por defecto
        total_igv: totals.igv,
        total_venta: totals.total,
        detalles: data.lines.map(line => ({
          descripcion: line.description,
          cantidad: Number(line.quantity),
          precio_unitario: Number(line.unitPrice),
          subtotal: Number(line.quantity) * Number(line.unitPrice)
        }))
      };

      const response = await fetch('http://localhost:8000/api/v1/facturas/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        let errorMsg = 'Error en el servidor';
        if (Array.isArray(errorData.detail)) {
          errorMsg = errorData.detail.map((err: any) => err.msg).join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMsg = errorData.detail;
        } else if (errorData.detail) {
          errorMsg = JSON.stringify(errorData.detail);
        }
        throw new Error(errorMsg);
      }
      
      const result = await response.json();
      
      // Limpiar Formulario UX exitoso
      reset({
        voucherType: watchVoucherType,
        serie: watchVoucherType === '01' ? 'F001' : 'B001',
        clientDocument: '',
        clientName: '',
        lines: [{ description: '', quantity: 1, unitPrice: 0, igvType: 'GRAVADO' }]
      });

      alert(`✅ ${result.mensaje}\n\nID Base de datos: ${result.factura_id}\nEstado SUNAT: ${result.estado}`);
    } catch (error: any) {
      console.error(error);
      alert(`❌ Error al emitir:\n${error.message}\nVerifica conexión al servidor en localhost:8000.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Emisión de Comprobante</h1>
          <p className="text-gray-500 font-medium mt-1">Ingreso ultra-rápido optimizado (POS)</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 font-medium transition-colors shadow-sm">
            <Printer className="w-5 h-5 mr-2" />
            Borrador
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl border border-borderC p-6 shadow-sm">
            <h2 className="text-lg font-bold text-secondary mb-4 border-b border-borderC pb-3">Datos del Cliente</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Emisión</label>
                <select {...register("voucherType")} className="w-full rounded-xl border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border-p p-3 transition-shadow font-medium">
                  <option value="01">Factura</option>
                  <option value="03">Boleta</option>
                </select>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Serie (Editable)</label>
                <div className="relative">
                  <input {...register("serie")} className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3 uppercase font-bold text-secondary tracking-widest text-center pr-8" />
                </div>
              </div>
              <div className="col-span-2 lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                  Correlativo
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 rounded font-bold uppercase tracking-wider flex items-center"><Lock className="w-3 h-3 inline mr-1"/>Seguro</span>
                </label>
                <div className="h-[50px] bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center pointer-events-none">
                   <p className="text-sm font-bold text-gray-400">Autogenerado por SUNAT</p>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 whitespace-nowrap">
                  Documento Identidad <span className="text-primary font-bold">({watchVoucherType === '01' ? 'RUC - 11 dígitos' : 'DNI/CE - 8 dígitos'})</span> <span className="text-red-500">*</span>
                </label>
                <input {...register("clientDocument")} placeholder={watchVoucherType === '01' ? 'Ej. 20123456789' : 'Ej. 76591234'} className="w-full rounded-xl border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 ring-blue-500/20 p-3 font-mono font-medium transition-all" autoFocus />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Razón Social / Nombres Comerciales</label>
                <input {...register("clientName")} placeholder="Ingresa los nombres del cliente o empresa..." className="w-full rounded-xl border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 font-medium text-secondary" />
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-borderC p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-borderC pb-3">
              <h2 className="text-lg font-bold text-secondary">Items (Detalle de Venta)</h2>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                <div className="col-span-2">Cant/Und</div>
                <div className="col-span-4">Descripción</div>
                <div className="col-span-2">P.U.</div>
                <div className="col-span-3">Afectación IGV</div>
                <div className="col-span-1 text-center"></div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-center group">
                  <div className="col-span-2 relative">
                     <span className="absolute right-3 top-3 text-xs text-gray-400 font-bold pointer-events-none">NIU</span>
                    <input type="number" step="0.01" {...register(`lines.${index}.quantity`)} className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 font-bold pl-3 pr-10 text-secondary" />
                  </div>
                  <div className="col-span-4">
                    <input {...register(`lines.${index}.description`)} placeholder="Producto ej. Laptop..." className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 font-medium" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" {...register(`lines.${index}.unitPrice`)} className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 font-mono text-blue-700 font-bold bg-blue-50/50" />
                  </div>
                  <div className="col-span-3">
                    <select {...register(`lines.${index}.igvType`)} className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm font-medium text-gray-700 bg-gray-50 cursor-pointer">
                      <option value="GRAVADO">Gravado (18%)</option>
                      <option value="EXONERADO">Exonerado (0%)</option>
                      <option value="INAFECTO">Inafecto (0%)</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button type="button" onClick={() => remove(index)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, igvType: 'GRAVADO' })} className="mt-6 flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-4 h-4 mr-1.5 stroke-[3px]" /> F5 - Añadir Item
            </button>
          </div>
        </div>

        {/* Totals Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-2xl border border-borderC p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-secondary mb-5 border-b border-borderC pb-3">Resumen Contable</h2>
            
            <div className="space-y-3.5 text-sm pb-5 mb-5 border-b border-dashed border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Gravadas (Subtotal)</span>
                <span className="text-secondary font-mono font-bold tracking-tight">S/ {totals.taxed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">IGV (18%)</span>
                <span className="text-secondary font-mono font-bold tracking-tight">S/ {totals.igv.toFixed(2)}</span>
              </div>
              {totals.exonerated > 0 && (
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-500 font-medium">Exoneradas</span>
                  <span className="text-secondary font-mono font-bold tracking-tight">S/ {totals.exonerated.toFixed(2)}</span>
                </div>
              )}
              {totals.unaffected > 0 && (
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                  <span className="text-gray-500 font-medium">Inafectas</span>
                  <span className="text-secondary font-mono font-bold tracking-tight">S/ {totals.unaffected.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center bg-gradient-to-br from-blue-50 to-indigo-50/30 p-5 rounded-xl border border-blue-100/50">
              <span className="text-lg font-bold text-gray-700">Total a Pagar</span>
              <span className="text-3xl font-black text-blue-600 tracking-tighter">S/ {totals.total.toFixed(2)}</span>
            </div>

            <div className="mt-8">
              <button 
                onClick={handleSubmit(onSubmit)} 
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 focus:ring-4 ring-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-6 h-6 mr-2" />
                {isSubmitting ? 'Conectando con SUNAT...' : 'Emitir Documento (F12)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewInvoice;
