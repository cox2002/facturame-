# Documentación Completa del Sistema de Facturación Electrónica (SUNAT)

Este documento describe el estado actual de la arquitectura, tecnologías, dependencias y la integración entre el frontend y el backend de tu sistema de facturación.

---

## 1. Tecnologías y Dependencias Principales

### 🖥️ Frontend (Carpeta `frontend/`)
El frontend está construido sobre una pila tecnológica moderna orientada al rendimiento y a la creación de interfaces dinámicas (Vite + React 19).

**Stack Principal:**
- **Framework:** React 19 (con TypeScript `@types/react`).
- **Bundler:** Vite 8.0 (con su plugin de React).
- **Estilos:** Tailwind CSS v4 (incorporando `tailwind-merge` y `clsx` para construir componentes UI flexibles).
- **Enrutamiento:** React Router DOM (v7.x).

**Librerías Claves:**
- **Formularios:** `react-hook-form` (usado intensivamente para el control y cálculo asíncrono en la pantalla de facturación POS).
- **Iconografía:** `lucide-react`.
- **Gráficos/Dashboard:** `recharts` (para visualizar las métricas en `Dashboard.tsx`).

### ⚙️ Backend (Carpeta `backend/`)
El backend utiliza el paradigma asíncrono y está construido con Python para un consumo ultrarrápido vía APIs REST.

**Stack Principal:**
- **Framework REST:** FastAPI (`fastapi>=0.110.0`).
- **Validación de Datos (Schemas):** Pydantic v2 (usando `@field_validator`).
- **Servidor ASGI:** Uvicorn (`uvicorn>=0.29.0`).
- **Base de Datos / ORM:** SQLAlchemy (`sqlalchemy>=2.0.0`) y SQLite local (usando `sunat_db.sqlite` a través de `app.db.session`), aunque tiene preparado el driver `psycopg2-binary` por si decides migrar a PostgreSQL.
- **Generación PDF:** ReportLab (listo para usarse en generar los PDF tamaño A4/Ticket de SUNAT).

---

## 2. Estado del Backend (Arquitectura y Módulos)

El backend ya está completamente funcional y estructurado. Los módulos clave son:

1. **El Motor Central (`app/main.py`)**: 
   - Habilita `CORSMiddleware` para aceptar peticiones de `localhost:5173` (Vite).
   - Genera las tablas automáticamente con `Base.metadata.create_all`.
   - Incluye los sub-enrutadores (`invoices` y `facturas`).

2. **Modelos de Base de Datos (`app/models/factura.py`)**:
   - Posee las tablas `Factura` y `DetalleFactura` (enfocadas en tu nueva estructura).
   - Mantiene compatibilidad hacia atrás conservando `DBInvoice` y `DBInvoiceLine` para que el viejo endpoint no falle.
   - Usa campos `Numeric(12, 2)` vitales para no arrastrar errores de redondeo de punto flotante en cálculo de IGV.

3. **Esquemas de Validación (`app/schemas/invoice.py`)**:
   - Contiene la clase `FacturaCreate` (para el nuevo flujo). Obliga a que el RUC entrante tenga 11 dígitos, que la moneda sea estricta (PEN/USD) y que los montos sean positivos antes de tocar la base de datos.
   - También engloba todos los modelos antiguos (`InvoiceCreate`, `InvoiceLineCreate`, etc.) para sostener el módulo legado.

4. **El API / Endpoint de Emisión (`app/api/endpoints/facturas.py`)**:
   - Expone `POST /api/v1/facturas/emitir`.
   - **Flujo**: 
     1. Recibe el JSON validado.
     2. Abre una transacción en SQLAlchemy y guarda la Cabecera + Detalles.
     3. Responde exitosamente con código `HTTP 201 Created`.
     4. Encola una tarea asíncrona (`BackgroundTasks`) que simula la firma digital, el envío a SUNAT y actualiza finalmente el estado a `"Aceptado"` en la DB abriendo un scope independiente independiente.

---

## 3. Estado del Frontend (Interfaz e Integración)

El frontend ya logra inyectar facturas directamente hacia la base de datos de FastAPI. 

**Pantalla Principal (`src/pages/NewInvoice.tsx`)**:
- Consiste en un complejo y dinámico formulario visualmente muy pulido para puntos de ventas (POS) o ingresos ultrarrápidos.
- **Lógica de Estado**: 
  - Usando `useFieldArray` y `watch` de `react-hook-form`, puede observar en vivo las líneas de factura agregadas o eliminadas.
  - Calcula automáticamente el Subtotal, IGV (18%) y total a pagar de forma dinámica según el `igvType` (Gravado, Exonerado o Inafecto).
- **Integración con Backend (El `fetch`)**:
  - Al dar clic en Emitir (F12), la función `onSubmit` intercepta (hijacks) los datos, y los **mapea** en un objeto puramente ajustado a lo que requiere FastAPI (agregando campos simulados como "PEN" e inyectando un correlativo al azar).
  - Efectúa la invocación REST hacia `http://localhost:8000/api/v1/facturas/emitir`.
  - Escucha si hubo error 422 de Pydantic o Error 500 para mostrar en alertas visuales el estado al usuario, además de notificar cuando la base de datos inserta el comprobante con éxito.

---

## 4. Próximos Pasos (Hoja de Ruta Recomendada)

Actualmente, el esqueleto 100% vital (Frontend -> Backend -> Base de Datos -> "Simulación" SUNAT) está vivo. Para convertirlo en un SaaS en producción podrías considerar:

1. Reemplazar la simulación de `BackgroundTasks` integrando un certificado y un consumo real SOAP con la firma digital en XML de acuerdo al UBL 2.1 (usando librerías genéricas de XML o integrando APIs de terceros como Nubefact).
2. Aprovechar el paquete `reportlab` que ya está en tu `requirements.txt` para hacer un endpoint en FastAPI que devuelva un PDF visual del ticket o factura.
3. Usar `psycopg2` conectando FastAPI a un entorno PostgreSQL local en vez de SQLite (`sunat_db.sqlite`), bastará con cambiar la línea en `app.db.session`.
