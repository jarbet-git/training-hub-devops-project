from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User
from app.services.notification_emails import send_weekly_mandatory_digest_if_due


def main() -> None:
    db: Session = SessionLocal()
    try:
        users = list(
            db.scalars(
                select(User)
                .where(User.is_active.is_(True), User.is_pending_activation.is_(False), User.email_notifications_weekly_mandatory_digest.is_(True))
                .order_by(User.id.asc())
            ).all()
        )
        sent = 0
        skipped = 0
        failed = 0
        for user in users:
            result = send_weekly_mandatory_digest_if_due(db=db, user=user)
            if result is None:
                skipped += 1
                continue
            if result.success:
                sent += 1
            else:
                failed += 1
        print(f"weekly_mail_notifications: sent={sent} skipped={skipped} failed={failed}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
