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
    Only handles tailoring - scoring and advice are handled by separate classes.
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
            Tailored resume data optimized for the specific job (without score)
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
                    "You are an expert resume writer. Your task is to tailor an existing resume to better match a specific job posting. "
                    "You will receive a resume in JSON format and a job posting in JSON format. "
                    "Your goal is to optimize the resume for this specific job while maintaining absolute accuracy and truthfulness. "

                    "IMPORTANT RULES: "
                    "1. NEVER fabricate, infer, or add any new information (skills, experience, education, certifications) that is not explicitly present in the resume input. "
                    "2. You may only rephrase, re-order, reformat, or re-organize existing content. "
                    "3. You may NOT create or suggest skills or experience from the job posting that are missing from the resume. "
                    "4. You may prioritize, rephrase, or highlight existing information to align with the job requirements, but never invent or embellish. "
                    "5. Keep the same JSON structure as the input resume. "
                    "6. Maintain professional language and formatting. "
                    "7. Do not make assumptions or halluncinate about the candidate's experience or skills. "
                    "8. Only base your optimization on the information present in the resume. "

                    "TAILORING STRATEGIES: "
                    "- Reorder skills to emphasize those the candidate already has that are relevant to the job. "
                    "- Rephrase responsibilities and accomplishments using keywords from the job posting, but ONLY if those keywords accurately describe existing experience. "
                    "- Reorder or reformat content to highlight the most relevant sections first. "
                    "- You may adjust the career objective to mention the target company and role, but do NOT imply experience the candidate does not have. "

                    "Return the tailored resume in the exact same JSON format as the input resume. Output only valid JSON. Do not include any explanations, formatting, or comments."
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


