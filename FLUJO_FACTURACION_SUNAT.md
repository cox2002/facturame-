# Flujo de Facturación Electrónica SUNAT (Backend FastAPI)

Este documento detalla la arquitectura y el proceso (pipeline) que sigue una Factura desde que el usuario presiona "Emitir" en el Frontend (React) hasta que SUNAT la acepta y se imprime el Documento/Ticket PDF.

## ⚙️ Arquitectura General

Tu sistema moderno de facturación se compone del siguiente canal sincrónico/asincrónico:

```mermaid
graph TD
    A[Frontend React/Vite] -->|POST JSON| B(FastAPI Router: /api/v1/invoices)
    B -->|Pydantic| C{Validación de Datos}
    C -- Errores --> A
    C -- Válido --> D[PostgreSQL: app/db/session.py]
    
    D --> E[Firma XML UBL 2.1]
    E --> F[Cliente SOAP SUNAT: app/core/sunat.py]
    
    F -->|Envía ZIP| G((API WS SUNAT BETA))
    G -.->|Retorna ZIP (CDR)| F
    
    F -->|Decodificación y Parseo| H{Evaluación CDR}
    H -->|Rechazado| I[Actualizar DB: Rechazado]
    H -->|Aceptado (Código 0)| J[Actualizar DB: Aceptado]
    
    J --> K[Generar Ticket 80mm: app/services/pdf_builder.py]
    K -->|Dibuja QR| L(Retornar PDF al Frontend)
    I --> M(Retornar Error al Frontend)
```

## 🔄 El Flujo Paso a Paso

### 1. Recepción y Validación (`app/api/endpoints`)
Cuando el vendedor finaliza una venta, el Frontend de React realiza un `POST` (con CORS habilitado) al endpoint de FastAPI (ej: `/api/v1/invoices` o `/api/v1/facturas`).
- **Qué ocurre:** FastAPI recibe un JSON. Utiliza tus esquemas de validación de `Pydantic` para asegurarse de que el RUC sea de 11 dígitos, que todas las sumas de IGV concuerden y que la moneda sea válida (PEN/USD).

### 2. Persistencia Segura (`app/db/session.py`)
Antes de enviar nada al gobierno, los datos deben estar seguros.
- **Qué ocurre:** Utilizando el pool optimizado de conexiones de `psycopg2` para PostgreSQL, el motor de `SQLAlchemy` inicia una sesión. Inserta la factura base y todos los ítems del detalle (en sus respectivas tablas).
- El estado de la factura en tu base de datos suele iniciar como `"PENDIENTE"`.

### 3. Generación y Firma del XML (UBL 2.1)
SUNAT exige que todos los datos transaccionales se acoplen bajo el estándar UBL 2.1.
- **Qué ocurre:** Un servicio interno toma esta factura, redacta el XML pesado con la especificación de SUNAT, realiza cálculos criptográficos basándose en el Certificado Digital (`.pfx` o `.pem`) de la empresa emisora para firmarlo. Se obtiene un **Valor Resumen (Hash)**.

### 4. Transmisión hacia SUNAT (`app/core/sunat.py`)
Con el comprobante (XML) armado, tu backend empaca ese XML en un archivo compreso `.zip`. 
- **Qué ocurre:** Hacemos uso del `SunatSoapClient` que acabamos de configurar. Este se conecta mediante `zeep` manejando autenticación básica WS-Security (RUC+Usuario) y tolerancias de tiempo (timeout de 30s) al WebService BETA o Producción.

### 5. Recepción y Análisis del CDR
SUNAT es estricto en devolver respuestas binarias. El método `_process_cdr_zip` en `sunat.py` recibe un buffer.
- **Qué ocurre:** Descomprimimos dinámicamente el `.zip` directamente en la RAM (usando `io.BytesIO()`) sin usar tu disco. Extraemos el XML de Constancia de Recepción (CDR) y `xml.etree` busca la etiqueta fundamental `<ResponseCode>`.
    - **Si es `0`:** SUNAT la aceptó formal y tributariamente.
    - **Si es `>= 2000`:** Ha sido Rechazada y SUNAT nos devuelve un `Código` y una `<Description>` como motivo (ej. RUC del cliente inválido).

### 6. Actualización de Estados e Intercepción de Errores
- Inmediatamente, el backend actualiza el estado de la factura de `"PENDIENTE"` a `"ACEPTADO"` (y guarda el XML de respuesta CDR en la base de datos o en el Storage de AWS S3 como resguardo legal exigido).

### 7. Generación Dinámica del PDF (`app/services/pdf_builder.py`)
Ahora que la venta ya existe y es legal, toca darle el comprobante físico al cliente de manera optimizada y relámpago.
- **Qué ocurre:** Llamamos al método `generate_pos_ticket_pdf()`. Le pasamos un diccionario de los datos. 
- La librería `ReportLab` dibuja de abajo hacia arriba en coordenadas "puntuales". La altura del ticket se calcula automáticamente (alarga el papel) basado en cuántos items compró el cliente.
- Lo más importante: Usando la cadena Hash generada anteriormente, se forja (en memoria con `qrcode` y `Pillow`) el Código QR bidimensional y directamente se estampa en la cola del PDF antes de cerrar el documento.

### 8. Finalización y Devolución Funcional
Tu endpoint finaliza el ciclo devolviéndole la URL del documento PDF listo o retornando su base64 al Frontend de React (con el JSON estatus tipo `HTTP 200 OK`). El Frontend simplemente abre una ventana con el comprobante y lanza la petición de impresión de la ticketera, vaciando el carrito de forma exitosa.
