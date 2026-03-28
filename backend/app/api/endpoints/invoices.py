from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Any
import hashlib
from datetime import date
import uuid

from app.schemas.invoice import InvoiceCreate, InvoiceResponse, IgvType
from app.db.session import get_db
from app.models.factura import DBInvoice, DBInvoiceLine

router = APIRouter()

# Función mock para simular comportamiento SUNAT UBL 2.1
def simulate_sunat_signer(voucher_type: str, serie: str, number: int, total: float):
    raw_str = f"20000000001|{voucher_type}|{serie}|{number}|18.00|{total}|2026-03-18|6|20123456789|"
    hash_cpe = hashlib.sha256(raw_str.encode()).hexdigest()
    qr_content = f"{raw_str}HASH:{hash_cpe[:20]}" 
    return hash_cpe, qr_content

@router.post("/", response_model=InvoiceResponse, status_code=201)
def create_invoice(invoice_in: InvoiceCreate, db: Session = Depends(get_db)) -> Any:
    """
    Endpoint para emisión de Comprobantes (Factura o Boleta).
    Procesa, genera QR/Hash y hace commit a base de datos atómico.
    """
    total_taxed = 0.0
    total_exonerated = 0.0
    total_unaffected = 0.0
    total_igv = 0.0
    
    # 1. Procesar líneas 
    for line in invoice_in.lines:
        line_total = line.quantity * line.unit_price 
        
        if line.igv_type == IgvType.GRAVADO:
            unit_value = line.unit_price / 1.18
            line_subtotal = line.quantity * unit_value
            line_igv = line_total - line_subtotal
            
            total_taxed += line_subtotal
            total_igv += line_igv       
        elif line.igv_type == IgvType.EXONERADO:
            total_exonerated += line_total
        elif line.igv_type == IgvType.INAFECTO:
            total_unaffected += line_total

    total_amount = total_taxed + total_exonerated + total_unaffected + total_igv

    # 2. Correlativo Generado Automáticamente (Idealmente DB MAX number + 1)
    next_number = 1055

    # 3. Datos criptográficos simulados
    hash_cpe, qr_content = simulate_sunat_signer(
        invoice_in.voucherType.value, 
        invoice_in.serie, 
        next_number, 
        round(total_amount, 2)
    )

    # 4. Transacción Base de Datos (SQLAlchemy ORM)
    db_invoice = DBInvoice(
        voucher_type=invoice_in.voucherType.value,
        serie=invoice_in.serie,
        number=next_number,
        issue_date=date.today(),
        currency=invoice_in.currency,
        total_taxed=round(total_taxed, 2),
        total_exonerated=round(total_exonerated, 2),
        total_unaffected=round(total_unaffected, 2),
        total_igv=round(total_igv, 2),
        total_amount=round(total_amount, 2),
        hash_cpe=hash_cpe,
        qr_content=qr_content,
        sunat_status="ACEPTADO"
    )
    db.add(db_invoice)
    db.flush()

    # Añadir detalle
    for line in invoice_in.lines:
        db_line = DBInvoiceLine(
            invoice_id=db_invoice.id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            igv_type=line.igv_type.value
        )
        db.add(db_line)

    db.commit()
    db.refresh(db_invoice)

    return db_invoice
