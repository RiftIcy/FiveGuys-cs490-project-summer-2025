import json
from openai import OpenAI
from parser.config import OPENAI_API_KEY

class ResumeParser:
    """
    Wrap OpenAI chat API to parse resume text into structured JSON.
    """
    def __init__(self, api_key: str = None):
        key = api_key or OPENAI_API_KEY
        if not key:
            raise ValueError("OpenAI API key must be set in OPENAI_API_KEY")
        self.client = OpenAI(api_key=key)

    def parse(self, text: str) -> dict:
        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Treat all of the following sections as optional.  "
                        "Always include **all** of these top‐level keys in your JSON output; if a section has no data, use null for strings, [] for lists, and {} for objects.\n\n"
                        "Return JSON with the following keys:\n\n"
                        "- name: string (or null)\n"
                        "- contact: object (or {}) with:\n"
                        "   - emails: list of strings (first is primary) (or [])\n"
                        "   - phones: list of strings (first is primary) (or []) and the phone number should be of the form xxx-xxx-xxxx\n"
                        "- career_objective: string (or null)\n"
                        "- skills: object mapping category → list of strings (or {}) If there are duplicates ignore them and only use one of them that includes categories as well\n"
                        "- jobs: list of job objects (or []), each with:\n"
                        "   - title: string (or null),\n"
                        "   - company: string (or null),\n"
                        "   - location: string \"City,State\" (or null),\n"
                        "   - start_date: string \"YYYY-MM\" (or null),\n"
                        "   - end_date: string \"YYYY-MM\"|\"Present\" (or null),\n"
                        "   - role_summary: string (or null),\n"
                        "   - responsibilities: list of strings (or []),\n"
                        "   - accomplishments: list of strings (or [])\n\n"
                        "- education: list of education objects (or []), each with:"
                        "   - degree: string (or null),"
                        "   - institution: string (or null),\n"
                        "   - start_date: string \"YYYY-MM\" (or null),\n"
                        "   - end_date: string \"YYYY-MM\"|\"Present\" (or null),\n"
                        "   - GPA: number (or null)\n\n"
                        "Output only valid JSON.  Do not include any explanations, formatting, or comments."
                    )
                },
                {"role": "user", "content": text},
            ],
            temperature=0.0,
        )
        return json.loads(resp.choices[0].message.content)

#{"role": "system", "content": "Return JSON with keys: name, contact, skills, education, jobs."},