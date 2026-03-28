import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Ejemplo de URL en el .env:
# DATABASE_URL=postgresql+psycopg2://usuario:password@localhost:5432/facturacion_db

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sunat_db.sqlite"
)

# Corrección de dialecto para Supabase/Render (PostgreSQL)
if DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://") and not "psycopg2" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)


# SQLite Configuration (converts automatically to PostgreSQL when DATABASE_URL changes)
is_sqlite = DATABASE_URL.startswith("sqlite")
engine_kwargs = {
    "echo": False,
}

if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Postgres Connection pool optimizations
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
