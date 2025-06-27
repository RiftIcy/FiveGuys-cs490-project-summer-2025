from flask import Blueprint, jsonify, request
from db import biography_collection
from bson import ObjectId
from datetime import datetime
import tempfile, os
from parser.extractors import extract_text
from .auth_utils import require_firebase_auth
from .firebase_admin_init import auth
import base64

# Define the Blueprint
upload_bp = Blueprint("upload", __name__)

# Max File Size
MAX_FILE_SIZE = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md", "odt"}
PREVIEW_LEN = 80 # Number of characters shown in the preview

# Utility Function
def make_snippet(text: str, max_len: int = PREVIEW_LEN) -> str:
    cleaned = " ".join(text.strip().split())
    return cleaned if len(cleaned) <= max_len else cleaned[:max_len] + "…"


# POST /upload  ─ add new entry
@upload_bp.route("/upload", methods=["POST"])
@require_firebase_auth
def upload():
    file = request.files.get("file")
    biography_text = request.form.get("biography")

    if not file and not biography_text:
        return jsonify({"error": "Must provide a file or biography text"}), 400

    doc = {
        "uploadedAt": datetime.utcnow(),
        "isComplete": False,
        "user_id": request.user_id,  # Firebase user ID
    }

    # --------  A) File upload  ----------------------------------
    if file:
        filename  = file.filename
        extension = filename.rsplit(".", 1)[-1].lower()

        if extension not in ALLOWED_EXTENSIONS:
            return jsonify({"error": "Unsupported file type"}), 400

        file.seek(0, 2)
        if file.tell() > MAX_FILE_SIZE:
            return jsonify({"error": "File too large (max 15MB)"}), 400
        file.seek(0)

        content = file.read()
        if not content:
            return jsonify({"error": "Uploaded file is empty"}), 400

        doc.update({
            "filename": filename,
            "file_type": extension,
            "file_content": content,
        })

        # Generate preview snippet from file
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{extension}") as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            extracted_text = extract_text(tmp_path) or ""
            doc["snippet"] = make_snippet(extracted_text)
        except Exception:
            doc["snippet"] = None          # extraction failed / binary PDF
        finally:
            if 'tmp_path' in locals():
                os.remove(tmp_path)

    # --------  B) Pure-text upload  ------------------------------
    if biography_text:
        cleaned = biography_text.strip()
        doc["biography_text"] = cleaned
        doc["snippet"] = make_snippet(cleaned)

        # If no file, create a user-friendly name from first words
        if not file:
            doc["filename"] = doc["snippet"]

    # --------  Insert into Mongo  -------------------------------
    try:
        result = biography_collection.insert_one(doc)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    return jsonify({"message": "Upload successful.", "id": str(result.inserted_id)}), 200


@upload_bp.route("/resume/<id>", methods=["GET"])
@require_firebase_auth
def get_data(id):
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({"error": "Invalid ID format"}), 400

    doc = biography_collection.find_one({
        "_id": oid, 
        "user_id": request.user_id
    })
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    
    parse_result = doc.get("parse_result")
    if not parse_result:
        return jsonify({"error": "No parse result found for this document"}), 404
    
    return jsonify({
        "id": str(doc["_id"]),
        "parse_result": parse_result
    }), 200


# ───────────────────────────────
# GET /uploads  – list all entries
# ───────────────────────────────
@upload_bp.route("/uploads", methods=["GET"])
@require_firebase_auth
def list_uploads():
    cursor = biography_collection.find(
        {"createdFrom": {"$exists": False}, "user_id": request.user_id},
        {
            "filename": 1,
            "biography_text": 1,   # kept for hasText flag
            "snippet": 1,
            "uploadedAt": 1,
        }
    ).sort("uploadedAt", -1)

    out = []
    for doc in cursor:
        ts = doc.get("uploadedAt") or datetime.utcnow()
        out.append({
            "id": str(doc["_id"]),
            "filename": doc.get("filename"),
            "hasText": bool(doc.get("biography_text")),
            "snippet": doc.get("snippet"),
            "uploadedAt": ts.isoformat(),
        })
    return jsonify(out), 200

