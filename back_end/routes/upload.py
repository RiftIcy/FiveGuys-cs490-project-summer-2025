from flask import Blueprint, jsonify, request
from db import biography_collection
from bson import ObjectId
from parser.extractors import extract_text
from parser.parser import ResumeParser
import tempfile
import os

# Max File Size
MAX_FILE_SIZE = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md", "odt"}

# Define the Blueprint
upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/upload", methods=["POST"])
def upload():
    # 1) Read & validate the “name” field:
    name = request.form.get("name", "").strip()
    if not name:
        return jsonify({"error": "Resume name is required"}), 400
    
    # 2) Get the rest of your inputs
    file = request.files.get("file")
    biography_text = request.form.get("biography")

    if not file and not biography_text:
        return jsonify({"error": "No file or biography text provided"}), 400

    # 3) Build up your document, starting with the name
    doc = {"name": name}

    # If file submitted
    if file:
        filename = file.filename
        extension = filename.rsplit(".", 1)[-1].lower()

        if extension not in ALLOWED_EXTENSIONS:
            return jsonify({"error": "Unsupported file type"}), 400

        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return jsonify({"error": "File too large (max 15MB)"}), 400

        file_content = file.read()

        if not file_content:
            return jsonify({"error": "Uploaded file is empty"}), 400

        doc["filename"] = filename
        doc["file_type"] = extension
        doc["file_content"] = file_content

    # If biography text submitted
    if biography_text:
        doc["biography_text"] = biography_text.strip()

    # Store data first
    try:
        result = biography_collection.insert_one(doc)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    # Now do parsing immediately:
    # 1. Extract text
    if "file_content" in doc and "filename" in doc:
        suffix = os.path.splitext(doc["filename"])[-1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(doc["file_content"])
            tmp_path = tmp.name
        try:
            text = extract_text(tmp_path)
        except Exception as e:
            os.remove(tmp_path)
            return jsonify({"error": f"Failed to extract text: {str(e)}"}), 500
        os.remove(tmp_path)
    elif "biography_text" in doc:
        text = doc["biography_text"]
    else:
        return jsonify({"error": "No file or biography text to parse"}), 400

    # 2. Parse with LLM
    parser = ResumeParser()
    try:
        parse_result = parser.parse(text)
    except Exception as e:
        return jsonify({"error": f"LLM parsing failed: {str(e)}"}), 500

    # 3. Save parse result into document
    biography_collection.update_one(
        {"_id": result.inserted_id},
        {"$set": {"parse_result": parse_result}}
    )

    # 4. Return the parse result
    return jsonify({
        "message": "Upload and parsing successful",
        "id": str(result.inserted_id),
        "parse_result": parse_result
    }), 200

@upload_bp.route("/resume/<id>", methods=["GET"])
def get_data(id):
    try:
        doc = biography_collection.find_one({"_id": ObjectId(id)})
    except Exception as e:
        return jsonify({"error": f"Invalid ID format: {str(e)}"}), 400
    
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    
    parse_result = doc.get("parse_result")
    if not parse_result:
        return jsonify({"error": "No parse result found for this document"}), 404
    
    return jsonify({
        "id": str(doc["_id"]),
        "parse_result": parse_result
    }), 200