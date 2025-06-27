from flask import Blueprint, jsonify, request
from .auth_utils import require_firebase_auth
from db import job_ads_collection
from bson import ObjectId
from parser.parser import JobAdParser
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
