import os
import json
from groq import Groq

class GroqFallbackClient:
    @property
    def chat(self):
        return self

    @property
    def completions(self):
        return self

    def create(self, **kwargs):
        keys = []
        primary = os.getenv("GROQ_API_KEY")
        if primary:
            keys.append(primary)
        
        # Retrieve fallback keys from environment variables to avoid hardcoding secrets
        for i in range(1, 10):
            fb_key = os.getenv(f"GROQ_API_KEY_FALLBACK_{i}")
            if fb_key:
                keys.append(fb_key)
                
        # Also support a comma-separated list of keys
        comma_keys = os.getenv("GROQ_API_KEYS")
        if comma_keys:
            for k in comma_keys.split(","):
                cleaned = k.strip()
                if cleaned:
                    keys.append(cleaned)

        # Deduplicate keys while maintaining order
        seen = set()
        deduped_keys = []
        for key in keys:
            if key not in seen:
                seen.add(key)
                deduped_keys.append(key)
                
        if not deduped_keys:
            raise ValueError("No GROQ_API_KEY environment variable is set and no fallback keys are available.")

        last_exception = None
        for key in deduped_keys:
            try:
                real_client = Groq(api_key=key)
                return real_client.chat.completions.create(**kwargs)
            except Exception as e:
                masked_key = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "invalid_key"
                print(f"Groq API call failed with key {masked_key}: {e}")
                last_exception = e
                continue
        raise last_exception

def _client():
    return GroqFallbackClient()

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


def refine_cover_letter(current_letter, instruction, job_description, company_name, job_title):
    prompt = f"""
    You are a professional cover letter editor.
    The candidate wants to refine their cover letter based on a specific instruction.

    COMPANY: {company_name}
    ROLE: {job_title}

    JOB DESCRIPTION:
    {job_description}

    CURRENT COVER LETTER:
    {current_letter}

    CANDIDATE'S INSTRUCTION:
    {instruction}

    Rewrite the cover letter applying the instruction precisely.
    Keep these constraints:
    - 250-350 words maximum (must fit one page)
    - Exactly 3 paragraphs
    - Professional but human tone, no filler phrases
    - No date, address block, or subject line — body paragraphs only
    - Do NOT start with "I am writing to apply for..."

    Output only the revised cover letter text. No explanations, no markdown.
    """

    response = _client().chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a professional cover letter editor. Output only the revised cover letter body text."},
            {"role": "user", "content": prompt},
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.4,
    )
    return response.choices[0].message.content.strip()


def _extract_latex_document(text):
    """Pull a complete LaTeX document out of an LLM response.

    Models sometimes wrap output in markdown fences or add commentary;
    extract everything from \\documentclass through \\end{document}.
    Returns None if no complete document is found.
    """
    start = text.find('\\documentclass')
    end = text.rfind('\\end{document}')
    if start == -1 or end == -1 or end < start:
        return None
    return text[start:end + len('\\end{document}')]


