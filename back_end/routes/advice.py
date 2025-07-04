from flask import Blueprint, request, jsonify
from routes.auth_utils import require_firebase_auth
from parser.parser import ResumeAdviceGenerator

advice_bp = Blueprint('advice', __name__)

@advice_bp.route("/generate_advice", methods=["POST"])
@require_firebase_auth
def generate_advice():
    """
    Generate advice for any resume and job ad combination.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON payload"}), 400
        
        resume_data = data.get("resume_data")
        job_ad_data = data.get("job_ad_data")
        score_data = data.get("score_data", {})
        
        if not resume_data or not job_ad_data:
            return jsonify({"error": "Missing resume_data or job_ad_data"}), 400
        
        advice_generator = ResumeAdviceGenerator()
        advice = advice_generator.generate_advice(resume_data, job_ad_data, score_data)
        
        return jsonify({"advice": advice}), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to generate advice: {str(e)}"}), 500