class ResumeScorer:
    """
    Deterministic resume scoring system that evaluates resume-job match.
    """
    def __init__(self, api_key: str = None):
        key = api_key or OPENAI_API_KEY
        if not key:
            raise ValueError("OpenAI API key must be set in OPENAI_API_KEY")
        self.client = OpenAI(api_key=key)

    def score_resume(self, resume_data: dict, job_ad_data: dict) -> dict:
        """
        Score a resume against a job ad using deterministic criteria.
        
        Args:
            resume_data: Parsed resume data
            job_ad_data: Parsed job ad data
            
        Returns:
            Dict with overall score, category scores, strengths, and gaps
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
                        "You are an expert technical recruiter. Score this resume against the job requirements using the following DETERMINISTIC scoring rubric. "
                        "NEVER penalize for overqualification, extra education, or irrelevant experience. Only penalize for MISSING requirements. "
                        "Treat extra qualifications and diverse backgrounds as STRENGTHS, not weaknesses. "
                        
                        "SCORING CATEGORIES (each 0-20 points): "
                        "1. SKILLS_MATCH (0-20): How many required technical skills does the candidate have? "
                        "If job posting has no specific skills listed or shows 'N/A' for qualifications, award 18-20 points. "
                        "   - 18-20: Has 90%+ of required skills, bonus for additional relevant skills, OR job requires no specific skills "
                        "   - 15-17: Has 70-89% of required skills "
                        "   - 10-14: Has 50-69% of required skills "
                        "   - 5-9: Has 25-49% of required skills "
                        "   - 0-4: Has <25% of required skills "
                        
                        "2. EXPERIENCE_RELEVANCE (0-20): How relevant is their work experience? "
                        "Focus ONLY on relevant experience. Irrelevant experience is NEUTRAL (not negative). "
                        "If job posting shows 'Required Experience: N/A' or similar, award 18-20 points. "
                        "   - 18-20: Has relevant experience that meets/exceeds requirements OR job requires no specific experience "
                        "   - 15-17: Has some relevant experience, meets minimum requirements "
                        "   - 10-14: Has limited relevant experience, below requirements "
                        "   - 5-9: Has minimal relevant experience "
                        "   - 0-4: No relevant experience for this specific role "
                        
                        "3. EDUCATION (0-20): Does education meet minimum requirements? "
                        "More education than required = POSITIVE, never negative. "
                        "If job posting shows 'Required Education: N/A' or similar, award 18-20 points. "
                        "   - 18-20: Exceeds education requirements, has relevant advanced degrees, OR job requires no specific education "
                        "   - 15-17: Meets education requirements exactly "
                        "   - 10-14: Close to requirements (e.g., relevant bootcamp vs degree) "
                        "   - 5-9: Below requirements but has relevant experience compensation "
                        "   - 0-4: Significantly below requirements with no compensation "
                        
                        "4. KEYWORD_ALIGNMENT (0-20): Resume uses terminology/keywords from job posting "
                        "   - 18-20: Uses 80%+ of job posting terminology naturally "
                        "   - 15-17: Uses 60-79% of job posting terminology "
                        "   - 10-14: Uses 40-59% of job posting terminology "
                        "   - 5-9: Uses 20-39% of job posting terminology "
                        "   - 0-4: Uses <20% of job posting terminology "
                        
                        "5. IMPACT_ACHIEVEMENTS (0-20): Evidence of delivering results and value "
                        "   - 18-20: Multiple quantified achievements, clear business impact "
                        "   - 15-17: Several good achievements, some quantified results "
                        "   - 10-14: Some achievements mentioned, limited quantification "
                        "   - 5-9: Few achievements, mostly task-oriented descriptions "
                        "   - 0-4: No clear achievements or impact demonstrated "
                        
                        "IMPORTANT: "
                        "- Extra education, certifications, or experience should BOOST scores, not hurt them "
                        "- Diverse backgrounds and transferable skills are STRENGTHS "
                        "- Only penalize for what's MISSING, never for what's 'extra' "
                        "- Consider career changers and non-traditional paths as having valuable diverse perspectives "
                        "- When job requirements are 'N/A', 'None', 'Not specified', empty, or similar, award FULL POINTS (18-20) for that category "
                        "- If required_experience is 'N/A' or not specified, award 18-20 points for EXPERIENCE_RELEVANCE "
                        "- If required_education is 'N/A' or not specified, award 18-20 points for EDUCATION "
                        "- If required_skills/qualifications are 'N/A' or not specified, award 18-20 points for SKILLS_MATCH "
                        "- Check the job posting data carefully - if any requirement field is missing or shows N/A, give full credit "
                        "- If qualifications list is empty or contains only 'N/A', award 18-20 points for SKILLS_MATCH "
                        
                        "Return JSON with: "
                        "{ "
                        "  \"overall_score\": <MUST be the exact sum of all 5 category scores below>, "
                        "  \"category_scores\": { "
                        "    \"skills_match\": <0-20>, "
                        "    \"experience_relevance\": <0-20>, "
                        "    \"education\": <0-20>, "
                        "    \"keyword_alignment\": <0-20>, "
                        "    \"impact_achievements\": <0-20> "
                        "  }, "
                        "  \"strengths\": [\"list of 2-4 key strengths\"], "
                        "  \"gaps\": [\"list of 1-3 missing requirements only\"], "
                        "  \"transferable_skills\": [\"list of transferable skills from other domains\"] "
                        "} "
                        
                        "CRITICAL: The overall_score MUST equal skills_match + experience_relevance + education + keyword_alignment + impact_achievements. "
                        "Output only valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": f"Score this resume against this job ad:\n\nRESUME:\n{resume_json}\n\nJOB AD:\n{job_ad_json}"
                }
            ],
            temperature=0.1,
        )
        
        # Parse the response and fix the math
        result = json.loads(resp.choices[0].message.content)
        
        # Ensure the overall score is the correct sum of category scores
        if "category_scores" in result:
            category_scores = result["category_scores"]
            correct_overall_score = (
                category_scores.get("skills_match", 0) +
                category_scores.get("experience_relevance", 0) +
                category_scores.get("education", 0) +
                category_scores.get("keyword_alignment", 0) +
                category_scores.get("impact_achievements", 0)
            )
            result["overall_score"] = correct_overall_score
        
        return result


class ResumeAdviceGenerator:
    """
    Generate tailored advice for improving resume-job match.
    """
    def __init__(self, api_key: str = None):
        key = api_key or OPENAI_API_KEY
        if not key:
            raise ValueError("OpenAI API key must be set in OPENAI_API_KEY")
        self.client = OpenAI(api_key=key)

    def generate_advice(self, resume_data: dict, job_ad_data: dict, score_data: dict = None) -> dict:
        """
        Generate specific, actionable advice for improving resume-job match.
        
        Args:
            resume_data: Parsed resume data
            job_ad_data: Parsed job ad data
            score_data: Optional scoring data for context
            
        Returns:
            Dict with structured advice, tips, and recommendations
        """
        resume_json = json.dumps(resume_data, indent=2)
        job_ad_json = json.dumps(job_ad_data, indent=2)
        score_json = json.dumps(score_data, indent=2) if score_data else "No scoring data provided"
        
        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert career coach and resume consultant. Provide specific, actionable advice for improving this resume's match with the job posting. "
                        "Focus on constructive improvements while celebrating existing strengths. "
                        
                        "ADVICE PRINCIPLES: "
                        "1. NEVER suggest adding skills or experience the candidate doesn't have "
                        "2. Focus on better highlighting and presenting existing qualifications "
                        "3. Celebrate diverse backgrounds and transferable skills as strengths "
                        "4. Provide specific, actionable recommendations "
                        "5. Be encouraging and positive while being realistic "
                        "6. Consider career changers and non-traditional paths as valuable "
                        
                        "ADVICE CATEGORIES: "
                        "1. CONTENT_IMPROVEMENTS: How to better present existing experience "
                        "2. KEYWORD_OPTIMIZATION: How to incorporate job posting language naturally "
                        "3. SKILL_DEVELOPMENT: Specific skills to develop (based on gaps identified) "
                        "4. EXPERIENCE_HIGHLIGHTING: How to emphasize relevant experience better "
                        
                        "DO NOT PROVIDE FORMATTING ADVICE: "
                        "- Do NOT suggest formatting changes like bullet points, layout, or visual structure "
                        "- Do NOT suggest organizing content into sections or lists "
                        "- The system handles all formatting automatically through professional templates "
                        
                        "Return JSON with: "
                        "{ "
                        "  \"overall_assessment\": \"2-3 sentence positive overview\", "
                        "  \"key_strengths\": [\"list of 3-5 specific strengths to celebrate\"], "
                        "  \"improvement_areas\": { "
                        "    \"content_improvements\": [\"specific content suggestions\"], "
                        "    \"keyword_optimization\": [\"specific keyword suggestions\"], "
                        "    \"skill_development\": [\"specific skills to develop\"], "
                        "    \"experience_highlighting\": [\"ways to better present experience\"] "
                        "  }, "
                        "  \"priority_actions\": [\"top 3 most impactful changes to make\"], "
                        "  \"long_term_recommendations\": [\"career development suggestions\"], "
                        "  \"encouragement\": \"positive, motivating message about their potential\" "
                        "} "
                        
                        "Be specific, actionable, and encouraging. Output only valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": f"Provide advice for this resume and job combination:\n\nRESUME:\n{resume_json}\n\nJOB:\n{job_ad_json}\n\nSCORE DATA:\n{score_json}"
                }
            ],
            temperature=0.3,
        )
        return json.loads(resp.choices[0].message.content)