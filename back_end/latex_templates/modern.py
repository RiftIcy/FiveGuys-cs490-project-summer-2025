# Modern Template Configuration
TEMPLATE_CUSTOMIZATIONS = """
% Modern template styling - using safer fonts
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\definecolor{modernblue}{RGB}{52, 152, 219}
\\definecolor{moderngray}{RGB}{52, 73, 94}
"""

# Colors
SECTION_COLOR = "\\color{modernblue}"
SECTION_UNDERLINE_COLOR = "\\color{modernblue}"

# Name styling
NAME_STYLE = "\\Huge \\scshape \\color{moderngray}"

# Font options
FONT_PACKAGES = "\\usepackage{helvet}"
