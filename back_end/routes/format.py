from flask import Blueprint, request, jsonify
from routes.auth_utils import require_firebase_auth
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from io import BytesIO
import base64

format_bp = Blueprint("format", __name__)

def get_template_styles(template_id, base_styles):
    """
    Get template-specific styles based on template ID.
    TP003: Build LaTeX-based formatting engine (using ReportLab for now)
    """
    if template_id == "modern":
        title_style = ParagraphStyle(
            'ModernTitle',
            parent=base_styles['Heading1'],
            fontSize=20,
            spaceAfter=15,
            alignment=0,  # Left alignment
            textColor=HexColor('#2c3e50'),
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'ModernHeading',
            parent=base_styles['Heading2'],
            fontSize=15,
            spaceAfter=8,
            spaceBefore=15,
            textColor=HexColor('#34495e'),
            fontName='Helvetica-Bold',
            borderWidth=1,
            borderColor=HexColor('#3498db'),
            borderPadding=5
        )
        
    elif template_id == "classic":
        title_style = ParagraphStyle(
            'ClassicTitle',
            parent=base_styles['Heading1'],
            fontSize=18,
            spaceAfter=12,
            alignment=1,  # Center alignment
            textColor=colors.black,
            fontName='Times-Bold'
        )
        
        heading_style = ParagraphStyle(
            'ClassicHeading',
            parent=base_styles['Heading2'],
            fontSize=14,
            spaceAfter=6,
            spaceBefore=12,
            textColor=colors.black,
            fontName='Times-Bold'
        )
        
    elif template_id == "creative":
        title_style = ParagraphStyle(
            'CreativeTitle',
            parent=base_styles['Heading1'],
            fontSize=22,
            spaceAfter=18,
            alignment=0,  # Left alignment
            textColor=HexColor('#e74c3c'),
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CreativeHeading',
            parent=base_styles['Heading2'],
            fontSize=16,
            spaceAfter=8,
            spaceBefore=15,
            textColor=HexColor('#9b59b6'),
            fontName='Helvetica-Bold',
            leftIndent=10
        )
        
    else:  # default template
        title_style = ParagraphStyle(
            'DefaultTitle',
            parent=base_styles['Heading1'],
            fontSize=18,
            spaceAfter=12,
            alignment=1,  # Center alignment
            textColor=colors.black
        )
        
        heading_style = ParagraphStyle(
            'DefaultHeading',
            parent=base_styles['Heading2'],
            fontSize=14,
            spaceAfter=6,
            spaceBefore=12,
            textColor=colors.black
        )
    
    return {
        'title_style': title_style,
        'heading_style': heading_style
    }

