from functools import wraps
from flask import request, jsonify
from firebase_admin import auth

def require_firebase_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        id_token = request.headers.get("Authorization")
        if not id_token:
            return jsonify({"error": "Missing Authorization header"}), 401
        if id_token.startswith("Bearer "):
            id_token = id_token.split(" ", 1)[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
            request.user_id = decoded_token["uid"]
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated