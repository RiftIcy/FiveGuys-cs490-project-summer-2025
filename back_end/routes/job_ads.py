from flask import Blueprint, jsonify, request
from .auth_utils import require_firebase_auth
from db import job_ads_collection, biography_collection, completed_resumes_collection, resume_generation_jobs_collection
from bson import ObjectId
from parser.parser import JobAdParser, ResumeTailoringParser, ResumeScorer
from datetime import datetime
import threading
import time
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job_scraper import JobAdScraper

job_ads_bp = Blueprint("job_ads", __name__)

@job_ads_bp.route("/upload_job_ad", methods=["POST"])
@require_firebase_auth
def upload_job_ad():
    job_ad_text = request.form.get("job_ad")
    job_ad_url = request.form.get("job_ad_url")

    # Handle URL-based job ad
    if job_ad_url and job_ad_url.strip():
        return handle_job_ad_url(job_ad_url.strip())
    
    # Handle text-based job ad (existing functionality)
    if not job_ad_text or not job_ad_text.strip():
        return jsonify({"error": "No job ad text or URL provided"}), 400

    clean_text = job_ad_text.strip()

    # Store the original job ad first
    try:
        doc = {
            "job_ad_text": clean_text,
            "uploaded_at": datetime.utcnow(),
            "user_id": request.user_id,  # Firebase user ID
        }
        result = job_ads_collection.insert_one(doc)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    # Parse with LLM
    parser = JobAdParser()
    try:
        parse_result = parser.parse(clean_text)
    except Exception as e:
        return jsonify({"error": f"LLM parsing failed: {str(e)}"}), 500

    # Save parse result into document
    job_ads_collection.update_one(
        {"_id": result.inserted_id},
        {"$set": {"parse_result": parse_result}}
    )

    # Return result
    return jsonify({
        "message": "Job ad uploaded and parsed successfully",
        "id": str(result.inserted_id),
        "parse_result": parse_result
    }), 200

def handle_job_ad_url(url: str):
    """Handle job ad URL scraping and parsing"""
    try:
        # Initialize scraper
        scraper = JobAdScraper()
        
        # Scrape the URL
        scrape_result = scraper.scrape_job_ad(url)
        
        if not scrape_result["success"]:
            return jsonify({"error": f"Failed to scrape URL: {scrape_result['error']}"}), 400
        
        scraped_content = scrape_result["content"]
        if not scraped_content or len(scraped_content.strip()) < 100:
            return jsonify({"error": "Insufficient content found at the provided URL"}), 400
        
        # Store the job ad with URL metadata
        try:
            doc = {
                "job_ad_text": scraped_content,
                "job_ad_url": url,
                "scraped_title": scrape_result.get("title"),
                "uploaded_at": datetime.utcnow(),
                "user_id": request.user_id,
            }
            result = job_ads_collection.insert_one(doc)
        except Exception as e:
            return jsonify({"error": f"Database error: {str(e)}"}), 500

        # Parse with LLM
        parser = JobAdParser()
        try:
            parse_result = parser.parse(scraped_content)
        except Exception as e:
            return jsonify({"error": f"LLM parsing failed: {str(e)}"}), 500

        # Save parse result into document
        job_ads_collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"parse_result": parse_result}}
        )

        # Return result
        return jsonify({
            "message": "Job ad URL scraped and parsed successfully",
            "id": str(result.inserted_id),
            "parse_result": parse_result,
            "scraped_from": url,
            "scraped_title": scrape_result.get("title")
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"URL processing failed: {str(e)}"}), 500

@job_ads_bp.route("/job_ads/<id>", methods=["GET"])
@require_firebase_auth
def get_job_ad(id):
    try:
        doc = job_ads_collection.find_one({
            "_id": ObjectId(id),
            "user_id": request.user_id  # Only return user's own job ads
        })
    except Exception as e:
        return jsonify({"error": f"Invalid ID format: {str(e)}"}), 400
    
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    
    parse_result = doc.get("parse_result")
    if not parse_result:
        return jsonify({"error": "No parse result found for this document"}), 404
    
    return jsonify({
        "id": str(doc["_id"]),
        "job_ad_text":   doc["job_ad_text"],
        "uploaded_at":   doc["uploaded_at"].isoformat(),
        "parse_result": parse_result,
        "job_ad_url": doc.get("job_ad_url"),
        "scraped_title": doc.get("scraped_title")
    }), 200

