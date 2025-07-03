from flask import Blueprint, jsonify, request
from .auth_utils import require_firebase_auth
from db import completed_resumes_collection
from bson import ObjectId

completed_resumes_bp = Blueprint("completed_resumes", __name__)

@completed_resumes_bp.route("/completed_resumes/<completed_resume_id>", methods=["GET"])
@require_firebase_auth
def get_completed_resume(completed_resume_id):
    """
    Get a specific completed resume by ID.
    """
    try:
        if not ObjectId.is_valid(completed_resume_id):
            return jsonify({"error": "Invalid completed resume ID"}), 400
        
        doc = completed_resumes_collection.find_one({
            "_id": ObjectId(completed_resume_id),
            "user_id": request.user_id
        })
        
        if not doc:
            return jsonify({"error": "Completed resume not found"}), 404
        
        return jsonify({
            "_id": str(doc["_id"]),
            "job_title": doc["job_title"],
            "company": doc["company"],
            "created_at": doc["created_at"].isoformat(),
            "tailored_resume": doc["tailored_resume"],
            "source_resume_ids": doc.get("source_resume_ids", []),
            "source_resume_names": doc.get("source_resume_names", []),
            "job_ad_data": doc["job_ad_data"],
            "status": doc.get("status"),
            "applied_at": doc.get("applied_at").isoformat() if doc.get("applied_at") else None,
            "formatted_pdf_url": doc.get("formatted_pdf_url")
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@completed_resumes_bp.route("/completed_resumes", methods=["GET"])
@require_firebase_auth
def get_all_completed_resumes():
    """
    Get all completed resumes (job applications) for the authenticated user.
    Returns resumes that have been marked as "applied" (user pressed Continue/Quick Format).
    """
    try:
        # Get completed resumes that are marked as applied
        docs = completed_resumes_collection.find({
            "user_id": request.user_id,
            "status": "applied"  # Only show ones marked as applied
        }).sort("applied_at", -1)  # Sort by newest application first
        
        results = []
        for doc in docs:
            results.append({
                "_id": str(doc["_id"]),
                "job_title": doc["job_title"],
                "company": doc["company"],
                "created_at": doc["created_at"].isoformat(),
                "applied_at": doc.get("applied_at", doc["created_at"]).isoformat(),
                "source_resume_ids": doc.get("source_resume_ids", []),
                "source_resume_names": doc.get("source_resume_names", []),
                "formatted_pdf_url": doc.get("formatted_pdf_url"),
                "job_ad_id": doc.get("job_ad_id"),  # Include job_ad_id for applied job tracking
                # Include limited job_ad_data for overview
                "job_ad_data": {
                    "job_title": doc.get("job_ad_data", {}).get("job_title", ""),
                    "company": doc.get("job_ad_data", {}).get("company", "")
                }
            })
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@completed_resumes_bp.route("/completed_resumes/<completed_resume_id>/apply", methods=["POST"])
@require_firebase_auth
def mark_resume_as_applied(completed_resume_id):
    """
    Mark a completed resume as applied (when user clicks Continue/Quick Format).
    """
    try:
        if not ObjectId.is_valid(completed_resume_id):
            return jsonify({"error": "Invalid completed resume ID"}), 400
        
        from datetime import datetime
        
        result = completed_resumes_collection.update_one(
            {
                "_id": ObjectId(completed_resume_id),
                "user_id": request.user_id
            },
            {
                "$set": {
                    "status": "applied",
                    "applied_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Completed resume not found"}), 404
        
        return jsonify({"message": "Resume marked as applied successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
