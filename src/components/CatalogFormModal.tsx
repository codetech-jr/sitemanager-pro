import { useState, useEffect } from 'react';
import type { IMasterSku } from '../lib/db'; // Asegúrate de que esta ruta sea correcta
import { 
  X, Package, Tag, Truck, Bell, Save, 
  Loader2, DollarSign, ChevronDown, Layers 
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: IMasterSku) => Promise<void>;
  product: IMasterSku | null;
}

const initialFormData = {
    name: '',
    sku: '',
    unit: 'UND',
    price: 0,
    supplier: '',
    min_stock_alert: 10,
};

export default function CatalogFormModal({ isOpen, onClose, onSave, product }: Props) {
  const [formData, setFormData] = useState<Omit<IMasterSku, 'id'>>(initialFormData);
  const [loading, setLoading] = useState(false);

  // Reiniciar estado al abrir/cerrar o cambiar producto
  useEffect(() => {
    if (isOpen) {
        if (product) {
          setFormData({
            name: product.name || '',
            sku: product.sku || '',
            unit: product.unit || 'UND',
            price: product.price || 0,
            supplier: product.supplier || '',
            min_stock_alert: product.min_stock_alert || 10,
          });
        } else {
          setFormData(initialFormData);
        }
    }
  }, [product, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Detección mejorada de tipo número
    const isNumber = type === 'number' || name === 'price' || name === 'min_stock_alert';
    
    setFormData(prev => ({ 
        ...prev, 
        [name]: isNumber ? (value === '' ? 0 : parseFloat(value)) : value 
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        const dataToSave = { ...formData, id: product?.id };
        await onSave(dataToSave as IMasterSku);
        onClose(); // Cerramos solo si hubo éxito
    } catch (error) {
        console.error("Error guardando", error);
        // Aquí podrías poner un toast notification
    } finally {
        setLoading(false);
    }
  };
  
  if (!isOpen) return null;

  // --- Estilos Reutilizables (Design System) ---
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1";
  const inputContainerClass = "relative group";
  const iconClass = "absolute left-3 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors h-5 w-5 pointer-events-none"; // pointer-events-none para que el click pase al input
  const inputBaseClass = "w-full bg-slate-950/50 text-white rounded-lg border border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-slate-600 shadow-sm";
  const inputTextClass = `${inputBaseClass} pl-10 pr-4 py-3`;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
      {/* Contenedor Modal */}
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
          <div>
            <h3 className="text-white font-bold text-lg tracking-tight">
                {product ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            <p className="text-slate-500 text-xs mt-1">Ingresa los detalles técnicos del item.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="overflow-y-auto p-6 custom-scrollbar">
            <form id="catalog-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Nombre del Producto */}
            <div>
              <label className={labelClass}>Nombre del Producto</label>
              <div className={inputContainerClass}>
                <Package className={iconClass} />
                <input 
                    required 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="Ej. Cemento Portland Tipo 1"
                    className={inputTextClass}
                    autoFocus={!product}
                />
              </div>
            </div>

            {/* Fila: SKU + Unidad */}
            <div className="grid grid-cols-2 gap-5">
                {/* SKU */}
                <div>
                    <label className={labelClass}>SKU (Código)</label>
                    <div className={inputContainerClass}>
                        <Tag className={iconClass} />
                        <input 
                            required 
                            name="sku" 
                            value={formData.sku} 
                            onChange={handleChange} 
                            placeholder="MT-CEM-01" 
                            className={`${inputTextClass} font-mono uppercase`} // Fuente mono para códigos
                        />
                    </div>
                </div>

                {/* Unidad de Medida (Select Personalizado) */}
                <div>
                    <label className={labelClass}>Unidad</label>
                    <div className={inputContainerClass}>
                        <Layers className={iconClass} />
                        <select 
                            name="unit" 
                            value={formData.unit} 
                            onChange={handleChange} 
                            className={`${inputTextClass} appearance-none cursor-pointer hover:bg-slate-900 transition-colors`}
                        >
                            <option value="UND">UND - Unidad</option>
                            <option value="SACO">SACO</option>
                            <option value="KG">KG - Kilogramos</option>
                            <option value="METRO">M - Metros</option>
                            <option value="LITRO">L - Litros</option>
                            <option value="M3">M³ - Metro Cúbico</option>
                            <option value="CAJA">CAJA</option>
                        </select>
                        {/* Flecha manual porque appearance-none la quita */}
                        <ChevronDown className="absolute right-3 top-3.5 text-slate-500 pointer-events-none h-5 w-5" /> 
                    </div>
                </div>
            </div>

            {/* Fila: Precio + Stock Alert */}
            <div className="grid grid-cols-2 gap-5">
                {/* Precio */}
                <div>
                    <label className={labelClass}>Precio Unitario</label>
                    <div className={inputContainerClass}>
                        <DollarSign className={`${iconClass} group-focus-within:text-emerald-400`} /> {/* Verde para dinero */}
                        <input 
                            required 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            name="price" 
                            value={formData.price || ''} 
                            onChange={handleChange} 
                            placeholder="0.00"
                            className={`${inputTextClass} focus:border-emerald-500 focus:ring-emerald-500/10 font-mono`}
                        />
                    </div>
                </div>
                
                {/* Stock Mínimo */}
                <div>
                    <label className={`${labelClass} text-orange-400/80`}>Alerta Stock Mínimo</label>
                    <div className={inputContainerClass}>
                        <Bell className={`${iconClass} group-focus-within:text-orange-400`} />
                        <input 
                            required 
                            type="number" 
                            step="1" 
                            min="0" 
                            name="min_stock_alert" 
                            value={formData.min_stock_alert || ''} 
                            onChange={handleChange} 
                            className={`${inputTextClass} focus:border-orange-500 focus:ring-orange-500/10 font-mono`}
                        />
                    </div>
                </div>
            </div>

            {/* Proveedor */}
            <div>
              <label className={labelClass}>Proveedor (Opcional)</label>
              <div className={inputContainerClass}>
                <Truck className={iconClass} />
                <input 
                    name="supplier" 
                    value={formData.supplier} 
                    onChange={handleChange} 
                    placeholder="Ej. CSC"
                    className={inputTextClass}
                />
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer Buttons */}
        <div className="p-6 pt-4 border-t border-slate-800 bg-slate-950/30 flex justify-end gap-3">
            <button 
                type="button" 
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium"
            >
                Cancelar
            </button>
            <button 
                type="submit" 
                form="catalog-form" // Asocia el botón al form ID
                disabled={loading} 
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18}/>} 
              Guardar Cambios
            </button>
        </div>
      </div>
    </div>
  );
}