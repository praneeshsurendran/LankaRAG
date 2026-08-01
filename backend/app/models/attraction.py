"""
app/models/attraction.py — SQLAlchemy 2.0 ORM model for tourist_attractions.
"""

from typing import Optional
from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


class TouristAttraction(Base):
    """
    Represents a Sri Lankan tourist attraction.

    DDL (PostgreSQL):
        CREATE TABLE tourist_attractions (
            id               SERIAL PRIMARY KEY,
            name             VARCHAR(255) NOT NULL,
            category         VARCHAR(100) NOT NULL,
            district         VARCHAR(100) NOT NULL,
            entrance_fee_usd FLOAT,
            difficulty_level VARCHAR(50),
            description      TEXT NOT NULL,
            image_url        TEXT
        );
    """

    __tablename__ = "tourist_attractions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entrance_fee_usd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    difficulty_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def to_dict(self) -> dict:
        """Serialize to a plain dict for use in Pydantic schemas."""
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "district": self.district,
            "entrance_fee_usd": self.entrance_fee_usd,
            "difficulty_level": self.difficulty_level,
            "description": self.description,
            "image_url": self.image_url,
        }

    def __repr__(self) -> str:
        return f"<TouristAttraction id={self.id} name={self.name!r}>"
