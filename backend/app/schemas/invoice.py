from pydantic import BaseModel, Field, field_validator
from typing import List
from datetime import date
from decimal import Decimal

class ItemCreate(BaseModel):
    """
    Esquema para la validación de cada ítem/detalle de la factura.
    """
    descripcion: str = Field(..., min_length=1, max_length=255)
    cantidad: Decimal = Field(..., gt=0)
    precio_unitario: Decimal = Field(..., gt=0)
    subtotal: Decimal = Field(..., gt=0)

class FacturaCreate(BaseModel):
    """
    Esquema fundamental para recibir el JSON del request.
    Contiene la cabecera de la factura y la lista de ítems.
    """
    serie: str = Field(..., min_length=4, max_length=4)
    numero: int = Field(..., gt=0)
    fecha_emision: date
    ruc_cliente: str
    razon_social: str = Field(..., min_length=2)
    moneda: str
    total_igv: Decimal = Field(..., ge=0)
    total_venta: Decimal
    detalles: List[ItemCreate] = Field(..., min_length=1)

    @field_validator('ruc_cliente')
    @classmethod
    def validar_ruc(cls, v: str) -> str:
        # El documento debe tener 8 (DNI) o 11 (RUC) dígitos y contener solo números
        if len(v) not in (8, 11) or not v.isdigit():
            raise ValueError('El documento del cliente (DNI/RUC) debe tener 8 o 11 dígitos numéricos.')
        return v

    @field_validator('moneda')
    @classmethod
    def validar_moneda(cls, v: str) -> str:
        # Validación estricta para PEN o USD
        if v not in ('PEN', 'USD'):
            raise ValueError('La moneda debe ser estrictamente "PEN" o "USD".')
        return v

    @field_validator('total_venta')
    @classmethod
    def validar_total_venta(cls, v: Decimal) -> Decimal:
        # El total de la venta debe ser mayor a 0
        if v <= 0:
            raise ValueError('El total de la venta debe ser mayor a 0.')
        return v

import enum

class IgvType(str, enum.Enum):
    GRAVADO = "GRAVADO"
    EXONERADO = "EXONERADO"
    INAFECTO = "INAFECTO"

class VoucherType(str, enum.Enum):
    FACTURA = "01"
    BOLETA = "03"

class InvoiceLineCreate(BaseModel):
    description: str
    quantity: float
    unit_price: float
    igv_type: IgvType

class InvoiceCreate(BaseModel):
    lines: List[InvoiceLineCreate]
    voucherType: VoucherType
    serie: str
    currency: str

class InvoiceResponse(BaseModel):
    id: int
    voucher_type: str
    serie: str
    number: int
    issue_date: date
    currency: str
    total_taxed: float
    total_exonerated: float
    total_unaffected: float
    total_igv: float
    total_amount: float
    hash_cpe: str
    qr_content: str
    sunat_status: str

    model_config = {
        "from_attributes": True
    }

class FacturaOut(FacturaCreate):
    id: int
    estado_sunat: str

    model_config = {
        "from_attributes": True
    }

class ChartData(BaseModel):
    name: str
    sales: float

class FacturaStats(BaseModel):
    ventas_mes: str
    cambio_ventas: str
    is_positive_ventas: bool
    emitidos: str
    cambio_emitidos: str
    is_positive_emitidos: bool
    pendientes: str
    cambio_pendientes: str
    is_positive_pendientes: bool
    grafico_ventas: List[ChartData]
