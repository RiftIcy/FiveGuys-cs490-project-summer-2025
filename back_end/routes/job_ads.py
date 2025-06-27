from flask import Blueprint, jsonify, request
from .auth_utils import require_firebase_auth
from db import job_ads_collection, biography_collection, completed_resumes_collection
from bson import ObjectId
from parser.parser import JobAdParser, ResumeTailoringParser
from datetime import datetime

job_ads_bp = Blueprint("job_ads", __name__)

@job_ads_bp.route("/upload_job_ad", methods=["POST"])
@require_firebase_auth
def upload_job_ad():
    job_ad_text = request.form.get("job_ad")

    if not job_ad_text or not job_ad_text.strip():
        return jsonify({"error": "No job ad text provided"}), 400

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
        "parse_result": parse_result
    }), 200

@job_ads_bp.route("/job_ads", methods=["GET"])
@require_firebase_auth
def list_job_ads():
    try:
        cursor = job_ads_collection.find({"user_id": request.user_id}).sort("uploaded_at", -1)
        out = []
        for doc in cursor:
            out.append({
                "_id": str(doc["_id"]),
                "job_ad_text": doc["job_ad_text"],
                "uploaded_at": doc["uploaded_at"].isoformat(),
                "parse_result": doc.get("parse_result", {}),
            })
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


@job_ads_bp.route("/job_ads/<job_ad_id>/create_tailored_resume", methods=["POST"])
@require_firebase_auth
def create_tailored_resume(job_ad_id):
    """
    Create ONE tailored resume by combining all selected completed resumes.
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
        
        # Fetch the job ad
        job_ad_doc = job_ads_collection.find_one({
            "_id": ObjectId(job_ad_id),
            "user_id": request.user_id
        })
        if not job_ad_doc:
            return jsonify({"error": "Job ad not found"}), 404
        
        job_ad_data = job_ad_doc.get("parse_result")
        if not job_ad_data:
            return jsonify({"error": "Job ad has no parsed data"}), 400
        
        # Fetch the selected resumes
        resume_docs = list(biography_collection.find({
            "_id": {"$in": [ObjectId(rid) for rid in resume_ids]},
            "user_id": request.user_id,
            "isComplete": True  # Only allow completed resumes
        }))
        
        if len(resume_docs) != len(resume_ids):
            return jsonify({"error": "Some resumes not found or not completed"}), 404
        
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
        
        # Step 3: Tailor the COMBINED resume against the job ad
        tailoring_parser = ResumeTailoringParser()
        
        try:
            tailored_resume_data = tailoring_parser.tailor_resume(combined_resume_data, job_ad_data)
        except Exception as e:
            return jsonify({"error": f"Failed to tailor combined resume: {str(e)}"}), 500
        
        # Step 4: Store as ONE tailored resume
        completed_resume_doc = {
            "user_id": request.user_id,
            "job_ad_id": job_ad_id,
            "job_title": job_ad_data.get("job_title"),
            "company": job_ad_data.get("company"),
            "created_at": datetime.utcnow(),
            "tailored_resume": tailored_resume_data,  # Single resume object
            "source_resume_ids": resume_ids,  # Track which resumes were combined
            "source_resume_names": source_resume_names,  # Track source names
            "job_ad_data": job_ad_data
        }
        
        # Insert the completed resume into the database
        result = completed_resumes_collection.insert_one(completed_resume_doc)
        
        return jsonify({
            "message": f"Successfully created tailored resume for {job_ad_data.get('job_title')} combining {len(source_resume_names)} resumes",
            "completed_resume_id": str(result.inserted_id),
            "source_count": len(source_resume_names),
            "source_names": source_resume_names
        }), 200
    
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500