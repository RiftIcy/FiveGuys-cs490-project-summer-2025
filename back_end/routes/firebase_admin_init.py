import firebase_admin
from firebase_admin import credentials, auth
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))
cred_path = os.getenv("FIREBASE_ADMINSDK_PATH")
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)