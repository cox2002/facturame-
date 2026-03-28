import os
import zipfile
import base64
import io
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional

from zeep import Client, Settings
from zeep.transports import Transport
from zeep.exceptions import Fault
import requests
from requests.auth import HTTPBasicAuth

# URL del Web Service BETA de SUNAT
SUNAT_BETA_URL = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl"

class SunatSoapClient:
    def __init__(self, ruc: str, username: str, password: str):
        """
        Inicializa el cliente SOAP para SUNAT.
        SUNAT requiere que el usuario sea el RUC concatenado con el usuario secundario.
        Por ejemplo: ruc="20123456789", username="MODDATOS", password="MODDATOS"
        """
        self.ruc = ruc
        self.username = username
        self.password = password
        self.auth_user = f"{self.ruc}{self.username}"
        
        # Configurar timeout y autenticación para Zeep usando requests
        session = requests.Session()
        session.auth = HTTPBasicAuth(self.auth_user, self.password)
        
        # Timeout de 30 segundos recomendado para interactuar con WS SUNAT
        transport = Transport(session=session, timeout=30)
        
        # strict=False ayuda con WSDLs que tengan comportamientos inesperados (común en WS legacy)
        settings = Settings(strict=False, xml_huge_tree=True)
        
        # Inicializar y compilar cliente SOAP de forma "lazy" o síncrona
        self.client = Client(
            wsdl=SUNAT_BETA_URL,
            transport=transport,
            settings=settings
        )
        
    def send_bill(self, zip_file_path: str, filename: str) -> Dict[str, Any]:
        """
        Envía un archivo .zip con el XML firmado a la SUNAT.
        
        :param zip_file_path: Ruta completa al archivo .zip generado en disco.
        :param filename: Nombre del archivo zip que espera SUNAT (ej. '20123456789-01-F001-1.zip').
        :return: Diccionario con el estado de la comunicación y respuesta ("Aceptado", "Rechazado", "Excepción").
        """
        try:
            # 1. Leer el archivo ZIP binario desde el sistema de archivos
            if not os.path.exists(zip_file_path):
                return {
                    "estado": "Excepción",
                    "codigo": None,
                    "mensaje": f"El archivo {zip_file_path} no existe en el servidor."
                }
                
            with open(zip_file_path, "rb") as f:
                zip_content = f.read()
                
            # 2. Enviar comprobante
            # Zeep codificará a base64 automáticamente basándose en la especificación WSDL (base64Binary).
            # En caso el WSDL requiera explícitamente un base64 encode en local, se puede usar: base64.b64encode(zip_content)
            # Para sendBill de SUNAT, enviando los bytes es suficiente.
            response = self.client.service.sendBill(
                fileName=filename,
                contentFile=zip_content
            )
            
            # 3. Validar respuesta
            # response contiene el ZIP de respuesta de SUNAT (CDR - Constancia de Recepción)
            if not response:
                return {
                    "estado": "Excepción",
                    "codigo": None,
                    "mensaje": "Respuesta vacía o nula devuelta por el servidor de SUNAT."
                }

            # 4. Extraer y procesar el CDR (Constancia de Recepción) del ZIP byte response
            return self._process_cdr_zip(response)

        except Fault as fault:
            # Errores SOAP devueltos por la SUNAT (Ej. 0300 - El XML está mal formado)
            error_code = fault.code or getattr(fault.detail, 'faultcode', 'Desconocido')
            error_msg = fault.message
            return {
                "estado": "Rechazado",
                "codigo": str(error_code),
                "mensaje": f"SOAP Fault detectado: {error_msg}"
            }
        except requests.exceptions.Timeout:
            # Timeout de conexión
            return {
                "estado": "Excepción",
                "codigo": "TIMEOUT",
                "mensaje": "Tiempo de espera agotado al conectar y esperar respuesta de la SUNAT."
            }
        except requests.exceptions.ConnectionError:
            # Excepción a nivel SSL o resolución DNS
            return {
                "estado": "Excepción",
                "codigo": "CONNECTION_ERROR",
                "mensaje": "Error de conexión o validación SSL con los servidores web de la SUNAT."
            }
        except Exception as e:
            # Catch all de seguridad
            return {
                "estado": "Excepción",
                "codigo": "ERROR_INTERNO",
                "mensaje": f"Error inesperado procesando el envío a SUNAT: {str(e)}"
            }

    def _process_cdr_zip(self, zip_data: Any) -> Dict[str, Any]:
        """
        Decodifica y extrae el XML contenido en el ZIP de respuesta para leer su contenido.
        """
        try:
            # SUNAT puede devolver el binario pero Zeep interpreta el base64 y te devuelve string
            # Por seguridad, manejar tanto bytes como strings base64.
            if isinstance(zip_data, str):
                zip_data = base64.b64decode(zip_data)

            # Abrir archivo ZIP en memoria
            with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
                # El archivo de Constancia XML suele llamarse "R-RUC-TIPO-SERIE-NUM.xml"
                xml_filename = next((n for n in zf.namelist() if n.lower().endswith('.xml')), None)
                if not xml_filename:
                    return {
                        "estado": "Excepción",
                        "codigo": None,
                        "mensaje": "El archivo ZIP de respuesta no contiene un CDR XML adentro."
                    }
                
                # Leer XML original de la constancia de recepción
                xml_content = zf.read(xml_filename)
                
                # Parsear el XML para extraer los nodos ResponseCode y Description
                return self._parse_cdr_xml(xml_content)

        except zipfile.BadZipFile:
            return {
                "estado": "Excepción",
                "codigo": "ZIP_INVALIDO",
                "mensaje": "El archivo devuelto por SUNAT está corrupto o no es un ZIP válido."
            }
        except Exception as e:
            return {
                "estado": "Excepción",
                "codigo": "ERROR_PARSE_ZIP",
                "mensaje": f"Error extrayendo y procesando el CDR de SUNAT: {str(e)}"
            }

    def _parse_cdr_xml(self, xml_content: bytes) -> Dict[str, Any]:
        """
        Explora la estructura XML usando el parser estándar de Python y encuentra los tags de respuesta.
        """
        try:
            # ElementTree permite explorar el root sin importar los namespaces tan drásticos
            root = ET.fromstring(xml_content)
            
            response_code: Optional[str] = None
            description: Optional[str] = None
            
            # Recorrer todos los elementos aplanando los namespaces
            # Los tags de SUNAT usan URIs OASIS (e.g. {urn:oasis:...}ResponseCode)
            for elem in root.iter():
                # Extraer local tag excluyendo URI ({namespace}tag -> tag)
                tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
                if tag_name == 'ResponseCode':
                    response_code = elem.text
                elif tag_name == 'Description':
                    description = elem.text
                    
            if response_code == '0':
                return {
                    "estado": "Aceptado",
                    "codigo": response_code,
                    "mensaje": description or "El Comprobante de Pago ha sido aceptado"
                }
            elif response_code:
                # De acuerdo a catálogos SUNAT, respuestas entre 2000 y 3999 son rechazos.
                # Respuestas entre 4000 y adelante son observaciones, etc.
                if response_code.isdigit() and int(response_code) >= 2000 and int(response_code) <= 3999:
                    estado = "Rechazado"
                else:
                    estado = "Observado"
                    
                return {
                    "estado": estado,
                    "codigo": response_code,
                    "mensaje": description or "Comprobante rechazado u observado por SUNAT."
                }
            else:
                return {
                    "estado": "Excepción",
                    "codigo": "SIN_RESPONSECODE",
                    "mensaje": "No se encontró el nodo 'ResponseCode' en el XML de SUNAT."
                }
                
        except ET.ParseError:
            return {
                "estado": "Excepción",
                "codigo": "XML_INVALIDO",
                "mensaje": "El Constancia de Recepción XML enviada por SUNAT está mal formata o incompleta."
            }
