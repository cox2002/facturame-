-- scripts/schema.sql
-- Base de Datos PostgreSQL para Sistema de Facturación Electrónica SUNAT (Perú)

-- 1. Extensiones y Tipos ENUM
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE doc_identity_type AS ENUM ('DNI', 'RUC', 'CE', 'PASAPORTE');
CREATE TYPE voucher_type AS ENUM ('01', '03', '07', '08'); -- 01: Factura, 03: Boleta, 07: Nota Crédito, 08: Nota Débito
CREATE TYPE igv_type AS ENUM ('GRAVADO', 'EXONERADO', 'INAFECTO');
CREATE TYPE sunat_status AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'ANULADO', 'CON_OBSERVACIONES');

-- 2. Tabla de Clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type doc_identity_type NOT NULL,
    document_number VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    comercial_name VARCHAR(255),
    address TEXT,
    ubigeo VARCHAR(6),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Productos/Servicios
CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) NOT NULL UNIQUE,
    sunat_code VARCHAR(10), -- Código de producto SUNAT opcional (e.g. 10000000)
    name VARCHAR(255) NOT NULL,
    unit_measure VARCHAR(5) NOT NULL DEFAULT 'NIU', -- NIU (Bienes), ZZ (Servicios)
    sale_price NUMERIC(15, 4) NOT NULL, -- Precio de Venta (Con o sin IGV dependiendo de la lógica de catálogo)
    igv_type igv_type NOT NULL DEFAULT 'GRAVADO',
    stock NUMERIC(15, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla Principal de Comprobantes (Facturas/Boletas)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    voucher_type voucher_type NOT NULL,
    serie VARCHAR(4) NOT NULL, -- F001, B001
    number INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'PEN',
    
    -- Montos calculados
    total_taxed NUMERIC(15, 2) DEFAULT 0, -- Total Gravado
    total_exonerated NUMERIC(15, 2) DEFAULT 0,
    total_unaffected NUMERIC(15, 2) DEFAULT 0,
    total_discount NUMERIC(15, 2) DEFAULT 0,
    total_igv NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    
    -- Datos SUNAT
    sunat_status sunat_status DEFAULT 'PENDIENTE',
    hash_cpe VARCHAR(255), -- Hash generado post firmado
    qr_content TEXT,
    xml_path TEXT,         -- Ruta al archivo XML firmado en Storage
    cdr_path TEXT,         -- Ruta al archivo de respuesta SUNAT (CDR)
    pdf_path TEXT,         -- Ruta al PDF generado
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricción: Una misma serie y número de comprobante es único
    UNIQUE(serie, number, voucher_type)
);

-- 5. Detalle de los Comprobantes
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES catalog_items(id) ON DELETE RESTRICT,
    
    description VARCHAR(255) NOT NULL,
    unit_measure VARCHAR(5) NOT NULL,
    quantity NUMERIC(15, 4) NOT NULL,
    
    unit_value NUMERIC(15, 4) NOT NULL, -- Valor sin IGV
    unit_price NUMERIC(15, 4) NOT NULL, -- Precio con IGV
    
    igv_amount NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL, -- quantity * unit_value
    total NUMERIC(15, 2) NOT NULL,    -- quantity * unit_price
    
    igv_type igv_type NOT NULL
);

-- 6. Índices Recomendados por Performance
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_status ON invoices(sunat_status);
CREATE INDEX idx_clients_doc_number ON clients(document_number);
