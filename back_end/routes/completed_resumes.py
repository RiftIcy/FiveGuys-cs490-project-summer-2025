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
        
        tailored_resume = doc.get("tailored_resume", {})
        score = tailored_resume.get("score")
        
        return jsonify({
            "_id": str(doc["_id"]),
            "job_title": doc["job_title"],
            "company": doc["company"],
            "created_at": doc["created_at"].isoformat(),
            "tailored_resume": tailored_resume,
            "score": score,
            "source_resume_ids": doc.get("source_resume_ids", []),
            "source_resume_names": doc.get("source_resume_names", []),
            "job_ad_data": doc["job_ad_data"]
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
