from flask import Blueprint, jsonify
from routes.auth_utils import require_firebase_auth

templates_bp = Blueprint("templates", __name__)

# Sample template data - in a real application, this would come from a database
TEMPLATES = [
    {
        "id": "default",
        "name": "Default Template",
        "description": "Clean and professional resume format with standard layout",
        "imageUrl": None,
        "isDefault": True
    },
    {
        "id": "modern",
        "name": "Modern Professional",
        "description": "Contemporary design with subtle colors and clean typography",
        "imageUrl": None,
        "isDefault": False
    },
    {
        "id": "classic",
        "name": "Classic Executive",
        "description": "Traditional format ideal for corporate and executive positions",
        "imageUrl": None,
        "isDefault": False
    },
    {
        "id": "creative",
        "name": "Creative Design",
        "description": "Eye-catching layout perfect for creative and design roles",
        "imageUrl": None,
        "isDefault": False
    }
]

@templates_bp.route("/api/templates", methods=["GET"])
@require_firebase_auth
def get_templates():
    """
    Fetch available resume templates.
    TP004: Fetch templates via GET /api/templates
    """
    try:
        return jsonify({
            "templates": TEMPLATES,
            "message": "Templates fetched successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch templates: {str(e)}"}), 500
