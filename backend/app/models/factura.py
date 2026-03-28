from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class EstadoSunat(str, enum.Enum):
    PENDIENTE = "Pendiente"
    ACEPTADO = "Aceptado"
    RECHAZADO = "Rechazado"

class Factura(Base):
    """
    Modelo representativo de la tabla de Facturas en la Base de Datos.
    """
    __tablename__ = "facturas"

    id = Column(Integer, primary_key=True, index=True)
    serie = Column(String(4), nullable=False)
    numero = Column(Integer, nullable=False)
    fecha_emision = Column(Date, nullable=False)
    ruc_cliente = Column(String(11), nullable=False)
    razon_social = Column(String(200), nullable=False)
    moneda = Column(String(3), nullable=False)  # PEN o USD
    total_igv = Column(Numeric(12, 2), nullable=False)
    total_venta = Column(Numeric(12, 2), nullable=False)
    estado_sunat = Column(Enum(EstadoSunat), default=EstadoSunat.PENDIENTE, nullable=False)

    # Relación de 1 a muchos con DetalleFactura
    # cascade="all, delete-orphan" asegura que si se borra la factura, se borran sus detalles
    detalles = relationship("DetalleFactura", back_populates="factura", cascade="all, delete-orphan")

class DetalleFactura(Base):
    """
    Modelo representativo de los ítems o detalles pertenecientes a una Factura.
    """
    __tablename__ = "detalle_facturas"

    id = Column(Integer, primary_key=True, index=True)
    factura_id = Column(Integer, ForeignKey("facturas.id"), nullable=False)
    
    descripcion = Column(String(255), nullable=False)
    cantidad = Column(Numeric(12, 2), nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    # Relación inversa hacia Factura
    factura = relationship("Factura", back_populates="detalles")

class DBInvoice(Base):
    __tablename__ = "db_invoices"
    id = Column(Integer, primary_key=True, index=True)
    voucher_type = Column(String)
    serie = Column(String)
    number = Column(Integer)
    issue_date = Column(Date)
    currency = Column(String)
    total_taxed = Column(Numeric(12, 2))
    total_exonerated = Column(Numeric(12, 2))
    total_unaffected = Column(Numeric(12, 2))
    total_igv = Column(Numeric(12, 2))
    total_amount = Column(Numeric(12, 2))
    hash_cpe = Column(String)
    qr_content = Column(String)
    sunat_status = Column(String)

class DBInvoiceLine(Base):
    __tablename__ = "db_invoice_lines"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("db_invoices.id"))
    description = Column(String)
    quantity = Column(Numeric(12, 2))
    unit_price = Column(Numeric(12, 2))
    igv_type = Column(String)
