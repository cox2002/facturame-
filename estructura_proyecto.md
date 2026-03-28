# Arquitectura del Sistema de Facturación Electrónica SaaS (Perú - SUNAT)

Esta es la arquitectura de alto nivel diseñada para garantizar **Escalabilidad, Alta Disponibilidad, y cumplimiento estricto normativo** para los estándares de contabilidad y facturación de la SUNAT peruana (UBL 2.1).

## 1. Estructura de Carpetas

```text
software_facturacion/
├── backend/                  # Python + FastAPI (Alto Rendimiento)
│   ├── app/
│   │   ├── api/              # Controladores y capa de red (Endpoints REST)
│   │   │   ├── endpoints/    # Funciones que resuelven los request HTTP
│   │   │   └── router.py     # Gestor de routers
│   │   ├── core/             # Lógica crítica y de negocio no relacionada al exterior
│   │   │   ├── config.py     # Manejo de secrets (.env), DB y variables globales
│   │   │   └── sunat.py      # Core UBL 2.1: Construcción de XML y Firmado Digital (.p12)
│   │   ├── db/               # Integración con BD
│   │   │   └── session.py    # Configuración SQLAlchemy para PostgreSQL
│   │   ├── models/           # Mapping Relacional - ORM SQLAlchemy
│   │   │   └── factura.py    
│   │   ├── schemas/          # Modelos Pydantic (Serialización/Deserialización y Validación de API)
│   │   │   └── invoice.py    # Reglas estrictas de validación de entradas de una factura
│   │   ├── services/         # Servicios Acoplados / Casos de Uso
│   │   │   ├── qr_service.py # Lógica de construcción gráfica de Códigos QR según R.S SUNAT
│   │   │   └── pdf_builder.py# Generación rápida de formatos de reporte (A4, Ticket 80mm/58mm) usando ReportLab.
│   │   └── main.py           # Kernel de FastAPI e inicialización de App
│   ├── scripts/
│   │   └── schema.sql        # Modelado Relacional de la base de Datos.
│   └── requirements.txt
├── frontend/                 # Frontend "SaaS Dashboard" (React / Next.js)
│   ├── src/
│   │   ├── components/       # Librería de Componentes agnósticos UI (Botones, Tablas)
│   │   ├── pages/            # Vistas Completas (Login, Dashboard de Gráficos, Emisión)
│   │   ├── hooks/            # Manejo de Estados asíncronos y API.
│   │   └── utils/            # Utilidades de frontend (RUC Validators, Currency Format PEN)
│   ├── tailwind.config.js    # Configuración de Clases utilitarias Modernas UI
│   └── package.json
└── docker-compose.yml        # Orquestación de entorno de desarrollo: DB + API + Frontend
```

## 2. Decisiones de Arquitectura Tomadas

### A. Python (FastAPI + Pydantic) para el Backend
1. **Velocidad y Asincronía:** FastAPI está basado en Starlette. Es absurdamente veloz. Como un sistema SaaS lidia con cientos o miles de emisiones por hora, es crítico tener endpoints no bloqueantes (usando concurrencia I/O). Lo ideal en el futuro es delegar a **Celery Worker** la tarea de solicitar el CDR (Constancia de Recepción) a la API de SUNAT.
2. **Validación Estricta:** Gracias a **Pydantic**, nos libramos de múltiples ataques y errores lógicos de entrada. Si un "Tipo de Documento" para FACTURA entra como `05` en vez de `01`, Pydantic aborta automáticamente con un `422 Unprocessable Entity` antes de que la carga corrompa la lógica.

### B. PostgreSQL (Integridad ACID)
1. Es imperdonable la inconsistencia en sistemas financieros. El uso estricto de restricciones relacionales previene problemas como facturas emitidas a clientes que fueron eliminados o errores con totales inconsistentes. Se maneja aritmética pura para cálculo de IGV, Subtotales y Redondeos en su modelado.

### C. Sistema de Facturación SUNAT
1. **Delegación de Responsabilidad:** La ruta REST únicamente procesa el negocio, la venta en crudo y la guarda en la base de datos.
2. Después de guardar, o mediante un modelo de cola de mensajes, se generará desde un servicio independiente (`app/core/sunat.py`) la conversión a UBL 2.1 (XML), su firmado con el certificado digital de empresa `.p12`, y la compresión ZIP para la remisión vía servicio SOAP / REST OSE-SUNAT.

### D. Interfaz Moderna React + Tailwind CSS
1. El diseño `SaaS Dashboard` exige limpieza profunda. Con Tailwind se creará un grid reactivo. El POS (Caja) o pestaña principal de "Nueva Factura" será totalmente controlable por teclado para maximizar el UX del cajero (Searchbars rápidos, enter para confirmar).