@job_ads_bp.route("/job_ads", methods=["GET"])
@require_firebase_auth
def list_job_ads():
    try:
        cursor = job_ads_collection.find({"user_id": request.user_id}).sort("uploaded_at", -1)
        out = []
        for doc in cursor:
            job_data = {
                "_id": str(doc["_id"]),
                "job_ad_text": doc["job_ad_text"],
                "uploaded_at": doc["uploaded_at"].isoformat(),
                "parse_result": doc.get("parse_result", {}),
            }
            
            # Add URL-related fields if they exist
            if doc.get("job_ad_url"):
                job_data["job_ad_url"] = doc["job_ad_url"]
            if doc.get("scraped_title"):
                job_data["scraped_title"] = doc["scraped_title"]
                
            out.append(job_data)
        return jsonify(out), 200

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    
@job_ads_bp.route("/job_ads/<id>", methods=["DELETE"])
@require_firebase_auth
def delete_job_ad(id):
    # validate ObjectId
    try:
        oid = ObjectId(id)
    except Exception as e:
        return jsonify({"error": f"Invalid ID format: {str(e)}"}), 400

    result = job_ads_collection.delete_one({
        "_id": oid,
        "user_id": request.user_id  # Only delete user's own job ads
    })
    if result.deleted_count == 0:
        return jsonify({"error": "Job ad not found"}), 404

    return jsonify({"message": "Job ad deleted"}), 200


def process_resume_generation_background(job_id, user_id, job_ad_id, resume_ids):
    """
    Background function to process resume generation.
    This simulates a longer-running process.
    """
    try:
        # Update status to processing
        resume_generation_jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "processing", "progress": 10}}
        )
        
        # Simulate some processing time
        time.sleep(2)
        
        # Fetch the job ad
        job_ad_doc = job_ads_collection.find_one({
            "_id": ObjectId(job_ad_id),
            "user_id": user_id
        })
        if not job_ad_doc:
            resume_generation_jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {"status": "failed", "error": "Job ad not found"}}
            )
            return
        
        job_ad_data = job_ad_doc.get("parse_result")
        if not job_ad_data:
            resume_generation_jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {"status": "failed", "error": "Job ad has no parsed data"}}
            )
            return
        
        # Update progress
        resume_generation_jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"progress": 30}}
        )
        
        # Fetch the selected resumes
        resume_docs = list(biography_collection.find({
            "_id": {"$in": [ObjectId(rid) for rid in resume_ids]},
            "user_id": user_id,
            "isComplete": True
        }))
        
        if len(resume_docs) != len(resume_ids):
            resume_generation_jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {"status": "failed", "error": "Some resumes not found or not completed"}}
            )
            return
        
        # Update progress
        resume_generation_jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"progress": 50}}
        )
        
        # Simulate processing time for combining resumes
        time.sleep(1)
        
        # Step 1: Combine all resume data into one master resume
        combined_resume_data = {
            "first_name": None,
            "last_name": None,
            "contact": {"emails": [], "phones": []},
            "career_objective": None,
            "skills": {},
            "jobs": [],
            "education": []
        }
        
        source_resume_names = []
        
        # Step 2: Merge data from all selected resumes
        for resume_doc in resume_docs:
            resume_data = resume_doc.get("parse_result")
            if not resume_data:
                continue
            
            source_resume_names.append(resume_doc.get("name", "Untitled"))
            
            # Merge contact info (keep first non-null values)
            if not combined_resume_data["first_name"] and resume_data.get("first_name"):
                combined_resume_data["first_name"] = resume_data.get("first_name")
            if not combined_resume_data["last_name"] and resume_data.get("last_name"):
                combined_resume_data["last_name"] = resume_data.get("last_name")
            
            # Merge emails and phones (combine lists)
            contact = resume_data.get("contact", {})
            if contact.get("emails"):
                combined_resume_data["contact"]["emails"].extend(contact["emails"])
            if contact.get("phones"):
                combined_resume_data["contact"]["phones"].extend(contact["phones"])
            
            # Keep the first career objective found
            if not combined_resume_data["career_objective"] and resume_data.get("career_objective"):
                combined_resume_data["career_objective"] = resume_data.get("career_objective")
            
            # Merge skills (combine all skill categories)
            skills = resume_data.get("skills", {})
            for category, skill_list in skills.items():
                if category in combined_resume_data["skills"]:
                    combined_resume_data["skills"][category].extend(skill_list)
                else:
                    combined_resume_data["skills"][category] = skill_list[:]
            
            # Combine all jobs
            jobs = resume_data.get("jobs", [])
            combined_resume_data["jobs"].extend(jobs)
            
            # Combine all education
            education = resume_data.get("education", [])
            combined_resume_data["education"].extend(education)
        
        # Remove duplicates from emails and phones
        combined_resume_data["contact"]["emails"] = list(set(combined_resume_data["contact"]["emails"]))
        combined_resume_data["contact"]["phones"] = list(set(combined_resume_data["contact"]["phones"]))
        
        # Remove duplicate skills within each category
        for category in combined_resume_data["skills"]:
            combined_resume_data["skills"][category] = list(set(combined_resume_data["skills"][category]))
        
        # Update progress
        resume_generation_jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"progress": 70}}
        )
        
        # Simulate AI processing time
        time.sleep(2)
        
        # Step 3: Tailor the COMBINED resume against the job ad
        tailoring_parser = ResumeTailoringParser()
        scorer = ResumeScorer()
        
        try:
            # Tailor the resume (no scoring in this step)
            tailored_resume_data = tailoring_parser.tailor_resume(combined_resume_data, job_ad_data)
            
            # Generate score separately
            score_data = scorer.score_resume(combined_resume_data, job_ad_data)
            
            # Add score to tailored resume for backward compatibility
            tailored_resume_data["score"] = str(score_data["overall_score"])
            
        except Exception as e:
            resume_generation_jobs_collection.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {"status": "failed", "error": f"Failed to tailor combined resume: {str(e)}"}}
            )
            return
        
        # Update progress
        resume_generation_jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"progress": 90}}
        )
        
        # Step 4: Store as ONE tailored resume
        completed_resume_doc = {
            "user_id": user_id,
            "job_ad_id": job_ad_id,
            "job_title": job_ad_data.get("job_title"),
            "company": job_ad_data.get("company"),
            "created_at": datetime.utcnow(),
            "tailored_resume": tailored_resume_data,
            "score_data": score_data,  # Store detailed score data
            "source_resume_ids": resume_ids,
            "source_resume_names": source_resume_names,
            "job_ad_data": job_ad_data
        }
        
        # Insert the completed resume into the database
        result = completed_resumes_collection.insert_one(completed_resume_doc)
        
        # Update job status to completed
        resume_generation_jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {
                "status": "completed",
                "progress": 100,
                "completed_resume_id": str(result.inserted_id),
                "completed_at": datetime.utcnow()
            }}
        )
        
    except Exception as e:
        resume_generation_jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "failed", "error": f"Server error: {str(e)}"}}
        )

