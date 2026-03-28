from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class ClientOut(BaseModel):
    id: str
    ruc: str
    name: str
    contact: str
    email: str
    status: str

dummy_clients = [
    { "id": 'C001', "ruc": '20123456789', "name": 'Constructora Atlas S.A.C.', "contact": 'Juan Pérez', "email": 'contacto@atlas.pe', "status": 'Activo' },
    { "id": 'C002', "ruc": '10765432101', "name": 'Logística Global S.A.', "contact": 'María López', "email": 'm.lopez@global.com', "status": 'Activo' },
    { "id": 'C003', "ruc": '20987654321', "name": 'Inversiones del Norte', "contact": 'Carlos Ruiz', "email": 'admin@idnorte.com', "status": 'Inactivo' },
]

@router.get("/", response_model=List[ClientOut])
def get_clients():
    """
    Obtener lista mock de clientes.
    """
    return dummy_clients
