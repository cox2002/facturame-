import io
import qrcode
from typing import Dict, Any
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
import reportlab.rl_config

# Opción de configuración de reportlab (opcional dependiente si importas fonts externos)
reportlab.rl_config.warnOnMissingFontGlyphs = 0

def generate_pos_ticket_pdf(invoice_data: Dict[str, Any], output_path: str) -> str:
    """
    Genera un comprobante electrónico en formato Ticket 80mm centrado en la facturación local.
    
    :param invoice_data: Diccionario con la estructura de la venta. Ejemplo:
        {
            "empresa_ruc": "20123456789",
            "empresa_razon": "MI EMPRESA S.A.C.",
            "cliente_doc": "10123456789",
            "cliente_nombre": "JUAN PEREZ",
            "serie_numero": "F001-0000001",
            "fecha": "2023-10-15 14:30:00",
            "items": [
                {"cant": 1, "desc": "Producto A", "total": 100.00},
            ],
            "op_gravada": 100.00,
            "igv": 18.00,
            "total": 118.00
        }
    :param output_path: Directorio o ruta completa (Ej. 'mis_pdfs/ticket_F001-1.pdf').
    :return: Retorna la misma ruta del archivo confirmando su generación.
    """
    
    # Un Ticket físico de 80mm imprime en un área útil de aprox 72mm-75mm. Utilizaremos el canvas de 75mm.
    PAGE_WIDTH = 75 * mm
    
    # Calcular altura dinámica de la página:
    # Base fija de la plantilla (Cabecera, Resumen, QR, Pie de página) = ~120mm
    # Por cada elemento vendido = ~8mm de alto extra
    items_count = len(invoice_data.get("items", []))
    PAGE_HEIGHT = (120 + (items_count * 8) + 40) * mm # 40 extra para padding inferior (QR Code area)
    
    # Iniciar motor PDF
    c = canvas.Canvas(output_path, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))
    
    # Iniciar lápiz y cursor (Y se dibuja de abajo hacia la parte superior en PDFs).
    # Comenzar cerca del tope y restar margen superior.
    margin_x = 3 * mm
    y_cursor = PAGE_HEIGHT - (8 * mm)
    
    # Funciones Helper para dibujar textos
    def center_text(text: str, current_y: float, font_name="Helvetica", size=9) -> float:
        c.setFont(font_name, size)
        c.drawCentredString(PAGE_WIDTH / 2.0, current_y, text)
        return current_y - (size + 3) # Restar la fuente más padding vertical

    def expand_text(left_str: str, right_str: str, current_y: float, font_name="Helvetica", size=8) -> float:
        c.setFont(font_name, size)
        c.drawString(margin_x, current_y, left_str)
        c.drawRightString(PAGE_WIDTH - margin_x, current_y, right_str)
        return current_y - (size + 3)

    def print_separator(current_y: float) -> float:
        c.setDash(2, 2)
        c.line(margin_x, current_y, PAGE_WIDTH - margin_x, current_y)
        c.setDash() # revertir a solido
        return current_y - 8

    # === [ INICIO DIBUJADO DE HOJA ] ===
    
    # 1. Información Empresa Emisora
    y_cursor = center_text(invoice_data.get("empresa_razon", "Empresa Modelo S.A.C"), y_cursor, font_name="Helvetica-Bold", size=10)
    y_cursor = center_text(f"RUC: {invoice_data.get('empresa_ruc', '')}", y_cursor, size=9)
    y_cursor -= 4 # Espaciador manual 
    
    # 2. Resumen del Comprobante
    y_cursor = center_text("FACTURA ELECTRÓNICA", y_cursor, font_name="Helvetica-Bold", size=9)
    y_cursor = center_text(invoice_data.get("serie_numero", ""), y_cursor, font_name="Helvetica-Bold", size=10)
    y_cursor = center_text(f"Fecha Emisión: {invoice_data.get('fecha', '')}", y_cursor, size=8)
    y_cursor -= 4

    # 3. Datos del Adquiriente / Cliente
    c.setFont("Helvetica", 8)
    c.drawString(margin_x, y_cursor, f"Cliente: {invoice_data.get('cliente_nombre', '')}")
    y_cursor -= 10
    c.drawString(margin_x, y_cursor, f"RUC/DNI: {invoice_data.get('cliente_doc', '')}")
    y_cursor -= 6

    # Separador Cabecera / Cuerpo
    y_cursor = print_separator(y_cursor)

    # 4. Tabla - Encabezados
    c.setFont("Helvetica-Bold", 8)
    c.drawString(margin_x, y_cursor, "CANT")
    c.drawString(margin_x + 10*mm, y_cursor, "CONCEPTO / DESCR.")
    c.drawRightString(PAGE_WIDTH - margin_x, y_cursor, "IMPORTE")
    y_cursor -= 12

    # 5. Iterar Artículos en Venta
    c.setFont("Helvetica", 8)
    for index, item in enumerate(invoice_data.get("items", [])):
        cant_str = str(item.get("cant", "1"))
        # Recortar texto muy largo que sobrepase límite horizontal de tabla
        desc_str = str(item.get("desc", ""))[:20] 
        total_str = f"{float(item.get('total', 0)):.2f}"
        
        c.drawString(margin_x, y_cursor, cant_str)
        c.drawString(margin_x + 10*mm, y_cursor, desc_str)
        c.drawRightString(PAGE_WIDTH - margin_x, y_cursor, total_str)
        y_cursor -= 10
        
    y_cursor += 3 # Retroceder el margin de la última fila 
    y_cursor = print_separator(y_cursor)

    # 6. Sumatorias y Totales
    op_gravada = f"S/ {float(invoice_data.get('op_gravada', 0)):.2f}"
    igv = f"S/ {float(invoice_data.get('igv', 0)):.2f}"
    total = f"S/ {float(invoice_data.get('total', 0)):.2f}"
    
    y_cursor = expand_text("OP. GRAVADAS:", op_gravada, y_cursor)
    y_cursor = expand_text("IGV 18%:", igv, y_cursor)
    
    # Resaltar Total A Pagar
    c.setFont("Helvetica-Bold", 8)
    y_cursor = expand_text("IMPORTE TOTAL:", total, y_cursor, font_name="Helvetica-Bold", size=9)
    y_cursor -= 10

    # 7. Generación del Código QR Real
    # SUNAT requiere que se imprima la representación bidimensional (QR) de los datos del Hash.
    qr_data = invoice_data.get("qr_data", "HashNoProporcionado|RUC|TIPO|SERIE|NUMERO")
    
    # Generar QR dinámico en memoria
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=1,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convertir imagen PIL a un formato que ReportLab pueda incrustar sin guardarlo a disco
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    # Dimensiones del QR en el PDF
    qr_w = 26 * mm
    qr_x = (PAGE_WIDTH - qr_w) / 2
    
    # Dibujar la imagen sobre el canvas
    c.drawImage(ImageReader(img_byte_arr), qr_x, y_cursor - qr_w, width=qr_w, height=qr_w)
    
    # Reubicar cursor terminando el QR
    y_cursor -= (qr_w + 5)
    
    # 8. Pie de Página Regulativo
    c.setFont("Helvetica", 7)
    c.drawCentredString(PAGE_WIDTH / 2, y_cursor, "Representación impresa de la Factura Electrónica")
    y_cursor -= 8
    c.drawCentredString(PAGE_WIDTH / 2, y_cursor, "Consulte el recibo en: e-factura.sunat.gob.pe")
    c.drawCentredString(PAGE_WIDTH / 2, y_cursor - 8, "¡Gracias por su compra!")
    
    # Grabar a disco el buffer de la hoja PDF
    c.save()
    
    return output_path
