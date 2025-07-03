import os
import subprocess
import tempfile
import importlib.util
import re
from pathlib import Path

class LaTeXCompiler:
    """
    LaTeX compilation service for generating professional resume PDFs
    """
    
    def __init__(self):
        self.templates_dir = Path(__file__).parent / "latex_templates"
        self.base_template_path = self.templates_dir / "base_template.tex"
        self.two_column_template_path = self.templates_dir / "two_column_template.tex"
    
    def escape_latex_text(self, text):
        """Escape special LaTeX characters in text content"""
        if not text:
            return ""
        
        # Convert to string if not already
        text = str(text)
        
        # Dictionary of LaTeX special characters and their escaped versions
        latex_special_chars = {
            '\\': r'\textbackslash{}',
            '{': r'\{',
            '}': r'\}',
            '$': r'\$',
            '&': r'\&',
            '%': r'\%',
            '#': r'\#',
            '^': r'\textasciicircum{}',
            '_': r'\_',
            '~': r'\textasciitilde{}',
        }
        
        # Escape special characters
        for char, escaped in latex_special_chars.items():
            text = text.replace(char, escaped)
        
        # Handle quotes
        text = text.replace('"', "''")
        text = text.replace('"', "''")
        text = text.replace('"', "''")
        text = text.replace("'", "'")
        text = text.replace("'", "'")
        
        return text

    def get_template_config(self, template_id="default"):
        """Load template configuration"""
        try:
            # Extract base template name (remove _1col or _2col suffix)
            base_template = template_id.replace('_1col', '').replace('_2col', '')
            
            config_path = self.templates_dir / f"{base_template}.py"
            if not config_path.exists():
                config_path = self.templates_dir / "default.py"
            
            spec = importlib.util.spec_from_file_location("template_config", config_path)
            config = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(config)
            return config
        except Exception as e:
            print(f"Error loading template config: {e}")
            # Return default config
            class DefaultConfig:
                TEMPLATE_CUSTOMIZATIONS = ""
                SECTION_COLOR = ""
                SECTION_UNDERLINE_COLOR = "\\color{black}"
                NAME_STYLE = "\\Huge \\scshape"
                FONT_PACKAGES = ""
            return DefaultConfig()
    
    def is_two_column_template(self, template_id):
        """Check if template is a two-column variant"""
        return template_id.endswith('_2col')
    
    def format_skills_section(self, skills_data, is_two_column=False):
        """Format skills data for LaTeX"""
        if not skills_data:
            return ""
        
        # Use the same formatting for both single and two column
        if isinstance(skills_data, list):
            skills_str = ", ".join([self.escape_latex_text(skill) for skill in skills_data])
            return f"""
\\section{{Technical Skills}}
 \\begin{{itemize}}[leftmargin=0.15in, label={{}}]
    \\small{{\\item{{
     \\textbf{{Skills}}: {skills_str}
    }}}}
 \\end{{itemize}}
"""
        elif isinstance(skills_data, dict):
            skills_content = []
            for category, skills_list in skills_data.items():
                if isinstance(skills_list, list):
                    skills_str = ", ".join([self.escape_latex_text(skill) for skill in skills_list])
                else:
                    skills_str = self.escape_latex_text(str(skills_list))
                category_formatted = self.escape_latex_text(category.replace('_', ' ').title())
                skills_content.append(f"\\textbf{{{category_formatted}}}: {skills_str}")
            
            skills_joined = " \\\\\n     ".join(skills_content)
            return f"""
\\section{{Technical Skills}}
 \\begin{{itemize}}[leftmargin=0.15in, label={{}}]
    \\small{{\\item{{
     {skills_joined}
    }}}}
 \\end{{itemize}}
"""
        
        # Fallback
        escaped_skills = self.escape_latex_text(str(skills_data))
        return f"""
\\section{{Technical Skills}}
 \\begin{{itemize}}[leftmargin=0.15in, label={{}}]
    \\small{{\\item{{
     \\textbf{{Skills}}: {escaped_skills}
    }}}}
 \\end{{itemize}}
"""
    
    def format_education_section(self, education_data, is_two_column=False):
        """Format education data for LaTeX"""
        if not education_data or not isinstance(education_data, list):
            return ""
        
        # Use the same formatting for both single and two column
        edu_items = []
        for edu in education_data:
            institution = self.escape_latex_text(edu.get('institution', '') or edu.get('school', ''))
            degree = self.escape_latex_text(edu.get('degree', ''))
            start_date = self.escape_latex_text(edu.get('start_date', ''))
            end_date = self.escape_latex_text(edu.get('end_date', '') or edu.get('graduation_date', ''))
            location = self.escape_latex_text(edu.get('location', ''))
            gpa = self.escape_latex_text(str(edu.get('gpa') or edu.get('GPA') or ''))
            
            if not institution and not degree:
                continue
                
            # Format dates
            date_range = ""
            if start_date or end_date:
                date_range = f"{start_date} -- {end_date}" if start_date and end_date else (end_date or start_date)
            
            edu_item = f"    \\resumeSubheading\n      {{{institution}}}{{{location}}}\n      {{{degree}}}{{{date_range}}}"
            
            if gpa:
                edu_item += f"\n      \\resumeItemListStart\n        \\resumeItem{{GPA: {gpa}}}\n      \\resumeItemListEnd"
            
            edu_items.append(edu_item)
        
        if not edu_items:
            return ""
            
        return f"""
\\section{{Education}}
  \\resumeSubHeadingListStart
{chr(10).join(edu_items)}
  \\resumeSubHeadingListEnd
"""
    
    def format_experience_section(self, jobs_data):
        """Format work experience data for LaTeX"""
        if not jobs_data or not isinstance(jobs_data, list):
            return ""
        
        job_items = []
        for job in jobs_data:
            title = self.escape_latex_text(job.get('title', '') or job.get('position', ''))
            company = self.escape_latex_text(job.get('company', ''))
            location = self.escape_latex_text(job.get('location', ''))
            start_date = self.escape_latex_text(job.get('start_date', ''))
            end_date = self.escape_latex_text(job.get('end_date', 'Present'))
            role_summary = self.escape_latex_text(job.get('role_summary', '') or job.get('summary', '') or job.get('description', ''))
            responsibilities = job.get('responsibilities', [])
            accomplishments = job.get('accomplishments', [])
            
            if not title and not company:
                continue
            
            # Format dates
            date_range = f"{start_date} -- {end_date}" if start_date else end_date
            
            job_item = f"    \\resumeSubheading\n      {{{title}}}{{{date_range}}}\n      {{{company}}}{{{location}}}"
            
            # Add responsibilities and accomplishments
            items = []
            if role_summary:
                items.append(f"        \\resumeItem{{{role_summary}}}")
            
            if isinstance(responsibilities, list):
                for resp in responsibilities:
                    if resp and str(resp).strip():
                        escaped_resp = self.escape_latex_text(str(resp).strip())
                        items.append(f"        \\resumeItem{{{escaped_resp}}}")
            
            if isinstance(accomplishments, list):
                for acc in accomplishments:
                    if acc and str(acc).strip():
                        escaped_acc = self.escape_latex_text(str(acc).strip())
                        items.append(f"        \\resumeItem{{{escaped_acc}}}")
            
            if items:
                job_item += "\n      \\resumeItemListStart\n" + "\n".join(items) + "\n      \\resumeItemListEnd"
            
            job_items.append(job_item)
        
        if not job_items:
            return ""
            
        return f"""
\\section{{Experience}}
  \\resumeSubHeadingListStart
{chr(10).join(job_items)}
  \\resumeSubHeadingListEnd
"""
    
    def generate_latex_content(self, resume_data, template_id="default"):
        """Generate LaTeX content from resume data"""
        # Load template configuration
        config = self.get_template_config(template_id)
        
        # Determine if this is a two-column template
        is_two_col = self.is_two_column_template(template_id)
        
        # Read appropriate template
        if is_two_col:
            with open(self.two_column_template_path, 'r') as f:
                template_content = f.read()
            return self.generate_two_column_latex_content(resume_data, template_id, config, template_content)
        else:
            with open(self.base_template_path, 'r') as f:
                template_content = f.read()
            return self.generate_single_column_latex_content(resume_data, template_id, config, template_content)
    
    def generate_single_column_latex_content(self, resume_data, template_id, config, template_content):
        """Generate single-column LaTeX content from resume data"""
        first_name = self.escape_latex_text(resume_data.get('first_name', ''))
        last_name = self.escape_latex_text(resume_data.get('last_name', ''))
        full_name = f"{first_name} {last_name}".strip() or "Name Not Provided"
        
        contact = resume_data.get('contact', {})
        if isinstance(contact, dict):
            email = self.escape_latex_text(contact.get('emails', [''])[0] if contact.get('emails') else '')
            phone = self.escape_latex_text(contact.get('phones', [''])[0] if contact.get('phones') else '')
        else:
            email = ''
            phone = ''
        
        career_objective = self.escape_latex_text(resume_data.get('career_objective', ''))
        
        # Format LinkedIn/GitHub section
        linkedin_github = ""
        # You can add LinkedIn/GitHub extraction logic here if available in your data
        
        # Format sections
        education_section = self.format_education_section(resume_data.get('education', []))
        experience_section = self.format_experience_section(resume_data.get('jobs', []))
        skills_section = self.format_skills_section(resume_data.get('skills', {}))
        
        # Format career objective section
        career_objective_section = ""
        if career_objective:
            career_objective_section = f"""
\\section{{Career Objective}}
{career_objective}
"""
        
        # Replace template variables
        replacements = {
            '{{TEMPLATE_CUSTOMIZATIONS}}': config.TEMPLATE_CUSTOMIZATIONS,
            '{{SECTION_COLOR}}': config.SECTION_COLOR,
            '{{SECTION_UNDERLINE_COLOR}}': config.SECTION_UNDERLINE_COLOR,
            '{{NAME_STYLE}}': config.NAME_STYLE,
            '{{FULL_NAME}}': full_name,
            '{{PHONE}}': phone,
            '{{EMAIL}}': email,
            '{{LINKEDIN_GITHUB_SECTION}}': linkedin_github,
            '{{CAREER_OBJECTIVE_SECTION}}': career_objective_section,
            '{{EDUCATION_SECTION}}': education_section,
            '{{EXPERIENCE_SECTION}}': experience_section,
            '{{SKILLS_SECTION}}': skills_section,
        }
        
        # Apply replacements
        for placeholder, value in replacements.items():
            template_content = template_content.replace(placeholder, value)
        
        return template_content
    
    def generate_two_column_latex_content(self, resume_data, template_id, config, template_content):
        """Generate two-column LaTeX content from resume data"""
        # Extract data with fallbacks
        first_name = self.escape_latex_text(resume_data.get('first_name', ''))
        last_name = self.escape_latex_text(resume_data.get('last_name', ''))
        full_name = f"{first_name} {last_name}".strip() or "Name Not Provided"
        
        contact = resume_data.get('contact', {})
        if isinstance(contact, dict):
            email = self.escape_latex_text(contact.get('emails', [''])[0] if contact.get('emails') else '')
            phone = self.escape_latex_text(contact.get('phones', [''])[0] if contact.get('phones') else '')
        else:
            email = ''
            phone = ''
        
        career_objective = self.escape_latex_text(resume_data.get('career_objective', ''))
        
        # Format LinkedIn/GitHub section
        linkedin_github = ""
        # You can add LinkedIn/GitHub extraction logic here if available in your data
        
        # Format sections using the same logic as single column
        education_section = self.format_education_section(resume_data.get('education', []))
        experience_section = self.format_experience_section(resume_data.get('jobs', []))
        skills_section = self.format_skills_section(resume_data.get('skills', {}))
        
        # Format career objective section
        career_objective_section = ""
        if career_objective:
            career_objective_section = f"""
\\section{{Career Objective}}
{career_objective}
"""
        
        # Replace template variables - using same logic as single column
        replacements = {
            '{{TEMPLATE_CUSTOMIZATIONS}}': config.TEMPLATE_CUSTOMIZATIONS,
            '{{SECTION_COLOR}}': config.SECTION_COLOR,
            '{{SECTION_UNDERLINE_COLOR}}': config.SECTION_UNDERLINE_COLOR,
            '{{NAME_STYLE}}': config.NAME_STYLE,
            '{{FULL_NAME}}': full_name,
            '{{PHONE}}': phone,
            '{{EMAIL}}': email,
            '{{LINKEDIN_GITHUB_SECTION}}': linkedin_github,
            '{{CAREER_OBJECTIVE_SECTION}}': career_objective_section,
            '{{EDUCATION_SECTION}}': education_section,
            '{{EXPERIENCE_SECTION}}': experience_section,
            '{{SKILLS_SECTION}}': skills_section,
        }
        
        # Apply replacements
        for placeholder, value in replacements.items():
            template_content = template_content.replace(placeholder, value)
        
        return template_content

    def compile_pdf(self, latex_content, template_id="default"):
        """Compile LaTeX content to PDF"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Write LaTeX content to file
            tex_file = temp_path / "resume.tex"
            with open(tex_file, 'w', encoding='utf-8') as f:
                f.write(latex_content)
            
            # Choose compiler based on template type
            is_two_col = self.is_two_column_template(template_id)
            primary_compiler = 'xelatex' if is_two_col else 'pdflatex'
            fallback_compiler = 'pdflatex'
            
            # List of compilers to try in order
            compilers_to_try = [primary_compiler]
            if primary_compiler != fallback_compiler:
                compilers_to_try.append(fallback_compiler)
            
            last_error = None
            
            for compiler in compilers_to_try:
                try:
                    print(f"Attempting compilation with {compiler}...")
                    
                    # Check if compiler exists
                    compiler_check = subprocess.run(['which', compiler], capture_output=True, text=True)
                    if compiler_check.returncode != 0:
                        print(f"{compiler} not found, skipping...")
                        continue
                    
                    # Compile LaTeX to PDF
                    result = subprocess.run([
                        compiler, 
                        '-output-directory', str(temp_path),
                        '-interaction=nonstopmode',
                        str(tex_file)
                    ], capture_output=True, text=True, cwd=temp_dir)
                    
                    if result.returncode == 0:
                        # Check if PDF was generated
                        pdf_file = temp_path / "resume.pdf"
                        if pdf_file.exists():
                            print(f"✅ Successfully compiled with {compiler}")
                            with open(pdf_file, 'rb') as f:
                                pdf_data = f.read()
                            return pdf_data
                        else:
                            print(f"❌ {compiler} completed but no PDF generated")
                    else:
                        print(f"❌ {compiler} compilation failed with return code {result.returncode}")
                        
                        # Read LaTeX log for debugging
                        log_file = temp_path / "resume.log"
                        log_content = ""
                        if log_file.exists():
                            with open(log_file, 'r') as f:
                                log_content = f.read()
                        
                        last_error = f"LaTeX compilation failed with {compiler}.\nSTDERR: {result.stderr}\nSTDOUT: {result.stdout}\nLog excerpt: {log_content[-1000:] if log_content else 'No log available'}"
                        
                except FileNotFoundError:
                    last_error = f"{compiler} not found on system"
                    print(f"❌ {last_error}")
                    continue
                except Exception as e:
                    last_error = f"Unexpected error with {compiler}: {str(e)}"
                    print(f"❌ {last_error}")
                    continue
            
            # If we get here, all compilers failed
            if last_error:
                raise Exception(f"All LaTeX compilation attempts failed. Last error: {last_error}\n\nGenerated LaTeX content:\n{latex_content[:2000]}...")
            else:
                raise Exception("No suitable LaTeX compiler found. Please install pdflatex or xelatex.")
    
    def generate_resume_pdf(self, resume_data, template_id="default"):
        """Main method to generate PDF from resume data"""
        try:
            # Generate LaTeX content
            latex_content = self.generate_latex_content(resume_data, template_id)
            
            # Compile to PDF
            pdf_data = self.compile_pdf(latex_content, template_id)
            
            return pdf_data
            
        except Exception as e:
            raise Exception(f"Resume generation failed: {str(e)}")
