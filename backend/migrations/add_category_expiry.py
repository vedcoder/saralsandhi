"""
Migration script to add category and expiry_date columns to contracts table.
Run this script once to add the new columns.

Usage:
    python migrations/add_category_expiry.py
"""
import asyncio
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from core.database import engine


async def migrate():
    """Add category and expiry_date columns to contracts table."""
    async with engine.begin() as conn:
        # Check if category column exists
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'contracts' AND column_name = 'category'
        """))
        category_exists = result.fetchone() is not None

        # Check if expiry_date column exists
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'contracts' AND column_name = 'expiry_date'
        """))
        expiry_exists = result.fetchone() is not None

        if not category_exists:
            print("Adding 'category' column to contracts table...")
            # Create the enum type first if it doesn't exist
            await conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE contractcategory AS ENUM (
                        'employment', 'rental', 'nda', 'service',
                        'sales', 'partnership', 'loan', 'insurance', 'other'
                    );
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            await conn.execute(text("""
                ALTER TABLE contracts
                ADD COLUMN category contractcategory DEFAULT NULL
            """))
            print("✓ Added 'category' column")
        else:
            print("'category' column already exists")

        if not expiry_exists:
            print("Adding 'expiry_date' column to contracts table...")
            await conn.execute(text("""
                ALTER TABLE contracts
                ADD COLUMN expiry_date TIMESTAMP DEFAULT NULL
            """))
            print("✓ Added 'expiry_date' column")
        else:
            print("'expiry_date' column already exists")

        print("\nMigration completed successfully!")


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(migrate())
