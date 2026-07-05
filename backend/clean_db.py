from app.core.database import SessionLocal
from sqlalchemy import text

def clean_forms():
    db = SessionLocal()
    try:
        # Usuwamy dane z tabel forms i form_items
        print("Czyszczenie tabeli forms i form_items...")
        db.execute(text("TRUNCATE TABLE form_items, forms RESTART IDENTITY CASCADE;"))
        db.commit()
        print("Gotowe! Dane formularzy zostały usunięte.")
    except Exception as e:
        print(f"Błąd: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    clean_forms()