from flask import Blueprint, jsonify
from routes.auth_utils import require_firebase_auth

templates_bp = Blueprint("templates", __name__)

# LaTeX template data with enhanced descriptions
LATEX_TEMPLATES = [
    {
        "id": "default",
        "name": "Classic Professional",
        "description": "Clean, traditional layout perfect for corporate positions. Uses standard fonts and conservative styling.",
        "imageUrl": None,
        "isDefault": True,
        "features": ["ATS-Friendly", "Conservative Design", "Standard Fonts"]
    },
    {
        "id": "modern", 
        "name": "Modern Professional",
        "description": "Contemporary design with blue accents and Roboto font. Great for tech and startup roles.",
        "imageUrl": None,
        "isDefault": False,
        "features": ["Sans-serif Font", "Color Accents", "Modern Layout"]
    },
    {
        "id": "classic",
        "name": "Executive Classic",
        "description": "Elegant serif font with navy accents. Ideal for senior positions and traditional industries.",
        "imageUrl": None,
        "isDefault": False,
        "features": ["Serif Font", "Navy Accents", "Executive Style"]
    },
    {
        "id": "creative",
        "name": "Creative Professional",
        "description": "Bold design with vibrant colors and modern typography. Perfect for creative and design roles.",
        "imageUrl": None,
        "isDefault": False,
        "features": ["Bold Colors", "Creative Layout", "Modern Typography"]
    }
]

@templates_bp.route("/api/templates", methods=["GET"])
@require_firebase_auth
def get_templates():
    """
    Fetch available LaTeX resume templates.
    TP004: Fetch templates via GET /api/templates
    """
    try:
        return jsonify({
            "templates": LATEX_TEMPLATES,
            "message": "LaTeX templates fetched successfully",
            "engine": "LaTeX"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch templates: {str(e)}"}), 500