# ───────────────────────────────
# GET /uploads/<id>/content – get single upload with file content
# ───────────────────────────────
@upload_bp.route("/uploads/<id>/content", methods=["GET"])
@require_firebase_auth
def get_upload(id):
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({"error": "Invalid ID format"}), 400

    doc = biography_collection.find_one({
        "_id": oid,
        "user_id": request.user_id  # Only allow user's own uploads
    })

    if not doc:
        return jsonify({"error": "Document not found"}), 404
    

    # Convert bytes to base64 for JSON serialization
    file_content = doc.get("file_content")
    if file_content and isinstance(file_content, bytes):
        file_content = base64.b64encode(file_content).decode('utf-8')

    # Return the full document (including file_content for preview)
    result = {
        "_id": str(doc["_id"]),
        "filename": doc.get("filename"),
        "file_content": file_content,
        "file_type": doc.get("file_type"),
        "biography_text": doc.get("biography_text"),
        "snippet": doc.get("snippet"),
        "uploadedAt": doc.get("uploadedAt", datetime.utcnow()).isoformat(),
    }
    
    return jsonify(result), 200

# ───────────────────────────────
# DELETE /uploads/<id>  – remove
# ───────────────────────────────
@upload_bp.route("/uploads/<id>", methods=["DELETE"])
@require_firebase_auth
def delete_upload(id):
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    result = biography_collection.delete_one({
        "_id": oid,
        "user_id": request.user_id # Only allow deleting your own uploads
    })

    if result.deleted_count == 0:
        return jsonify({"error": "Upload not found"}), 404

    return jsonify({"message": "Upload deleted"}), 200

# ─────────────────────────────────────────
# POST /generate_resume  – Create Form Data
# ─────────────────────────────────────────
@upload_bp.route("/generate_resume", methods=["POST"])
@require_firebase_auth
def generate_resume():
    data = request.get_json(silent=True) or {}

    ids  = data.get("ids", [])
    name = (data.get("name") or "").strip()
    if not ids or not name:
        return jsonify({"error": "ids and name are required"}), 400

    # 1) Load every selected upload
    sources = []
    for _id in ids:
        try:
            doc = biography_collection.find_one({
                "_id": ObjectId(_id),
                "user_id": request.user_id  # Only allow user's own uploads
        })
        except Exception:
            return jsonify({"error": f"Invalid upload id: {_id}"}), 400
        if not doc:
            return jsonify({"error": f"Upload not found or not authorized: {_id}"}), 404
        sources.append(doc)

    # 2) Concatenate text for LLM
    full_text_parts = []
    for s in sources:
        if s.get("biography_text"): # raw text upload
            full_text_parts.append(s["biography_text"])
        elif s.get("file_content") and s.get("file_type"):  # run extractor
            suffix = f".{s['file_type']}"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(s["file_content"])
                tmp_path = tmp.name
            try:
                text = extract_text(tmp_path)
                full_text_parts.append(text)
            finally:
                os.remove(tmp_path)

    full_text = "\n\n".join(full_text_parts)

    # 3) Call your ResumeParser (same as earlier flow)
    from parser.parser import ResumeParser
    parser = ResumeParser()
    try:
        parse_result = parser.parse(full_text)
    except Exception as e:
        return jsonify({"error": f'\"LLM parsing failed: {e}\"'}), 500

    # 4) Store new resume entry
    new_doc = {
        "name": name,
        "createdFrom": ids,
        "uploadedAt": datetime.utcnow(),
        "parse_result": parse_result,
        "isComplete": False,
        "user_id": request.user_id,  # Associate with Firebase user
    }
    new_id = biography_collection.insert_one(new_doc).inserted_id

    return jsonify({"resume_id": str(new_id)}), 200

