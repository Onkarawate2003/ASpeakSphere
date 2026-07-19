import os
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models.users import User
from app.models.user_preferences import UserPreferences
from app.models.conversations import Conversation
from app.models.messages import ConversationMessage
from app.models.progress import UserProgress, XpAward

def recreate():
    print("Dropping existing tables in database...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables recreated successfully!")

if __name__ == "__main__":
    recreate()
