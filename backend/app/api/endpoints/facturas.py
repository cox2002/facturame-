from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import time
import logging

from app.models.factura import Factura, DetalleFactura, EstadoSunat
from app.schemas.invoice import FacturaCreate, FacturaOut, FacturaStats, ChartData
from typing import List
from sqlalchemy import func
from datetime import date, timedelta

from app.db.session import get_db, SessionLocal

router = APIRouter()
logger = logging.getLogger(__name__)

def procesar_envio_sunat(factura_id: int):
    """
    Tarea en segundo plano asíncrona que simula la generación del XML 
    y el consumo del web service de SUNAT.
    """
    try:
        logger.info(f"[Background Task] Iniciando envío de factura ID {factura_id} a SUNAT.")
        
        # 1. Simulación de la firma electrónica y generación del XML
        time.sleep(1.5)
        logger.info(f"[Background Task] XML de factura {factura_id} generado exitosamente.")
        
        # 2. Simulación de la comunicación con la API de envío a SUNAT
        time.sleep(2.0)
        logger.info(f"[Background Task] Respuesta de SUNAT recibida para factura {factura_id}.")
        
        # 3. Abrir de forma independiente una nueva sesión para actualizar el estado a la base de datos
        db_session: Session = SessionLocal()
        
        factura_db = db_session.query(Factura).filter(Factura.id == factura_id).first()
        if factura_db:
            factura_db.estado_sunat = EstadoSunat.ACEPTADO
            db_session.commit()
            logger.info(f"[Background Task] Estado de factura {factura_id} cambiado a ACEPTADO.")
        else:
            logger.warning(f"[Background Task] No se encontró la factura {factura_id}.")
            
    except Exception as e:
        logger.error(f"[Background Task] Falló el procesamiento para la factura {factura_id}: {str(e)}")
    finally:
        if 'db_session' in locals():
            db_session.close()


@router.post("/emitir", status_code=status.HTTP_201_CREATED)
def emitir_factura(
    factura_in: FacturaCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)  
):
    """
    Endpoint principal para emitir una nueva factura electrónica.
    Dará una respuesta rápida guardándolo en base de datos en estado Pendiente
    y encolará el envío a la SUNAT a través de BackgroundTasks.
    """
    try:
        # Creación cabecera de la base de datos basándose en el schema recibido
        nueva_factura = Factura(
            serie=factura_in.serie,
            numero=factura_in.numero,
            fecha_emision=factura_in.fecha_emision,
            ruc_cliente=factura_in.ruc_cliente,
            razon_social=factura_in.razon_social,
            moneda=factura_in.moneda,
            total_igv=factura_in.total_igv,
            total_venta=factura_in.total_venta,
            estado_sunat=EstadoSunat.PENDIENTE  # El estado inicial siempre será PENDIENTE
        )
        
        # Agregar los detalles a la factura (Relación 1 a muchos)
        for item in factura_in.detalles:
            nuevo_detalle = DetalleFactura(
                descripcion=item.descripcion,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=item.subtotal
            )
            nueva_factura.detalles.append(nuevo_detalle)
            
        # Petición para guardar los cambios a la DB
        db.add(nueva_factura)
        db.commit()
        
        # Se refresca para que Postgres devuelva el `id` asignado a la nueva factura
        db.refresh(nueva_factura)
        
        # Encolamos la tarea en segundo plano usando el scope de BackgroundTasks de FastAPI
        background_tasks.add_task(procesar_envio_sunat, nueva_factura.id)
        
        return {
            "mensaje": "La factura ha sido registrada exitosamente y se encuentra en envío a la SUNAT.",
            "factura_id": nueva_factura.id,
            "estado": nueva_factura.estado_sunat
        }
        
    except SQLAlchemyError as db_err:
        # En caso ocurra algún fallo de integridad o conexión a base de datos
        db.rollback()
        logger.exception("Error de base de datos creando la factura.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al registrar los datos en PostgreSQL."
        )
    except Exception as exc:
        db.rollback()
        logger.exception("Error inesperado en la emisión de factura.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ocurrió un error inesperado al procesar la solicitud: {str(exc)}"
        )

@router.get("/", response_model=List[FacturaOut])
def get_facturas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtener lista de todas las facturas procesadas.
    """
    facturas = db.query(Factura).order_by(Factura.id.desc()).offset(skip).limit(limit).all()
    return facturas

@router.get("/stats", response_model=FacturaStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Obtener estadísticas consolidadas para el Dashboard.
    """
    # 1. Total Ventas (Suma de total_venta)
    total_ventas = db.query(func.sum(Factura.total_venta)).scalar() or 0.0

    # 2. Documentos Emitidos
    total_emitidos = db.query(func.count(Factura.id)).scalar() or 0

    # 3. Pendientes SUNAT
    total_pendientes = db.query(func.count(Factura.id)).filter(Factura.estado_sunat == EstadoSunat.PENDIENTE).scalar() or 0

    # 4. Gráfico de ventas de últimos 7 días (Mock o real, lo haremos real)
    today = date.today()
    chart_data = []
    
    # Rellenar con los ultimos 6 dias + hoy
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        # Sumar ventas en este fecha
        daily_sales = db.query(func.sum(Factura.total_venta)).filter(Factura.fecha_emision == target_date).scalar() or 0.0
        
        # Format label '13 Mar'
        meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        label = f"{target_date.day} {meses[target_date.month - 1]}"
        chart_data.append(ChartData(name=label, sales=float(daily_sales)))

    # Construir response
    return FacturaStats(
        ventas_mes=f"S/ {total_ventas:,.2f}",
        cambio_ventas="+0.0%",  # Mock comparativo por simplicidad
        is_positive_ventas=True,
        emitidos=str(total_emitidos),
        cambio_emitidos="+0.0%",
        is_positive_emitidos=True,
        pendientes=str(total_pendientes),
        cambio_pendientes="0.0%",
        is_positive_pendientes=False,
        grafico_ventas=chart_data
    )
