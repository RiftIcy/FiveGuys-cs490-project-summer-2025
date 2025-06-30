from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI, tz_aware=True)
db = client['fiveguys']
biography_collection = db['biographies']
job_ads_collection = db['job ads']
completed_resumes_collection = db['completed_resumes']
resume_generation_jobs_collection = db['resume_generation_jobs']