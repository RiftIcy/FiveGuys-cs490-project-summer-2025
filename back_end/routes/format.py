from flask import Blueprint, request, jsonify
from routes.auth_utils import require_firebase_auth
from latex_compiler import LaTeXCompiler
import base64

format_bp = Blueprint("format", __name__)

@format_bp.route("/format_resume", methods=["POST"])
@require_firebase_auth
def format_resume():
    """
    Format resume data into a PDF using LaTeX templates and return download URL.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON payload"}), 400
        
        resume_data = data.get("resume_data")
        completed_resume_id = data.get("completed_resume_id")
        job_title = data.get("job_title", "Resume")
        template_id = data.get("template_id", "default")
        
        if not resume_data:
            return jsonify({"error": "Missing resume_data"}), 400
        
        # Initialize LaTeX compiler
        latex_compiler = LaTeXCompiler()
        
        # Generate PDF using LaTeX
        pdf_bytes = latex_compiler.generate_resume_pdf(resume_data, template_id)
        
        if not pdf_bytes:
            return jsonify({"error": "Failed to generate PDF"}), 500
        
        # Return PDF as base64 data URL for immediate download
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        download_url = f"data:application/pdf;base64,{pdf_base64}"
        
        # Create filename from job title and candidate name
        candidate_name = f"{resume_data.get('first_name', '')} {resume_data.get('last_name', '')}".strip()
        if candidate_name:
            safe_name = candidate_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
            filename = f"{safe_name}_{template_id}_resume.pdf"
        else:
            safe_job_title = job_title.replace(' ', '_').replace('/', '_').replace('\\', '_')
            filename = f"{safe_job_title}_{template_id}_resume.pdf"
        
        return jsonify({
            "message": "Resume formatted successfully",
            "downloadUrl": download_url,
            "filename": filename,
            "template_used": template_id
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to format resume: {str(e)}"}), 500