def generate_tailored_resume(job_description, company_name, job_title, resume_text):
    """Generate a complete LaTeX resume tailored to a job description.

    Fills Jake's Resume template with the candidate's real resume content,
    rewriting bullets to emphasize the skills the job description asks for.
    Returns the full .tex source.
    """
    from app.services.latex_service import JAKES_TEMPLATE

    prompt = f"""
    You are an expert resume writer and ATS specialist who is also fluent in LaTeX.

    Below is a LaTeX resume template (Jake's Resume template), the candidate's actual resume
    content, and a job description they are applying to.

    Rebuild the template using ONLY the candidate's real information, tailored to the job:

    1. Replace ALL placeholder content in the template (Jake Ryan's name, contact info,
       education, experience, projects, skills) with the candidate's actual details from
       their resume below. Never leave any of Jake Ryan's example content in the output.
    2. Keep the template's preamble, custom commands, and overall structure exactly as-is.
       Only change the content between \\begin{{document}} and \\end{{document}}.
    3. Tailor the content to the job description: reorder and reword bullet points to
       emphasize the most relevant experience, and naturally weave in keywords from the
       job description where the candidate genuinely has that experience.
    4. Do NOT invent experience, employers, degrees, dates, or skills the candidate does
       not have. Rewording and emphasis only.
    5. Escape LaTeX special characters in content: use \\& for &, \\% for %, \\$ for $,
       \\# for #. Do not use unicode characters; use LaTeX equivalents.
    6. The resume must fit on one page — be concise, keep 2-4 bullets per role.
    7. If the candidate's resume is missing a section (e.g. no projects), omit that section.

    TEMPLATE:
    {JAKES_TEMPLATE}

    CANDIDATE'S RESUME:
    {resume_text}

    TARGET ROLE: {job_title} at {company_name}

    JOB DESCRIPTION:
    {job_description}

    Output ONLY the complete LaTeX document, starting with \\documentclass and ending with
    \\end{{document}}. No explanations, no markdown fences.
    """

    response = _client().chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a LaTeX resume generator. Output only a complete, compilable LaTeX document."},
            {"role": "user", "content": prompt},
        ],
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=8000,
    )
    raw = response.choices[0].message.content
    latex = _extract_latex_document(raw)
    if not latex:
        raise ValueError("LLM did not return a complete LaTeX document. Please try again.")
    return latex


def chat_edit_resume(current_latex, message, history, job_description):
    """Interactive chat editing of a tailored LaTeX resume.

    Returns (reply, updated_latex) — updated_latex is None when the user's
    message didn't require changing the document (e.g. a question).
    """
    system = """You are an expert resume editor fluent in LaTeX, helping a candidate refine their resume for a specific job.

The user will give you their current LaTeX resume and an instruction or question.

Respond in EXACTLY this format:
- First, 1-3 sentences to the user: what you changed, or the answer to their question. Plain text, no markdown.
- Then, ONLY if the document needs to change, the complete updated LaTeX document between these exact markers:
<<<LATEX
(full document from \\documentclass to \\end{document})
LATEX>>>

Rules:
- Always output the ENTIRE document inside the markers, never a fragment or diff.
- Keep the preamble and custom commands intact; edit only content unless asked otherwise.
- Never invent experience, employers, degrees, dates, or skills the candidate does not have.
- Never add a skill or technology to the resume just because the job description mentions it — only if the user explicitly asks or it already appears in the resume.
- Escape LaTeX special characters (\\&, \\%, \\$, \\#) and keep the resume to one page.
- If the user asks a question that needs no edit, reply without a LATEX block."""

    messages = [{"role": "system", "content": system}]
    # Replay recent conversation for context (replies only — the latex itself
    # is sent fresh each turn to keep the context small and current).
    for turn in (history or [])[-8:]:
        if turn.get('role') in ('user', 'assistant') and turn.get('content'):
            messages.append({"role": turn['role'], "content": turn['content']})

    messages.append({
        "role": "user",
        "content": f"""JOB DESCRIPTION (for context):
{job_description}

CURRENT LATEX RESUME:
{current_latex}

MY REQUEST: {message}""",
    })

    response = _client().chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        max_tokens=8000,
    )
    raw = response.choices[0].message.content

    updated_latex = None
    reply = raw.strip()
    if '<<<LATEX' in raw:
        reply = raw.split('<<<LATEX')[0].strip()
        block = raw.split('<<<LATEX', 1)[1]
        block = block.split('LATEX>>>')[0] if 'LATEX>>>' in block else block
        updated_latex = _extract_latex_document(block)
        if not updated_latex:
            reply = (reply + "\n\n(I couldn't apply that change cleanly — please try rephrasing.)").strip()
    else:
        # Model sometimes skips the markers but still outputs a document
        maybe_doc = _extract_latex_document(raw)
        if maybe_doc:
            updated_latex = maybe_doc
            reply = raw[:raw.find('\\documentclass')].strip() or "Done — I've updated the resume."

    if not reply:
        reply = "Done — I've updated the resume." if updated_latex else "Sorry, I couldn't process that. Please try again."

    return reply, updated_latex