@job_ads_bp.route("/job_ads/<job_ad_id>/create_tailored_resume", methods=["POST"])
@require_firebase_auth
def create_tailored_resume(job_ad_id):
    """
    Start asynchronous resume generation and return job ID for status tracking.
    """
    try:
        # Validate job ad ID
        if not ObjectId.is_valid(job_ad_id):
            return jsonify({"error": "Invalid job ad ID"}), 400
        
        # Get request data
        data = request.get_json()
        if not data or "resume_ids" not in data:
            return jsonify({"error": "Missing 'resume_ids' in request body"}), 400
        
        resume_ids = data["resume_ids"]
        if not isinstance(resume_ids, list) or len(resume_ids) == 0:
            return jsonify({"error": "resume_ids must be a non-empty list"}), 400
        
        # Validate all resume IDs
        for resume_id in resume_ids:
            if not ObjectId.is_valid(resume_id):
                return jsonify({"error": f"Invalid resume ID: {resume_id}"}), 400
        
        # Create a job record for tracking
        job_doc = {
            "user_id": request.user_id,
            "job_ad_id": job_ad_id,
            "resume_ids": resume_ids,
            "status": "pending",  # pending, processing, completed, failed
            "progress": 0,
            "created_at": datetime.utcnow()
        }
        
        job_result = resume_generation_jobs_collection.insert_one(job_doc)
        job_id = str(job_result.inserted_id)
        
        # Start background processing
        thread = threading.Thread(
            target=process_resume_generation_background,
            args=(job_id, request.user_id, job_ad_id, resume_ids)
        )
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "message": "Resume generation started",
            "job_id": job_id
        }), 202  # 202 Accepted for async processing
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@job_ads_bp.route("/resume_generation_jobs/<job_id>", methods=["GET"])
@require_firebase_auth
def get_generation_status(job_id):
    """
    Get the status of a resume generation job.
    """
    try:
        if not ObjectId.is_valid(job_id):
            return jsonify({"error": "Invalid job ID"}), 400
        
        job = resume_generation_jobs_collection.find_one({
            "_id": ObjectId(job_id),
            "user_id": request.user_id
        })
        
        if not job:
            return jsonify({"error": "Job not found"}), 404
        
        response_data = {
            "job_id": job_id,
            "status": job["status"],
            "progress": job.get("progress", 0),
            "created_at": job["created_at"].isoformat(),
        }
        
        # Add completed resume ID if available
        if job.get("completed_resume_id"):
            response_data["completed_resume_id"] = job["completed_resume_id"]
            response_data["completed_at"] = job.get("completed_at", datetime.utcnow()).isoformat()
        
        # Add error if failed
        if job.get("error"):
            response_data["error"] = job["error"]
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@job_ads_bp.route("/resume_generation_jobs", methods=["GET"])
@require_firebase_auth
def list_generation_jobs():
    """
    List all resume generation jobs for the current user.
    """
    try:
        jobs = list(resume_generation_jobs_collection.find({
            "user_id": request.user_id
        }).sort("created_at", -1).limit(50))  # Most recent 50 jobs
        
        jobs_data = []
        for job in jobs:
            job_data = {
                "job_id": str(job["_id"]),
                "job_ad_id": job["job_ad_id"],
                "status": job["status"],
                "progress": job.get("progress", 0),
                "created_at": job["created_at"].isoformat(),
            }
            
            if job.get("completed_resume_id"):
                job_data["completed_resume_id"] = job["completed_resume_id"]
                job_data["completed_at"] = job.get("completed_at", datetime.utcnow()).isoformat()
            
            if job.get("error"):
                job_data["error"] = job["error"]
                
            jobs_data.append(job_data)
        
        return jsonify(jobs_data), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500