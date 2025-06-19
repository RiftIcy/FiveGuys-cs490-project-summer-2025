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
                        "- first_name: string (or null)\n"
                        "- last_name: string (or null)\n"
                        "- contact: object (or {}) with:\n"
                        "   - emails: list of strings (first is primary) (or [])\n"
                        "   - phones: list of strings (first is primary) (or []) and the phone number should be of the form xxx-xxx-xxxx\n"
                        "- career_objective: Look for a few sentences summary of a job seeker's professional goals, what role they are pursuing, and how they intend to add value to a company. string (or null)\n"
                        "- skills: object mapping category → list of strings (or {}) If there are duplicates ignore them and only use one of them that includes categories as well\n"
                        "- jobs: list of job objects (or []), each with:\n"
                        "   - title: string (or null),\n"
                        "   - company: string (or null),\n"
                        "   - location: string \"City,State\" (or null),\n"
                        "   - start_date: string \"YYYY-MM\" (or null),\n"
                        "   - end_date: string \"YYYY-MM\"|\"Present\" (or null),\n"
                        "    - role_summary: one full sentence synthesizing the overall scope and key duties of this role; "
                        "      If the input is bullets or prose and lacks a clear summary, generate a one-sentence original overview of all duties and tasks; "
                        "      do **not** copy any single sentence or bullet verbatim (or null)\n"
                        "   - responsibilities: list of primary responsibilities and day-to-day tasks held in this role (or [])\n"
                        "   - accomplishments: list of full, grammatically complete sentences highlighting **quantifiable** achievements or impact (e.g. “Increased X by 20%”); separate these from routine duties (or [])\n\n"
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
    
class JobAdParser:
    """
    Wrap OpenAI chat API to parse job ad text into structured JSON.
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
                        "Treat all of the following sections as optional. "
                        "Always include **all** of these top-level keys in your JSON output. "
                        "If a section has no data, use null for strings, [] for lists, and {} for objects. "
                        "The input text may contain job postings from online job boards, copied HTML, company websites, or mixed text formats. "

                        "Return JSON with the following keys: "
                        "- job_title: string (or null) "
                        "- company: string (or null) "
                        "- location: string (or null) "
                        "- employment_type: string (e.g. 'Full-time', 'Part-time', 'Contract', 'Internship') (or null) "
                        "- salary_range: Extract from the job posting, in the form '$xxx,xxx - $xxx,xxx' or similar. Do not confuse with 401k or other unrelated numbers. "
                        "- required_experience: string (or null) "
                        "- required_education: string (or null) "
                        "- job_description: A paragraph (2-4 sentences) summarizing the role, written in prose. If no clear paragraph is provided, synthesize one from any 'Role Overview', 'About Us', or opening paragraphs. Do not copy responsibilities."
                        "- responsibilities: list of strings (or []) "
                        "- qualifications: list of strings (or []) "
                        "- benefits: list of strings (or []) "
                        "Output only valid JSON. Do not include any explanations, formatting, or comments."
                    )

                },
                {"role": "user", "content": text},
            ],
            temperature=0.0,
        )
        return json.loads(resp.choices[0].message.content)

#{"role": "system", "content": "Return JSON with keys: name, contact, skills, education, jobs."},