"""
Migration to add blockchain_tx_hash column to contracts table.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import engine


async def migrate():
    """Add blockchain_tx_hash column to contracts table."""
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'contracts' AND column_name = 'blockchain_tx_hash'
        """))
        exists = result.fetchone() is not None

        if not exists:
            print("Adding 'blockchain_tx_hash' column to contracts table...")
            await conn.execute(text("""
                ALTER TABLE contracts
                ADD COLUMN blockchain_tx_hash VARCHAR(66) DEFAULT NULL
            """))
            print("✓ Added 'blockchain_tx_hash' column")
        else:
            print("'blockchain_tx_hash' column already exists")

        print("\nMigration completed!")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(migrate())
