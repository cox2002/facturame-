from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import invoices
from app.api.endpoints import facturas
from app.api.endpoints import clients
from app.db.session import engine, Base

# Construir tablas en SQLite automáticamente al arrancar
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SaaS Facturación Electrónica Perú",
    description="Motor de facturación electrónica avanzado compatible con SUNAT - UBL 2.1",
    version="1.0.0"
)

# CORS Middleware (Exclusivo para origen de Vite local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

# Integración del módulo central de facturación
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["Emisión Comprobantes"])
app.include_router(facturas.router, prefix="/api/v1/facturas", tags=["Facturación Emisión"])
app.include_router(clients.router, prefix="/api/v1/clients", tags=["Gestión de Clientes"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "SUNAT UBL Engine Activo"}
