import os
import json
from groq import Groq

def _client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set. Please add it to your .env file.")
    return Groq(api_key=api_key)

def analyze_resume_fit(job_description, resume_text):
    """
    Calls the Groq LLM to analyze the fit between a job description and a resume.
    """
    client = _client()
    
    prompt = f"""
    You are an expert resume coach and ATS specialist.
    Your goal is to help a candidate rewrite specific lines in their existing resume to better match a job description.

    JOB DESCRIPTION:
    {job_description}

    RESUME:
    {resume_text}

    Instructions:
    1. Extract the core skills and keywords required from the Job Description.
    2. Check which of these keywords are already present in the Resume.
    3. Calculate the "fit_score" as an integer from 0 to 100 based on the percentage of required core skills that are present in the resume (e.g., if 8 out of 10 keywords match, the score is 80).
    4. For each missing keyword, look at the candidate's existing resume bullet points and experiences.
       Suggest a concrete rewrite of an existing bullet point or section that naturally incorporates the missing keyword.
       Each suggestion must reference something already on the resume — do NOT suggest learning new skills or adding entirely new experiences.
       Format each suggestion as: "In [section/job], change '<original text or paraphrase>' to '<rewritten version with keyword>'."
    5. Output your response strictly as a JSON object with the following schema:
    {{
        "matched_keywords": ["skill1", "skill2"],
        "missing_keywords": ["skill3", "skill4"],
        "suggestions": [
            "In [Work Experience at Company X], change 'built internal tooling' to 'built internal tooling using CI/CD pipelines with GitHub Actions'.",
            "In [Projects], change 'deployed the app on a server' to 'deployed the app on AWS EC2 using Docker containers'."
        ],
        "fit_score": 75
    }}

    Only output valid JSON. Do not include any markdown formatting blocks like ```json.
    """
    
    response = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a helpful API that only outputs valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    
    result = response.choices[0].message.content
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        print("Failed to parse JSON from LLM response:", result)
        return {
            "matched_keywords": [],
            "missing_keywords": [],
            "suggestions": ["Error analyzing resume. Please try again."],
            "fit_score": 0
        }


def generate_cover_letter(job_description, company_name, job_title, resume_text):
    client = _client()

    prompt = f"""
    You are an expert career coach who writes compelling, personalized cover letters.
    Write a cover letter for the candidate applying to the role below.
    Base it entirely on their existing resume — do not invent experiences they don't have.

    COMPANY: {company_name}
    ROLE: {job_title}

    JOB DESCRIPTION:
    {job_description}

    CANDIDATE'S RESUME:
    {resume_text}

    Instructions:
    - The entire letter must fit on one page — target 250 to 350 words maximum.
    - Write exactly 3 tight paragraphs.
    - Opening (2–3 sentences): express genuine interest in the specific role and company.
      Connect something about the company's mission or product to the candidate's actual interests.
    - Middle (3–5 sentences): highlight the 2–3 most relevant experiences or achievements from the
      resume that directly map to the job description. Be specific — mention real projects,
      technologies, and measurable outcomes.
    - Closing (2 sentences): a brief, confident call to action.
    - Tone: professional but human, short sentences, not stiff or generic. No em-dashes.
    - Do NOT include a date, address block, or subject line — just the body paragraphs.
    - Do NOT start with "I am writing to apply for..." — use a stronger opener.
    - Do NOT use phrases like "I am excited to" or "I believe I would be a great fit."
    - Do NOT pad with filler phrases. Every sentence must earn its place.
    - Adapt the tone to match the candidate's experience level based on their resume. Keep the confidence grounded and specific, not grandiose.

    Output only the cover letter text. No explanations, no markdown.
    """

    response = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a professional cover letter writer. Output only the cover letter body text. Write short, punchy sentences. No filler."},
            {"role": "user", "content": prompt},
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.5,
    )
    return response.choices[0].message.content.strip()
