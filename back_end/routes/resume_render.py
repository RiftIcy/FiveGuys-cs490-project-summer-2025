import json
import subprocess
from flask import Blueprint, Response, current_app
from bson import ObjectId
from db import biography_collection
from parser.parser import ResumeParser

render_bp = Blueprint("render_bp", __name__)
parser = ResumeParser()

@render_bp.route("/resume/<resume_id>/html", methods=["GET"])
def render_resume_html(resume_id):
    # 1) validate & fetch
    if not ObjectId.is_valid(resume_id):
        return Response("Invalid resume ID", status=400)
    doc = biography_collection.find_one({"_id": ObjectId(resume_id)})
    if not doc:
        return Response("Resume not found", status=404)

    # 2) pull the raw text you stored at upload time
    raw_text = doc.get("raw_text") or doc.get("text") or ""
    if not raw_text:
        return Response("No resume text to parse", status=400)

    # 3) parse via OpenAI into your structured schema
    try:
        pr = parser.parse(raw_text)
    except Exception:
        current_app.logger.exception("Parsing failed")
        return Response("Parsing error", status=500)

    # 4) build a JSON-Resume payload
    resume_json = {
        "basics": {},
        "work":   [],
        "education": [],
        "skills": []
    }

    # basics
    b = resume_json["basics"]
    b["name"] = pr.get("name") or ""
    emails = pr.get("contact", {}).get("emails", [])
    phones = pr.get("contact", {}).get("phones", [])
    if emails:
        b["email"] = emails[0]
    if phones:
        b["phone"] = phones[0]
    if pr.get("career_objective"):
        b["summary"] = pr["career_objective"]

    # work
    for job in pr.get("jobs", []):
        sd = job.get("start_date") or ""
        ed = job.get("end_date") or ""
        # only append “-01” if we actually got a YYYY-MM string
        start_iso = f"{sd}-01" if sd else ""
        # treat “Present” as open-ended
        if ed.lower() == "present":
            end_iso = ""
        else:
            end_iso = f"{ed}-01" if ed else ""

        resume_json["work"].append({
            "company":    job.get("company") or "",
            "position":   job.get("title")   or "",
            "location":   job.get("location") or "",
            "startDate":  start_iso,
            "endDate":    end_iso,
            "summary":    job.get("role_summary") or "",
            "highlights": job.get("accomplishments", []),
        })

    # education
    for edu in pr.get("education", []):
        gd = edu.get("graduation_date") or ""
        resume_json["education"].append({
            "institution": edu.get("institution") or "",
            "studyType":   edu.get("degree")      or "",
            "startDate":   "",            # parser only gives graduation_date
            "endDate":     gd,
            "gpa":         (str(edu["GPA"]) 
                            if edu.get("GPA") is not None else ""),
        })

    # skills
    for category, keywords in pr.get("skills", {}).items():
        resume_json["skills"].append({
            "name":     category,
            "keywords": keywords
        })

    # 5) pipe it into the Even theme’s CLI
    try:
        # jsonresume-theme-even reads resume.json from stdin and writes HTML to stdout
        proc = subprocess.Popen(
            ["npx", "jsonresume-theme-even"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        payload = json.dumps(resume_json).encode("utf-8")
        html, err = proc.communicate(payload)

        if proc.returncode != 0:
            current_app.logger.error(err.decode("utf-8"))
            return Response("Rendering failed", status=500)

        return Response(html, mimetype="text/html")

    except Exception:
        current_app.logger.exception("Unexpected error in render")
        return Response("Server error", status=500)