import sqlite3
import os

db_path = "attendance_mvp.db"

if os.path.exists(db_path):
    print(f"Adding profile_picture column to {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists to avoid errors
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'profile_picture' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN profile_picture TEXT")
            conn.commit()
            print("Successfully added profile_picture column.")
        else:
            print("Column profile_picture already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Error migrating database: {e}")
else:
    print(f"Database file {db_path} not found. It will be created on next startup.")
