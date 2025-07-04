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

class ResumeTailoringParser:
    """
    Wrap OpenAI chat API to tailor resume data based on job ad requirements.
    """
    def __init__(self, api_key: str = None):
        key = api_key or OPENAI_API_KEY
        if not key:
            raise ValueError("OpenAI API key must be set in OPENAI_API_KEY")
        self.client = OpenAI(api_key=key)

    def tailor_resume(self, resume_data: dict, job_ad_data: dict) -> dict:
        """
        Tailor a resume based on job ad requirements.
        
        Args:
            resume_data: Parsed resume data from ResumeParser
            job_ad_data: Parsed job ad data from JobAdParser
            
        Returns:
            Tailored resume data optimized for the specific job
        """
        resume_json = json.dumps(resume_data, indent=2)
        job_ad_json = json.dumps(job_ad_data, indent=2)
        
        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert resume writer and a experienced technical recruiter. Your task is to tailor an existing resume to better match a specific job posting and give a numerical rating on how much the resume matches the job ad. "
                    "You will receive a resume in JSON format and a job posting in JSON format. "
                    "Your goal is to optimize the resume for this specific job while maintaining absolute accuracy and truthfulness, and also assign a numeric score (0-100) on how well it matches the job ad. "

                    "IMPORTANT RULES: "
                    "1. NEVER fabricate, infer, or add any new information (skills, experience, education, certifications) that is not explicitly present in the resume input. "
                    "2. You may only rephrase, re-order, reformat, or re-organize existing content. "
                    "3. You may NOT create or suggest skills or experience from the job posting that are missing from the resume. "
                    "4. You may prioritize, rephrase, or highlight existing information to align with the job requirements, but never invent or embellish. "
                    "5. Keep the same JSON structure as the input resume. "
                    "6. Maintain professional language and formatting. "
                    "7. Do not make assumptions or halluncinate about the candidate's experience or skills. "
                    "8. Only base your evaluation on the information present in the resume. "

                    "TAILORING STRATEGIES: "
                    "- Reorder skills to emphasize those the candidate already has that are relevant to the job. "
                    "- Rephrase responsibilities and accomplishments using keywords from the job posting, but ONLY if those keywords accurately describe existing experience. "
                    "- Reorder or reformat content to highlight the most relevant sections first. "
                    "- You may adjust the career objective to mention the target company and role, but do NOT imply experience the candidate does not have. "

                    "Return the tailored resume in the exact same JSON format as the input resume, but ADD a top-level field named \"score\" (an integer between 0 and 100) indicating the match. The output MUST be a single JSON object with all original fields and the new \"score\" field at the top level. Output only valid JSON. Do not include any explanations, formatting, or comments."
                )
            },
            {
                "role": "user",
                "content": f"Please tailor this resume:\n\nRESUME DATA:\n{resume_json}\n\nFOR THIS JOB POSTING:\n{job_ad_json}"
            }
        ],
            temperature=0.2,  # Slightly higher temperature for creative rephrasing while maintaining accuracy
        )
        return json.loads(resp.choices[0].message.content)

#{"role": "system", "content": "Return JSON with keys: name, contact, skills, education, jobs."}

class ResumeAdviceParser:
    """
    Wrap OpenAI chat API to provide advice on how to improve a tailored resume based on the job ad and score.
    """
    def __init__(self, api_key: str = None):
        key = api_key or OPENAI_API_KEY
        if not key:
            raise ValueError("OpenAI API key must be set in OPENAI_API_KEY")
        self.client = OpenAI(api_key=key)

    def generate_advice(self, tailored_resume: dict, job_ad_data: dict, score: int) -> str:
        """
        Generate advice for a tailored resume based on its score and the job ad.

        Args:
            tailored_resume: The tailored resume data (dict)
            job_ad_data: The job ad data (dict)
            score: The match score (int)

        Returns:
            Advice string from the LLM
        """
        resume_json = json.dumps(tailored_resume, indent=2)
        job_ad_json = json.dumps(job_ad_data, indent=2)

        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert resume reviewer. "
                        "Given a tailored resume, a job ad, and a match score, explain in detail why the resume received this score. "
                        "Provide actionable, specific advice on how the candidate could improve their resume to better match the job ad. "
                        "Be concise, constructive, and professional."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"RESUME (JSON):\n{resume_json}\n\n"
                        f"JOB AD (JSON):\n{job_ad_json}\n\n"
                        f"SCORE: {score}\n\n"
                        "Please explain the reasoning behind this score and give advice for improvement."
                    )
                }
            ],
            temperature=0.3,
            max_tokens=500
        )
        return resp.choices[0].message.content.strip()