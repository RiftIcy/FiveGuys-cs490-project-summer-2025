from flask import Blueprint, jsonify
from routes.auth_utils import require_firebase_auth

templates_bp = Blueprint("templates", __name__)

# LaTeX template data with enhanced descriptions
LATEX_TEMPLATES = [
    {
        "id": "default_1col",
        "name": "Classic Professional (1 Column)",
        "description": "Clean, traditional single-column layout perfect for corporate positions. Uses standard fonts and conservative styling.",
        "imageUrl": None,
        "isDefault": True,
        "columnLayout": "single",
        "features": ["ATS-Friendly", "Conservative Design", "Standard Fonts"]
    },
    {
        "id": "default_2col",
        "name": "Classic Professional (2 Column)",
        "description": "Clean, traditional two-column layout perfect for corporate positions. Modern moderncv styling with professional appearance.",
        "imageUrl": None,
        "isDefault": False,
        "columnLayout": "double",
        "features": ["ATS-Friendly", "Conservative Design", "Two-Column Layout"]
    },
    {
        "id": "modern_1col", 
        "name": "Modern Professional (1 Column)",
        "description": "Contemporary single-column design with blue accents and modern fonts. Great for tech and startup roles.",
        "imageUrl": None,
        "isDefault": False,
        "columnLayout": "single",
        "features": ["Sans-serif Font", "Color Accents", "Modern Layout"]
    },
    {
        "id": "modern_2col", 
        "name": "Modern Professional (2 Column)",
        "description": "Contemporary two-column design with blue accents and modern fonts. Great for tech and startup roles.",
        "imageUrl": None,
        "isDefault": False,
        "columnLayout": "double",
        "features": ["Sans-serif Font", "Color Accents", "Two-Column Layout"]
    },
    {
        "id": "classic_1col",
        "name": "Executive Classic (1 Column)",
        "description": "Elegant single-column design with serif font and navy accents. Ideal for senior positions and traditional industries.",
        "imageUrl": None,
        "isDefault": False,
        "columnLayout": "single",
        "features": ["Serif Font", "Navy Accents", "Executive Style"]
    },
    {
        "id": "classic_2col",
        "name": "Executive Classic (2 Column)",
        "description": "Elegant two-column design with serif font and navy accents. Ideal for senior positions and traditional industries.",
        "imageUrl": None,
        "isDefault": False,
        "columnLayout": "double",
        "features": ["Serif Font", "Navy Accents", "Two-Column Layout"]
    },
    {
        "id": "creative_1col",
        "name": "Creative Professional (1 Column)",
        "description": "Bold single-column design with vibrant colors and modern typography. Perfect for creative and design roles.",
        "imageUrl": None,
        "isDefault": False,
        "columnLayout": "single",
        "features": ["Bold Colors", "Creative Layout", "Modern Typography"]
    },
    {
        "id": "creative_2col",
        "name": "Creative Professional (2 Column)",
        "description": "Bold two-column design with vibrant colors and modern typography. Perfect for creative and design roles.",
        "imageUrl": None,
        "isDefault": False,
        "columnLayout": "double",
        "features": ["Bold Colors", "Creative Layout", "Two-Column Layout"]
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
