"""LaTeX compilation via the texlive.net online compiler.

No local TeX installation is required — the .tex source is POSTed to
texlive.net's latexcgi service, which returns the compiled PDF.
"""
import httpx

LATEX_COMPILE_URL = "https://texlive.net/cgi-bin/latexcgi"
COMPILE_TIMEOUT = 90.0


class LatexCompileError(Exception):
    """Raised when the LaTeX source fails to compile. .log holds the compiler log."""

    def __init__(self, message, log=""):
        super().__init__(message)
        self.log = log


def compile_latex(latex_source):
    """Compile a LaTeX document to PDF bytes using texlive.net.

    Raises LatexCompileError with the compiler log on failure.
    """
    files = [
        ("filecontents[]", ("document.tex", latex_source.encode("utf-8"), "text/plain")),
        ("filename[]", (None, "document.tex")),
        ("engine", (None, "pdflatex")),
        ("return", (None, "pdf")),
    ]
    try:
        response = httpx.post(LATEX_COMPILE_URL, files=files, timeout=COMPILE_TIMEOUT, follow_redirects=True)
    except httpx.HTTPError as e:
        raise LatexCompileError(f"Could not reach the LaTeX compile service: {e}")

    if response.status_code == 200 and response.content[:4] == b"%PDF":
        return response.content

    # On compile failure the service returns the .log file as text
    log_text = response.content.decode("utf-8", errors="replace")
    raise LatexCompileError("LaTeX compilation failed.", log=_extract_errors(log_text))


def _extract_errors(log_text):
    """Pull the relevant error lines out of a (potentially huge) LaTeX log."""
    lines = log_text.splitlines()
    error_lines = []
    capture = 0
    for line in lines:
        if line.startswith("!") or "Error" in line:
            capture = 4  # include a few lines of context after each error
        if capture > 0:
            error_lines.append(line)
            capture -= 1
        if len(error_lines) > 60:
            break
    return "\n".join(error_lines) if error_lines else log_text[-3000:]


# Jake's Resume — the de-facto standard ATS-friendly LaTeX resume template
# (https://github.com/jakegut/resume), used as the base the LLM fills in
# with the candidate's actual resume content.
JAKES_TEMPLATE = r"""\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

% Ensure that generated pdf is machine readable/ATS parsable
\pdfgentounicode=1

%-------------------------
% Custom commands
\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubSubheading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textit{\small#1} & \textit{\small #2} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\begin{document}

%----------HEADING----------
\begin{center}
    \textbf{\Huge \scshape Jake Ryan} \\ \vspace{1pt}
    \small 123-456-7890 $|$ \href{mailto:jake@su.edu}{\underline{jake@su.edu}} $|$
    \href{https://linkedin.com/in/jake}{\underline{linkedin.com/in/jake}} $|$
    \href{https://github.com/jake}{\underline{github.com/jake}}
\end{center}

%-----------EDUCATION-----------
\section{Education}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Southwestern University}{Georgetown, TX}
      {Bachelor of Arts in Computer Science, Minor in Business}{Aug. 2018 -- May 2021}
  \resumeSubHeadingListEnd

%-----------EXPERIENCE-----------
\section{Experience}
  \resumeSubHeadingListStart
    \resumeSubheading
      {Undergraduate Research Assistant}{June 2020 -- Present}
      {Texas A\&M University}{College Station, TX}
      \resumeItemListStart
        \resumeItem{Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems}
        \resumeItem{Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data}
      \resumeItemListEnd
  \resumeSubHeadingListEnd

%-----------PROJECTS-----------
\section{Projects}
    \resumeSubHeadingListStart
      \resumeProjectHeading
          {\textbf{Gitlytics} $|$ \emph{Python, Flask, React, PostgreSQL, Docker}}{June 2020 -- Present}
          \resumeItemListStart
            \resumeItem{Developed a full-stack web application using with Flask serving a REST API with React as the frontend}
            \resumeItem{Implemented GitHub OAuth to get data from user's repositories}
          \resumeItemListEnd
    \resumeSubHeadingListEnd

%-----------TECHNICAL SKILLS-----------
\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Languages}{: Java, Python, C/C++, SQL (Postgres), JavaScript, HTML/CSS} \\
     \textbf{Frameworks}{: React, Node.js, Flask, JUnit, WordPress, Material-UI} \\
     \textbf{Developer Tools}{: Git, Docker, TravisCI, Google Cloud Platform, VS Code} \\
     \textbf{Libraries}{: pandas, NumPy, Matplotlib}
    }}
 \end{itemize}

\end{document}
"""