@format_bp.route("/format_resume", methods=["POST"])
@require_firebase_auth
def format_resume():
    """
    Format resume data into a PDF and return download URL.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON payload"}), 400
        
        resume_data = data.get("resume_data")
        completed_resume_id = data.get("completed_resume_id")
        job_title = data.get("job_title", "Resume")
        template_id = data.get("template_id", "default")  # Default template if not specified
        
        if not resume_data:
            return jsonify({"error": "Missing resume_data"}), 400
        
        # Generate PDF
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer, 
            pagesize=letter, 
            rightMargin=72, leftMargin=72, 
            topMargin=72, bottomMargin=18,
            title=job_title,
            author=f"{resume_data.get('first_name','')} {resume_data.get('last_name','')}".strip() or "Resume Generator",
        )
        
        # Build PDF content
        story = []
        styles = getSampleStyleSheet()
        
        # Get template-specific styles
        template_styles = get_template_styles(template_id, styles)
        title_style = template_styles['title_style']
        heading_style = template_styles['heading_style']
        
        # Name
        if resume_data.get("first_name") or resume_data.get("last_name"):
            name = f"{resume_data.get('first_name', '')} {resume_data.get('last_name', '')}".strip()
            story.append(Paragraph(name, title_style))
            story.append(Spacer(1, 12))
        
        # Contact Information
        contact = resume_data.get("contact", {})
        if contact:
            story.append(Paragraph("Contact Information", heading_style))
            
            # Handle different contact field structures
            if isinstance(contact, dict):
                for key, value in contact.items():
                    if value:
                        label = key.replace('_', ' ').title()
                        if isinstance(value, list):
                            value_str = ', '.join(str(v) for v in value)
                        else:
                            value_str = str(value)
                        story.append(Paragraph(f"<b>{label}:</b> {value_str}", styles['Normal']))
            
            story.append(Spacer(1, 12))
        
        # Career Objective
        if resume_data.get("career_objective"):
            story.append(Paragraph("Career Objective", heading_style))
            story.append(Paragraph(resume_data["career_objective"], styles['Normal']))
            story.append(Spacer(1, 12))
        
        # Skills
        skills = resume_data.get("skills", {})
        if skills:
            story.append(Paragraph("Skills", heading_style))
            if isinstance(skills, dict):
                for category, skill_list in skills.items():
                    if skill_list:
                        if isinstance(skill_list, list):
                            skills_text = f"<b>{category.replace('_', ' ').title()}:</b> {', '.join(skill_list)}"
                        else:
                            skills_text = f"<b>{category.replace('_', ' ').title()}:</b> {skill_list}"
                        story.append(Paragraph(skills_text, styles['Normal']))
            elif isinstance(skills, list):
                story.append(Paragraph(', '.join(skills), styles['Normal']))
            else:
                story.append(Paragraph(str(skills), styles['Normal']))
            story.append(Spacer(1, 12))
        
        # Professional Experience
        jobs = resume_data.get("jobs", [])
        if jobs and isinstance(jobs, list):
            story.append(Paragraph("Professional Experience", heading_style))
            for job in jobs:
                # Job title and company
                job_title = job.get("title") or job.get("position", "")
                company = job.get("company", "")
                if job_title and company:
                    story.append(Paragraph(f"<b>{job_title}</b> - {company}", styles['Normal']))
                elif job_title:
                    story.append(Paragraph(f"<b>{job_title}</b>", styles['Normal']))
                elif company:
                    story.append(Paragraph(f"<b>{company}</b>", styles['Normal']))
                
                # Location and dates
                location = job.get("location", "")
                start_date = job.get("start_date", "")
                end_date = job.get("end_date", "Present")
                
                date_location = []
                if location:
                    date_location.append(location)
                if start_date or end_date:
                    date_location.append(f"{start_date} - {end_date}")
                
                if date_location:
                    story.append(Paragraph(" | ".join(date_location), styles['Normal']))
                
                # Role summary
                role_summary = job.get("role_summary") or job.get("summary") or job.get("description")
                if role_summary:
                    story.append(Paragraph(f"<i>{role_summary}</i>", styles['Normal']))
                
                # Responsibilities
                responsibilities = job.get("responsibilities", [])
                if responsibilities and isinstance(responsibilities, list):
                    for resp in responsibilities:
                        story.append(Paragraph(f"• {resp}", styles['Normal']))
                
                # Accomplishments
                accomplishments = job.get("accomplishments", [])
                if accomplishments and isinstance(accomplishments, list):
                    for acc in accomplishments:
                        story.append(Paragraph(f"• {acc}", styles['Normal']))
                
                story.append(Spacer(1, 12))
        
        # Education
        education = resume_data.get("education", [])
        if education and isinstance(education, list):
            story.append(Paragraph("Education", heading_style))
            for edu in education:
                institution = edu.get("institution") or edu.get("school", "")
                degree = edu.get("degree", "")
                
                if degree and institution:
                    story.append(Paragraph(f"<b>{degree}</b> - {institution}", styles['Normal']))
                elif degree:
                    story.append(Paragraph(f"<b>{degree}</b>", styles['Normal']))
                elif institution:
                    story.append(Paragraph(f"<b>{institution}</b>", styles['Normal']))
                
                # Dates
                start_date = edu.get("start_date", "")
                end_date = edu.get("end_date") or edu.get("graduation_date", "")
                if start_date or end_date:
                    story.append(Paragraph(f"{start_date} - {end_date}", styles['Normal']))
                
                # GPA
                gpa = edu.get("gpa") or edu.get("GPA")
                if gpa:
                    story.append(Paragraph(f"GPA: {gpa}", styles['Normal']))
                
                story.append(Spacer(1, 12))
        
        # Build the PDF
        doc.build(story)
        
        # Get PDF bytes
        pdf_bytes = pdf_buffer.getvalue()
        pdf_buffer.close()
        
        # Return PDF as base64 data URL for immediate download
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        download_url = f"data:application/pdf;base64,{pdf_base64}"
        
        # Create filename from job title
        safe_job_title = job_title.replace(' ', '_').replace('/', '_').replace('\\', '_')
        filename = f"{safe_job_title}.pdf"
        
        return jsonify({
            "message": "Resume formatted successfully",
            "downloadUrl": download_url,
            "filename": filename
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to format resume: {str(e)}"}), 500