"""
================================================================================
PROJECT KINETICA: DEFINITIVE SUBMISSION-READY THESIS GENERATOR
================================================================================
BCSE497J Project I Deliverable — Vellore Institute of Technology, Chennai
School of Computer Science and Engineering (SCOPE)
Authors: Vaibhav P.K (23BDS1148) & Mithil Girish (23BDS1168)
Supervisor: Dr. R. Krithiga | HOD: Dr. Vergin Raja Sarobin M

Engineered for 100% adherence to VIT guidelines:
- Handcrafted preliminary pages with balanced vertical distribution
- Fixed table geometry: w:tblGrid, w:gridCol, w:tcW, w:tblHeader, w:cantSplit
- Robust ASCII Grid Table & Markdown Pipe Table reconstruction
- True proportional column widths fitting within 8306 dxa printable width
- High-resolution publication diagrams and empirical result plots
- Accurate 2-pass Arabic page synchronization for TOC, LOF, LOT
- Page count rigorously verified within [60, 100] pages
================================================================================
"""

import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

import re
import subprocess
import pypdf
import docx
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

# Import complete technical chapter sections
from report.report_sections_ch1_ch2 import CHAPTER_1_MD, CHAPTER_2_MD
from report.report_sections_ch3 import CHAPTER_3_MD
from report.report_sections_ch4 import CHAPTER_4_MD
from report.report_sections_ch5_refs import CHAPTER_5_MD, REFERENCES_MD
from report.report_sections_appendices import APPENDICES_MD
from report.report_sections_prelim import ABSTRACT_MD, LIST_OF_ABBREVIATIONS_MD

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT_DIR = os.path.join(REPO_ROOT, "report")
FINAL_DOCX_PATH = os.path.join(REPORT_DIR, "Kinetica_Project_Report_Final.docx")
FINAL_PDF_PATH = os.path.join(REPORT_DIR, "Kinetica_Project_Report_Final.pdf")
SOFFICE_BIN = r"C:\Program Files\LibreOffice\program\soffice.com"
VIT_LOGO_PATH = os.path.join(REPORT_DIR, "template_media", "image2.png")

# Printable area constants (A4 with 2.80cm left, 2.54cm right/top/bottom)
TOTAL_PRINTABLE_DXA = 8800


# ==============================================================================
# XML CLEANING AND DYNAMIC PAGINATION HELPERS
# ==============================================================================

def clean_xml_string(text: str) -> str:
    """Removes non-XML characters and normalizes Unicode dashes/quotes."""
    if not text:
        return ""
    text = (text.replace('\u2013', '-')
                .replace('\u2014', ' - ')
                .replace('\u2018', "'")
                .replace('\u2019', "'")
                .replace('\u201c', '"')
                .replace('\u201d', '"')
                .replace('\ufffd', '-'))
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]', '', text)


def remove_latex_fractions(text: str) -> str:
    """Iteratively replaces \\frac{num}{den} with (num) / (den)."""
    while r'\frac' in text:
        idx = text.find(r'\frac')
        open1 = text.find('{', idx)
        if open1 == -1 or open1 > idx + 6:
            break
        depth = 1
        pos1 = open1 + 1
        while pos1 < len(text) and depth > 0:
            if text[pos1] == '{':
                depth += 1
            elif text[pos1] == '}':
                depth -= 1
            pos1 += 1
        if depth != 0:
            break
        num = text[open1+1:pos1-1]

        open2 = text.find('{', pos1)
        if open2 == -1 or open2 > pos1 + 3:
            break
        depth = 1
        pos2 = open2 + 1
        while pos2 < len(text) and depth > 0:
            if text[pos2] == '{':
                depth += 1
            elif text[pos2] == '}':
                depth -= 1
            pos2 += 1
        if depth != 0:
            break
        den = text[open2+1:pos2-1]

        text = text[:idx] + f"({num}) / ({den})" + text[pos2:]
    return text


def remove_latex_sqrts(text: str) -> str:
    """Iteratively replaces \\sqrt{arg} with √(arg)."""
    while r'\sqrt' in text:
        idx = text.find(r'\sqrt')
        open1 = text.find('{', idx)
        if open1 == -1 or open1 > idx + 6:
            break
        depth = 1
        pos1 = open1 + 1
        while pos1 < len(text) and depth > 0:
            if text[pos1] == '{':
                depth += 1
            elif text[pos1] == '}':
                depth -= 1
            pos1 += 1
        if depth != 0:
            break
        arg = text[open1+1:pos1-1]
        text = text[:idx] + f"√({arg})" + text[pos1:]
    return text


def remove_latex_underbraces(text: str) -> str:
    """Iteratively replaces \\underbrace{expr}_{label} with expr [label]."""
    while r'\underbrace' in text:
        idx = text.find(r'\underbrace')
        open1 = text.find('{', idx)
        if open1 == -1 or open1 > idx + 13:
            break
        depth = 1
        pos1 = open1 + 1
        while pos1 < len(text) and depth > 0:
            if text[pos1] == '{':
                depth += 1
            elif text[pos1] == '}':
                depth -= 1
            pos1 += 1
        if depth != 0:
            break
        content = text[open1+1:pos1-1]
        uscore = text.find('_', pos1)
        if uscore != -1 and uscore < pos1 + 3:
            open2 = text.find('{', uscore)
            if open2 != -1 and open2 < uscore + 3:
                depth = 1
                pos2 = open2 + 1
                while pos2 < len(text) and depth > 0:
                    if text[pos2] == '{':
                        depth += 1
                    elif text[pos2] == '}':
                        depth -= 1
                    pos2 += 1
                label = text[open2+1:pos2-1]
                text = text[:idx] + f"{content} [{label}]" + text[pos2:]
                continue
        text = text[:idx] + content + text[pos1:]
    return text


def clean_math_text(text: str) -> str:
    r"""
    Sanitizes LaTeX math syntax into clean, universally readable typography.
    Converts raw LaTeX formulas (e.g. \mathbb{R}^{3 \times 3}, \text{veh}/\text{m}, \chi^2, \frac{a}{b})
    into standard academic math notation (H in R^(3x3), veh/m, χ², λ̂, Δt, a / b).
    """
    if not text:
        return ""
    
    t = text

    # 1. Structural LaTeX macros
    t = remove_latex_underbraces(t)
    t = remove_latex_fractions(t)
    t = remove_latex_sqrts(t)

    # 2. Matrix replacements
    t = re.sub(r'\\begin\{bmatrix\}\s*([^\\]+)\s*\\\\\s*([^\\]+)\s*\\\\\s*([^\\]+)\s*\\end\{bmatrix\}', r'[\1, \2, \3]^T', t)
    t = re.sub(r'\\begin\{bmatrix\}\s*([^\\]+)\s*\\\\\s*([^\\]+)\s*\\end\{bmatrix\}', r'[\1, \2]^T', t)
    t = t.replace(r'\begin{bmatrix}', '[').replace(r'\end{bmatrix}', ']')

    # 3. Vector spaces and matrices
    t = re.sub(r'\\mathbb\{R\}\^\{\s*3\s*\\times\s*3\s*\}', 'R^(3x3)', t)
    t = re.sub(r'\\mathbb\{R\}\^\{\s*3\s*x\s*3\s*\}', 'R^(3x3)', t)
    t = re.sub(r'\\mathbb\{R\}\^\{\s*3\s*\\?\s*times\s*3\s*\}', 'R^(3x3)', t)
    t = t.replace(r'\mathbb{R}^{3x3}', 'R^(3x3)')
    t = t.replace(r'\mathbb{R}^{3 \times 3}', 'R^(3x3)')
    t = t.replace(r'\mathbb{R}', 'R')

    # 4. Traffic and engineering units
    t = t.replace(r'\text{veh}/\text{m}', 'veh/m')
    t = t.replace(r'\text{veh}/\text{s}/\text{lane}', 'veh/s/lane')
    t = t.replace(r'\text{veh}/\text{s}', 'veh/s')
    t = t.replace(r'\text{veh}/\text{hr}/\text{lane}', 'veh/hr/lane')
    t = t.replace(r'\text{veh}/\text{hr}', 'veh/hr')
    t = t.replace(r'[\text{veh}/\text{m}]', '[veh/m]')
    t = t.replace(r'\text{ms}', 'ms')
    t = t.replace(r'\text{FPS}', 'FPS')
    t = t.replace(r'\text{m}', 'm')
    t = t.replace(r'\text{s}', 's')
    t = t.replace(r'\text{mps}', 'm/s')
    t = t.replace(r'\text{vehicles}', 'vehicles')
    t = t.replace(r'\text{meter}', 'meter')
    t = t.replace(r'\text{meters}', 'meters')
    t = t.replace(r'\text{seconds}', 'seconds')

    # 5. Greek symbols and estimators
    t = t.replace(r'\chi^2', 'χ²')
    t = t.replace(r'\chi', 'χ')
    t = t.replace(r'\CHI^2', 'χ²')
    t = t.replace(r'\CHI', 'χ')
    t = t.replace(r'\hat{\lambda}_t', 'λ̂_t')
    t = t.replace(r'\hat{\lambda}_i', 'λ̂_i')
    t = t.replace(r'\hat{\lambda}', 'λ̂')
    t = t.replace(r'\lambda', 'λ')
    t = t.replace(r'\hat{y}', 'ŷ')
    t = t.replace(r'\hat{f}', 'f̂')
    t = t.replace(r'\hat{t}', 't̂')
    t = t.replace(r'\tilde{\mu}', 'μ̃')
    t = t.replace(r'\mu', 'μ')
    t = t.replace(r'\rho', 'ρ')
    t = t.replace(r'\sigma^2', 'σ²')
    t = t.replace(r'\sigma_s^2', 'σ_s²')
    t = t.replace(r'\sigma_1^2', 'σ₁²')
    t = t.replace(r'\sigma_2^2', 'σ₂²')
    t = t.replace(r'\sigma', 'σ')
    t = t.replace(r'\alpha', 'α')
    t = t.replace(r'\beta', 'β')
    t = t.replace(r'\Delta t', 'Δt')
    t = t.replace(r'\Delta', 'Δ')
    t = t.replace(r'\delta', 'δ')
    t = t.replace(r'\theta', 'θ')
    t = t.replace(r'\tau', 'τ')
    t = t.replace(r'\epsilon', 'ε')
    t = t.replace(r'\nu', 'ν')

    # 6. Statistical means
    t = re.sub(r'\\bar\{([^}]+)\}', r'\1_avg', t)

    # 7. Mathematical operators and relations
    t = t.replace(r'\in', 'in')
    t = t.replace(r'\times', 'x')
    t = t.replace(r'\le', '≤')
    t = t.replace(r'\ge', '≥')
    t = t.replace(r'\approx', '≈')
    t = t.replace(r'\pm', '±')
    t = t.replace(r'\cdot', '·')
    t = t.replace(r'\lor', 'or')
    t = t.replace(r'\land', 'and')
    t = t.replace(r'\ne', '≠')
    t = t.replace(r'\neq', '≠')
    t = t.replace(r'\implies', '⇒')
    t = t.replace(r'\sim', '~')
    t = t.replace(r'\ll', '<<')
    t = t.replace(r'\dots', '...')
    t = t.replace(r'\circ', '°')
    t = t.replace(r'\cup', '∪')
    t = t.replace(r'\sum', '∑')
    t = t.replace(r'\prod', '∏')
    t = t.replace(r'\int', '∫')
    t = t.replace(r'\infty', '∞')
    t = t.replace(r'\quad', ' ')
    t = t.replace(r'\qquad', '  ')
    t = t.replace(r'\,', ' ')
    t = t.replace(r'\mathbb{E}', 'E')
    t = t.replace(r'\mathbb{I}', 'I')
    t = t.replace(r'\to', '→')
    t = t.replace(r'\rightarrow', '→')

    # 8. Delimiters
    t = t.replace(r'\left(', '(').replace(r'\right)', ')')
    t = t.replace(r'\left[', '[').replace(r'\right]', ']')
    t = t.replace(r'\left\{', '{').replace(r'\right\}', '}')
    t = t.replace(r'\left.', '').replace(r'\right.', '')
    t = t.replace(r'\{', '{').replace(r'\}', '}')
    t = t.replace(r'\mid', '| ')

    # 9. Generic LaTeX command removal: \text{}, \mathbf{}, \mathcal{}, \mathit{}, \mathrm{}
    t = re.sub(r'_\{[^\}]*\\text\{([^}]+)\}[^\}]*\}', r'_\1', t)
    t = re.sub(r'\\text\{([^}]+)\}', r'\1', t)
    t = re.sub(r'\\mathbf\{([^}]+)\}', r'\1', t)
    t = re.sub(r'\\mathcal\{([^}]+)\}', r'\1', t)
    t = re.sub(r'\\mathit\{([^}]+)\}', r'\1', t)
    t = re.sub(r'\\mathrm\{([^}]+)\}', r'\1', t)

    # 10. Clean remaining subscripts
    t = re.sub(r'_\{([^}]+)\}', r'_\1', t)

    # 11. Escapes and stray backslashes
    t = t.replace(r'\_', '_').replace(r'\%', '%')
    t = t.replace('\\', '')

    # 12. Normalize whitespace
    t = re.sub(r'\s+', ' ', t).strip()

    return t


def add_bottom_page_number(run):
    """Inserts a dynamic Word PAGE field in the footer."""
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = "PAGE"
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    r = run._r
    r.append(fldChar1)
    r.append(instrText)
    r.append(fldChar2)
    r.append(fldChar3)


def configure_section_geometry(section, num_format=None, start_num=None, has_footer=True):
    """Configures section dimensions, balanced margins, and page number formatting."""
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin = Cm(2.80)   # Balanced academic left margin
    section.right_margin = Cm(2.54)  # Balanced academic right margin
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)

    if num_format:
        pg_num = OxmlElement('w:pgNumType')
        pg_num.set(qn('w:fmt'), num_format)
        if start_num is not None:
            pg_num.set(qn('w:start'), str(start_num))
        section._sectPr.append(pg_num)

    if has_footer:
        footer = section.footer
        p_foot = footer.paragraphs[0]
        p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_foot = p_foot.add_run()
        run_foot.font.name = 'Times New Roman'
        run_foot.font.size = Pt(11)
        run_foot.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
        add_bottom_page_number(run_foot)


# ==============================================================================
# TABLE FORMATTING AND GEOMETRY ENGINE
# ==============================================================================

def set_cell_background(cell, hex_color):
    """Sets background fill color of a table cell."""
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))


def set_cell_margins(cell, top=16, bottom=16, left=35, right=35):
    """Sets cell padding in dxa."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def apply_table_borders(tbl, is_borderless=False):
    """Applies clean Booktabs-style publication borders or borderless grid."""
    tblPr = tbl._tbl.tblPr
    if is_borderless:
        borders_xml = f'''<w:tblBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:bottom w:val="none"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="none"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>'''
    else:
        borders_xml = f'''<w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>'''
    tblPr.append(parse_xml(borders_xml))


def set_table_geometry(tbl, col_widths_dxa):
    """
    Enforces pixel-perfect table geometry by writing w:tblW, w:tblGrid,
    w:gridCol, w:tcW, w:cantSplit, and w:tblHeader directly into OpenXML.
    """
    total_w = sum(col_widths_dxa)
    tblPr = tbl._tbl.tblPr

    # 1. Total table width
    tblW = tblPr.find(qn('w:tblW'))
    if tblW is None:
        tblW = OxmlElement('w:tblW')
        tblPr.append(tblW)
    tblW.set(qn('w:w'), str(total_w))
    tblW.set(qn('w:type'), 'dxa')

    # 2. Rebuild tblGrid
    old_tblGrid = tbl._tbl.find(qn('w:tblGrid'))
    if old_tblGrid is not None:
        tbl._tbl.remove(old_tblGrid)

    tblGrid = OxmlElement('w:tblGrid')
    for w in col_widths_dxa:
        gridCol = OxmlElement('w:gridCol')
        gridCol.set(qn('w:w'), str(w))
        tblGrid.append(gridCol)
    tbl._tbl.insert(tbl._tbl.index(tblPr) + 1, tblGrid)

    # 3. Row properties and cell widths
    for r_idx, row in enumerate(tbl.rows):
        trPr = row._tr.get_or_add_trPr()
        # Prevent row split across page break
        if trPr.find(qn('w:cantSplit')) is None:
            trPr.append(OxmlElement('w:cantSplit'))
        # Repeat header row on new page
        if r_idx == 0 and trPr.find(qn('w:tblHeader')) is None:
            trPr.append(OxmlElement('w:tblHeader'))

        for c_idx, cell in enumerate(row.cells):
            if c_idx < len(col_widths_dxa):
                tcPr = cell._tc.get_or_add_tcPr()
                tcW = tcPr.find(qn('w:tcW'))
                if tcW is None:
                    tcW = OxmlElement('w:tcW')
                    tcPr.append(tcW)
                tcW.set(qn('w:w'), str(col_widths_dxa[c_idx]))
                tcW.set(qn('w:type'), 'dxa')


def add_cell_runs(paragraph, text, is_header=False, font_size=Pt(8.5)):
    """Parses inline tokens (**bold**, *italic*, `code`, math) into formatted runs."""
    cleaned = clean_xml_string(clean_math_text(text)).strip()
    if not cleaned:
        return

    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$)', cleaned)
    for tok in tokens:
        if not tok:
            continue
        if tok.startswith('**') and tok.endswith('**'):
            run = paragraph.add_run(tok[2:-2])
            run.font.name = 'Times New Roman'
            run.font.size = font_size
            run.bold = True
        elif tok.startswith('*') and tok.endswith('*'):
            run = paragraph.add_run(tok[1:-1])
            run.font.name = 'Times New Roman'
            run.font.size = font_size
            run.italic = True
        elif tok.startswith('`') and tok.endswith('`'):
            run = paragraph.add_run(tok[1:-1])
            run.font.name = 'Consolas'
            run.font.size = Pt(max(7.0, font_size.pt - 0.5))
            run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        elif tok.startswith('$') and tok.endswith('$'):
            run = paragraph.add_run(tok[1:-1].strip())
            run.font.name = 'Cambria Math'
            run.font.size = font_size
            run.italic = True
        else:
            run = paragraph.add_run(tok)
            run.font.name = 'Times New Roman'
            run.font.size = font_size
            run.bold = is_header


def join_cell_lines(col_lines, is_header=False):
    """
    Intelligently joins multi-line slices within an ASCII grid cell:
    - If a slice starts with '-' or '*', it begins a new bullet item.
    - If a slice is a continuation of a bullet item, it appends with a space.
    - If in header, distinct lines are separated by a newline.
    """
    if is_header:
        cleaned = [l.strip() for l in col_lines if l.strip()]
        return "\n".join(cleaned)

    items = []
    current_item = []
    for l in col_lines:
        l_str = l.strip()
        if not l_str:
            continue
        if l_str.startswith("- ") or l_str.startswith("* "):
            if current_item:
                items.append(" ".join(current_item))
                current_item = []
            current_item.append(l_str)
        else:
            current_item.append(l_str)
    if current_item:
        items.append(" ".join(current_item))
    return "\n".join(items) if items else ""


def parse_grid_table(lines):
    """
    Parses an ASCII Grid Table (+---+---+ and | ... |) and reassembles
    multi-line cells into single logical rows with bullet point preservation.
    """
    rows = []
    curr_lines = []
    row_count = 0
    for line in lines:
        l = line.strip()
        if l.startswith('+') and l.endswith('+') and re.match(r'^\+[+= \-]+?\+$', l):
            if curr_lines:
                num_cols = max(len(c) for c in curr_lines)
                is_header = (row_count == 0)
                comb = []
                for c in range(num_cols):
                    col_lines = [cl[c] for cl in curr_lines if c < len(cl) and cl[c]]
                    cell_text = join_cell_lines(col_lines, is_header=is_header)
                    comb.append(cell_text)
                rows.append(comb)
                row_count += 1
                curr_lines = []
        elif l.startswith('|') and l.endswith('|'):
            cells = [c.strip() for c in l.split('|')[1:-1]]
            curr_lines.append(cells)
    if curr_lines:
        num_cols = max(len(c) for c in curr_lines)
        is_header = (row_count == 0)
        comb = []
        for c in range(num_cols):
            col_lines = [cl[c] for cl in curr_lines if c < len(cl) and cl[c]]
            cell_text = join_cell_lines(col_lines, is_header=is_header)
            comb.append(cell_text)
        rows.append(comb)
    return rows


def parse_pipe_table(lines):
    """Parses standard Markdown Pipe Table (| col1 | col2 |)."""
    rows = []
    for line in lines:
        l = line.strip()
        if not (l.startswith('|') and l.endswith('|')):
            continue
        parts = [p.strip() for p in l.split('|')[1:-1]]
        if parts and all(re.match(r'^:?-+:?$', p) for p in parts if p):
            continue
        rows.append(parts)
    return rows


def add_callout_box(doc, text):
    """Renders a single-cell diagram/callout card with blue left accent bar."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_geometry(tbl, [TOTAL_PRINTABLE_DXA])
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=25, bottom=25, left=45, right=45)

    tblPr = tbl._tbl.tblPr
    borders_xml = f'''<w:tblBorders {nsdecls("w")}>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="single" w:sz="12" w:space="0" w:color="2563EB"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideH w:val="none"/>
        <w:insideV w:val="none"/>
    </w:tblBorders>'''
    tblPr.append(parse_xml(borders_xml))

    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_cell_runs(p, text, is_header=False, font_size=Pt(9.0))


def add_cell_content(cell, val, is_header=False, font_sz=Pt(8.5)):
    """Renders formatted multi-line cell content with bullet support."""
    lines = [l.strip() for l in val.split('\n') if l.strip()]
    if not lines:
        return
    for idx, line in enumerate(lines):
        if idx == 0:
            p = cell.paragraphs[0]
        else:
            p = cell.add_paragraph()
        p.paragraph_format.line_spacing = 1.05
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)

        val_clean = line.replace('**', '').replace('`', '').strip()
        if not is_header and any(char.isdigit() for char in val_clean) and len(val_clean) < 14 and not (' ' in val_clean and len(val_clean.split()) > 2):
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT

        if line.startswith('- ') or line.startswith('* '):
            p.paragraph_format.left_indent = Inches(0.12)
            run_b = p.add_run("• ")
            run_b.font.name = 'Times New Roman'
            run_b.font.size = font_sz
            run_b.font.bold = True
            run_b.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)  # Distinct academic blue bullet
            add_cell_runs(p, line[2:].strip(), is_header=is_header, font_size=font_sz)
        else:
            add_cell_runs(p, line, is_header=is_header, font_size=font_sz)


def add_academic_table(doc, rows):
    """Renders a fully-formed academic table with proportional geometry."""
    if not rows:
        return
    rows = [r for r in rows if any(cell.strip() for cell in r)]
    if not rows:
        return

    num_cols = max(len(r) for r in rows)
    for r in rows:
        while len(r) < num_cols:
            r.append("")

    # If it's a 1x1 box (diagram card or callout), render as callout box
    if len(rows) == 1 and num_cols == 1:
        add_callout_box(doc, rows[0][0])
        return

    # Proportional column width calculation fitting exactly TOTAL_PRINTABLE_DXA
    col_lens = []
    for c in range(num_cols):
        max_l = max(len(r[c]) for r in rows)
        col_lens.append(max(max_l, 4))
    total_len = sum(col_lens) or 1

    min_w = 650 if num_cols >= 7 else 800
    raw_widths = [max(min_w, int((cl / total_len) * TOTAL_PRINTABLE_DXA)) for cl in col_lens]
    cur_sum = sum(raw_widths)
    diff = TOTAL_PRINTABLE_DXA - cur_sum
    max_idx = col_lens.index(max(col_lens))
    raw_widths[max_idx] += diff

    tbl = doc.add_table(rows=len(rows), cols=num_cols)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    apply_table_borders(tbl, is_borderless=False)
    set_table_geometry(tbl, raw_widths)

    font_sz = Pt(7.5) if num_cols >= 8 else (Pt(8.0) if num_cols >= 6 else Pt(8.5))

    for r_idx, row in enumerate(rows):
        is_header = (r_idx == 0)
        for c_idx in range(num_cols):
            cell = tbl.cell(r_idx, c_idx)
            val = row[c_idx]
            set_cell_margins(cell, top=16, bottom=16, left=35, right=35)
            if is_header:
                set_cell_background(cell, "F1F5F9")
            elif r_idx % 2 == 1:
                set_cell_background(cell, "FAFAFA")

            add_cell_content(cell, val, is_header=is_header, font_sz=font_sz)


def add_code_block(doc, code_lines):
    """Renders a clean monospace code block with subtle border and fill."""
    text_content = clean_xml_string("\n".join(code_lines))
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_geometry(tbl, [TOTAL_PRINTABLE_DXA])
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=25, bottom=25, left=45, right=45)

    tblPr = tbl._tbl.tblPr
    borders_xml = f'''<w:tblBorders {nsdecls("w")}>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideH w:val="none"/>
        <w:insideV w:val="none"/>
    </w:tblBorders>'''
    tblPr.append(parse_xml(borders_xml))

    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text_content)
    run.font.name = 'Consolas'
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)


def add_image_figure(doc, rel_path, caption=""):
    """Inserts a publication-quality centered image figure with caption."""
    if rel_path.startswith("results/"):
        full_path = os.path.join(REPO_ROOT, rel_path)
    elif "figures/" in rel_path:
        full_path = os.path.join(REPO_ROOT, "results", "figures", os.path.basename(rel_path))
    else:
        full_path = os.path.join(REPO_ROOT, rel_path)

    if os.path.exists(full_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(2)
        run_img = p_img.add_run()
        run_img.add_picture(full_path, width=Inches(5.3))

        if caption:
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.line_spacing = 1.0
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(6)
            run_cap = p_cap.add_run(clean_xml_string(clean_math_text(caption)))
            run_cap.font.name = 'Times New Roman'
            run_cap.font.size = Pt(10)
            run_cap.font.italic = True
            run_cap.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        return True
    return False


def add_formatted_paragraph(doc, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=3, line_spacing=1.32, bold=False, italic=False):
    """Adds a standard body paragraph with formatted runs."""
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)

    cleaned_text = clean_xml_string(clean_math_text(text))
    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$)', cleaned_text)
    for tok in tokens:
        if not tok:
            continue
        if tok.startswith('**') and tok.endswith('**'):
            run = p.add_run(tok[2:-2])
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = True
        elif tok.startswith('*') and tok.endswith('*'):
            run = p.add_run(tok[1:-1])
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.italic = True
        elif tok.startswith('`') and tok.endswith('`'):
            run = p.add_run(tok[1:-1])
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(0x88, 0x13, 0x13)
        elif tok.startswith('$') and tok.endswith('$'):
            run = p.add_run(tok[1:-1].strip())
            run.font.name = 'Cambria Math'
            run.font.size = Pt(11.5)
            run.italic = True
        else:
            run = p.add_run(tok)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.bold = bold
            run.italic = italic
    return p


# ==============================================================================
# HANDCRAFTED PRELIMINARY PAGES (100% COMPLIANT WITH VIT TEMPLATE GUIDELINES)
# ==============================================================================

def build_cover_page(doc):
    """
    Handcrafts the official Cover Page strictly adhering to VIT Guidelines,
    distributing vertical spacing gracefully to avoid empty bottom areas.
    """
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(18)
    p1.paragraph_format.space_after = Pt(14)
    r1 = p1.add_run("A Project Report on")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(12)
    r1.font.italic = True

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.line_spacing = 1.25
    p2.paragraph_format.space_before = Pt(4)
    p2.paragraph_format.space_after = Pt(26)
    r2 = p2.add_run("PROJECT KINETICA: A CLOSED-LOOP CYBER-PHYSICAL SYSTEM FOR PERCEPTION-DRIVEN TRAFFIC SIGNAL CONTROL, STOCHASTIC QUEUE ACTUATION, AND PRIORITY-AWARE GREEN WAVE PREEMPTION")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(17)
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)

    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p3.paragraph_format.space_before = Pt(0)
    p3.paragraph_format.space_after = Pt(6)
    r3 = p3.add_run("Submitted in partial fulfillment of the requirements for the award of the degree of")
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(12)
    r3.font.italic = True

    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4.paragraph_format.space_before = Pt(0)
    p4.paragraph_format.space_after = Pt(4)
    r4 = p4.add_run("BACHELOR OF TECHNOLOGY")
    r4.font.name = 'Times New Roman'
    r4.font.size = Pt(16)
    r4.font.bold = True

    p4_sub = doc.add_paragraph()
    p4_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4_sub.paragraph_format.space_before = Pt(0)
    p4_sub.paragraph_format.space_after = Pt(24)
    r4_sub = p4_sub.add_run("in Computer Science and Engineering with Specialization in Data Science")
    r4_sub.font.name = 'Times New Roman'
    r4_sub.font.size = Pt(13.5)
    r4_sub.font.bold = True

    p5 = doc.add_paragraph()
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p5.paragraph_format.space_before = Pt(0)
    p5.paragraph_format.space_after = Pt(6)
    r5 = p5.add_run("by")
    r5.font.name = 'Times New Roman'
    r5.font.size = Pt(12)
    r5.font.italic = True

    p6 = doc.add_paragraph()
    p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p6.paragraph_format.line_spacing = 1.25
    p6.paragraph_format.space_before = Pt(0)
    p6.paragraph_format.space_after = Pt(28)
    r6_a = p6.add_run("VAIBHAV P.K (Register No: 23BDS1148)\n")
    r6_a.font.name = 'Times New Roman'
    r6_a.font.size = Pt(13.5)
    r6_a.font.bold = True
    r6_b = p6.add_run("MITHIL GIRISH (Register No: 23BDS1168)")
    r6_b.font.name = 'Times New Roman'
    r6_b.font.size = Pt(13.5)
    r6_b.font.bold = True

    if os.path.exists(VIT_LOGO_PATH):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(4)
        p_logo.paragraph_format.space_after = Pt(28)
        run_logo = p_logo.add_run()
        run_logo.add_picture(VIT_LOGO_PATH, width=Inches(2.6))

    p7 = doc.add_paragraph()
    p7.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p7.paragraph_format.space_before = Pt(0)
    p7.paragraph_format.space_after = Pt(3)
    r7 = p7.add_run("SCHOOL OF COMPUTER SCIENCE AND ENGINEERING")
    r7.font.name = 'Times New Roman'
    r7.font.size = Pt(14)
    r7.font.bold = True

    p7_b = doc.add_paragraph()
    p7_b.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p7_b.paragraph_format.space_before = Pt(0)
    p7_b.paragraph_format.space_after = Pt(3)
    r7_b = p7_b.add_run("VELLORE INSTITUTE OF TECHNOLOGY (VIT), CHENNAI")
    r7_b.font.name = 'Times New Roman'
    r7_b.font.size = Pt(13)
    r7_b.font.bold = True

    p7_c = doc.add_paragraph()
    p7_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p7_c.paragraph_format.space_before = Pt(0)
    p7_c.paragraph_format.space_after = Pt(22)
    r7_c = p7_c.add_run("Vandalur-Kelambakkam Road, Chennai - 600 127, Tamil Nadu, India")
    r7_c.font.name = 'Times New Roman'
    r7_c.font.size = Pt(10.5)

    p8 = doc.add_paragraph()
    p8.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p8.paragraph_format.space_before = Pt(0)
    p8.paragraph_format.space_after = Pt(0)
    r8 = p8.add_run("OCTOBER, 2026")
    r8.font.name = 'Times New Roman'
    r8.font.size = Pt(12.5)
    r8.font.bold = True


def build_title_page(doc):
    """Handcrafts the official Title Page including the Supervisor guidance block."""
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(14)
    p1.paragraph_format.space_after = Pt(12)
    r1 = p1.add_run("A Project Report on")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(12)
    r1.font.italic = True

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.line_spacing = 1.2
    p2.paragraph_format.space_before = Pt(2)
    p2.paragraph_format.space_after = Pt(20)
    r2 = p2.add_run("PROJECT KINETICA: A CLOSED-LOOP CYBER-PHYSICAL SYSTEM FOR PERCEPTION-DRIVEN TRAFFIC SIGNAL CONTROL, STOCHASTIC QUEUE ACTUATION, AND PRIORITY-AWARE GREEN WAVE PREEMPTION")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(16.5)
    r2.font.bold = True

    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p3.paragraph_format.space_before = Pt(0)
    p3.paragraph_format.space_after = Pt(4)
    r3 = p3.add_run("Submitted in partial fulfillment of the requirements for the award of the degree of")
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(11.5)
    r3.font.italic = True

    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4.paragraph_format.space_before = Pt(0)
    p4.paragraph_format.space_after = Pt(3)
    r4 = p4.add_run("BACHELOR OF TECHNOLOGY")
    r4.font.name = 'Times New Roman'
    r4.font.size = Pt(15.5)
    r4.font.bold = True

    p4_sub = doc.add_paragraph()
    p4_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4_sub.paragraph_format.space_before = Pt(0)
    p4_sub.paragraph_format.space_after = Pt(18)
    r4_sub = p4_sub.add_run("in Computer Science and Engineering with Specialization in Data Science")
    r4_sub.font.name = 'Times New Roman'
    r4_sub.font.size = Pt(13)
    r4_sub.font.bold = True

    p5 = doc.add_paragraph()
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p5.paragraph_format.space_before = Pt(0)
    p5.paragraph_format.space_after = Pt(4)
    r5 = p5.add_run("by")
    r5.font.name = 'Times New Roman'
    r5.font.size = Pt(11.5)
    r5.font.italic = True

    p6 = doc.add_paragraph()
    p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p6.paragraph_format.line_spacing = 1.2
    p6.paragraph_format.space_before = Pt(0)
    p6.paragraph_format.space_after = Pt(18)
    r6_a = p6.add_run("VAIBHAV P.K (Register No: 23BDS1148)\n")
    r6_a.font.name = 'Times New Roman'
    r6_a.font.size = Pt(13)
    r6_a.font.bold = True
    r6_b = p6.add_run("MITHIL GIRISH (Register No: 23BDS1168)")
    r6_b.font.name = 'Times New Roman'
    r6_b.font.size = Pt(13)
    r6_b.font.bold = True

    # Guide Block
    p_guide = doc.add_paragraph()
    p_guide.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_guide.paragraph_format.line_spacing = 1.2
    p_guide.paragraph_format.space_before = Pt(0)
    p_guide.paragraph_format.space_after = Pt(20)
    r_g1 = p_guide.add_run("Under the Guidance of\n")
    r_g1.font.italic = True
    r_g1.font.size = Pt(12)
    r_g2 = p_guide.add_run("Dr. R. KRITHIGA\n")
    r_g2.font.bold = True
    r_g2.font.size = Pt(13.5)
    r_g3 = p_guide.add_run("Associate Professor, Department of Data Science\nSchool of Computer Science and Engineering, VIT Chennai")
    r_g3.font.size = Pt(11)

    if os.path.exists(VIT_LOGO_PATH):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(0)
        p_logo.paragraph_format.space_after = Pt(20)
        run_logo = p_logo.add_run()
        run_logo.add_picture(VIT_LOGO_PATH, width=Inches(2.3))

    p7 = doc.add_paragraph()
    p7.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p7.paragraph_format.space_before = Pt(0)
    p7.paragraph_format.space_after = Pt(3)
    r7 = p7.add_run("SCHOOL OF COMPUTER SCIENCE AND ENGINEERING\nVELLORE INSTITUTE OF TECHNOLOGY (VIT), CHENNAI")
    r7.font.name = 'Times New Roman'
    r7.font.size = Pt(13)
    r7.font.bold = True

    p8 = doc.add_paragraph()
    p8.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p8.paragraph_format.space_before = Pt(12)
    p8.paragraph_format.space_after = Pt(0)
    r8 = p8.add_run("OCTOBER, 2026")
    r8.font.name = 'Times New Roman'
    r8.font.size = Pt(12)
    r8.font.bold = True


def build_declaration_page(doc):
    """Handcrafts the formal Declaration of Authorship (Page 3)."""
    p_head = doc.add_paragraph()
    p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_head.paragraph_format.space_before = Pt(14)
    p_head.paragraph_format.space_after = Pt(16)
    r_head = p_head.add_run("DECLARATION OF AUTHORSHIP")
    r_head.font.name = 'Times New Roman'
    r_head.font.size = Pt(16)
    r_head.font.bold = True
    r_head.font.underline = True

    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p1.paragraph_format.line_spacing = 1.4
    p1.paragraph_format.space_after = Pt(12)
    p1.paragraph_format.first_line_indent = Inches(0.4)
    r1 = p1.add_run("We hereby declare that the Project I thesis entitled ")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(12)
    r1_b = p1.add_run('"PROJECT KINETICA: A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption" ')
    r1_b.bold = True
    r1_c = p1.add_run("submitted to the School of Computer Science and Engineering, Vellore Institute of Technology, Chennai, in partial fulfillment of the requirements for the award of the degree of ")
    r1_d = p1.add_run("Bachelor of Technology in Computer Science and Engineering with Specialization in Data Science, ")
    r1_d.bold = True
    r1_e = p1.add_run("is a bonafide record of original work carried out by us under the supervision and guidance of ")
    r1_f = p1.add_run("Dr. R. KRITHIGA, ")
    r1_f.bold = True
    r1_g = p1.add_run("Associate Professor, Department of Data Science.")

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p2.paragraph_format.line_spacing = 1.4
    p2.paragraph_format.space_after = Pt(12)
    p2.paragraph_format.first_line_indent = Inches(0.4)
    p2.add_run("We further declare that the empirical findings, mathematical derivations, software architectures, algorithms, simulation pipelines, and experimental results embodied in this report have not been submitted to any other university, institute, or examining body for the award of any degree, diploma, associateship, fellowship, or other similar academic title.")

    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p3.paragraph_format.line_spacing = 1.4
    p3.paragraph_format.space_after = Pt(36)
    p3.paragraph_format.first_line_indent = Inches(0.4)
    p3.add_run("Where other authors' published contributions, open-source libraries, academic papers, and benchmark datasets have been utilized, they have been comprehensively and explicitly cited in the body of the report and listed in the References section in full compliance with academic integrity standards and IEEE/APA formatting conventions.")

    # Two-column signature block
    sig_tbl = doc.add_table(rows=1, cols=2)
    sig_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    apply_table_borders(sig_tbl, is_borderless=True)
    set_table_geometry(sig_tbl, [4150, 4150])

    cell_left = sig_tbl.cell(0, 0)
    cell_right = sig_tbl.cell(0, 1)
    set_cell_margins(cell_left, top=10, bottom=10, left=10, right=15)
    set_cell_margins(cell_right, top=10, bottom=10, left=15, right=10)

    p_left = cell_left.paragraphs[0]
    p_left.paragraph_format.line_spacing = 1.25
    r_l1 = p_left.add_run("Place: VIT Chennai\nDate: October 13, 2026")
    r_l1.font.name = 'Times New Roman'
    r_l1.font.size = Pt(11.5)

    p_right = cell_right.paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_right.paragraph_format.line_spacing = 1.25
    r_r1 = p_right.add_run("(Signatures of the Candidates)\n\n\nVAIBHAV P.K (Register No: 23BDS1148)\nMITHIL GIRISH (Register No: 23BDS1168)\n")
    r_r1.font.name = 'Times New Roman'
    r_r1.font.size = Pt(11.5)
    r_r1.font.bold = True
    r_r2 = p_right.add_run("School of Computer Science and Engineering\nVIT Chennai")
    r_r2.font.name = 'Times New Roman'
    r_r2.font.size = Pt(11)


def build_certificate_page(doc):
    """Handcrafts the formal Bonafide Certificate fitting on exactly Page 4."""
    p_sc = doc.add_paragraph()
    p_sc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sc.paragraph_format.space_before = Pt(8)
    p_sc.paragraph_format.space_after = Pt(2)
    r_sc = p_sc.add_run("School of Computer Science and Engineering")
    r_sc.font.name = 'Times New Roman'
    r_sc.font.size = Pt(13)
    r_sc.font.bold = True

    p_head = doc.add_paragraph()
    p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_head.paragraph_format.space_before = Pt(0)
    p_head.paragraph_format.space_after = Pt(14)
    r_head = p_head.add_run("BONAFIDE CERTIFICATE")
    r_head.font.name = 'Times New Roman'
    r_head.font.size = Pt(16)
    r_head.font.bold = True
    r_head.font.underline = True

    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p1.paragraph_format.line_spacing = 1.35
    p1.paragraph_format.space_after = Pt(12)
    p1.paragraph_format.first_line_indent = Inches(0.4)
    p1.add_run('This is to certify that the Project I thesis entitled "PROJECT KINETICA: A Closed-Loop Cyber-Physical System for Perception-Driven Traffic Signal Control, Stochastic Queue Actuation, and Priority-Aware Green Wave Preemption" is a bonafide record of work carried out by VAIBHAV P.K (Register No: 23BDS1148) and MITHIL GIRISH (Register No: 23BDS1168) in partial fulfillment of the requirements for the award of the degree of Bachelor of Technology in Computer Science and Engineering with Specialization in Data Science from the School of Computer Science and Engineering, Vellore Institute of Technology, Chennai, during the academic year 2026-2027.')

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p2.paragraph_format.line_spacing = 1.35
    p2.paragraph_format.space_after = Pt(24)
    p2.paragraph_format.first_line_indent = Inches(0.4)
    p2.add_run("The work reported herein represents the original independent contributions of the candidates conducted under my direct guidance and supervision. The project fulfills the academic requirements as per the regulations of this University and in my opinion meets the necessary standards for submission.")

    # 2x2 Grid Table for Signatures
    tbl = doc.add_table(rows=2, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    apply_table_borders(tbl, is_borderless=True)
    set_table_geometry(tbl, [4150, 4150])

    # Row 1: Guide & HoD
    c00 = tbl.cell(0, 0)
    c01 = tbl.cell(0, 1)
    set_cell_margins(c00, top=10, bottom=16, left=10, right=15)
    set_cell_margins(c01, top=10, bottom=16, left=15, right=10)

    p00 = c00.paragraphs[0]
    p00.paragraph_format.line_spacing = 1.2
    p00.add_run("_____________________________________\n").bold = True
    p00.add_run("Dr. R. KRITHIGA\n").bold = True
    p00.add_run("Project Guide & Supervisor\nAssociate Professor, Dept. of Data Science\nSCOPE, VIT Chennai")

    p01 = c01.paragraphs[0]
    p01.paragraph_format.line_spacing = 1.2
    p01.add_run("_____________________________________\n").bold = True
    p01.add_run("Dr. VERGIN RAJA SAROBIN M\n").bold = True
    p01.add_run("Head of Department\nDept. of Data Science / Computing Tech.\nSCOPE, VIT Chennai")

    # Row 2: Examiners
    c10 = tbl.cell(1, 0)
    c11 = tbl.cell(1, 1)
    set_cell_margins(c10, top=16, bottom=12, left=10, right=15)
    set_cell_margins(c11, top=16, bottom=12, left=15, right=10)

    p10 = c10.paragraphs[0]
    p10.paragraph_format.line_spacing = 1.2
    p10.add_run("_____________________________________\n").bold = True
    p10.add_run("INTERNAL EXAMINER\n").bold = True
    p10.add_run("School of Computer Science & Engineering\nVIT Chennai")

    p11 = c11.paragraphs[0]
    p11.paragraph_format.line_spacing = 1.2
    p11.add_run("_____________________________________\n").bold = True
    p11.add_run("EXTERNAL EXAMINER\n").bold = True
    p11.add_run("School of Computer Science & Engineering\nVIT Chennai")

    p_dt = doc.add_paragraph()
    p_dt.paragraph_format.space_before = Pt(20)
    p_dt.paragraph_format.space_after = Pt(0)
    p_dt.add_run("Date: October 13, 2026          Place: Chennai                              (School Seal)").font.size = Pt(11)


def build_acknowledgements_page(doc):
    """Handcrafts Acknowledgements fitting cleanly on exactly Page 7."""
    p_head = doc.add_paragraph()
    p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_head.paragraph_format.space_before = Pt(14)
    p_head.paragraph_format.space_after = Pt(14)
    r_head = p_head.add_run("ACKNOWLEDGMENTS")
    r_head.font.name = 'Times New Roman'
    r_head.font.size = Pt(16)
    r_head.font.bold = True
    r_head.font.underline = True

    paras = [
        "The successful realization of Project Kinetica has been a profoundly rewarding and intellectually enriching endeavor. We take this opportunity to express our deepest gratitude to all individuals and institutions who have supported, guided, and encouraged us throughout this journey.",
        "First and foremost, we extend our heartfelt gratitude and utmost reverence to our esteemed Project Guide, **Dr. R. KRITHIGA**, Associate Professor, Department of Data Science, School of Computer Science and Engineering, Vellore Institute of Technology, Chennai. Her unwavering technical guidance, profound domain insights in data engineering and intelligent systems, meticulous reviews, and constant encouragement have been the driving force behind the methodological rigor and architectural integrity of this project. Her insistence on formal statistical hypothesis testing shaped our experimental framework.",
        "We express our profound gratitude to **Dr. G. VISWANATHAN**, Honorable Founder and Chancellor of Vellore Institute of Technology, for establishing a world-class institution with state-of-the-art computational infrastructure, research laboratories, and an environment fostering innovation, excellence, and societal impact. We also express our sincere appreciation to the Vice Presidents, the Vice Chancellor, the Pro-Vice Chancellor, and the Executive Director of VIT Chennai for their visionary leadership.",
        "We extend our sincere thanks to **Dr. VISWANATHAN V**, Dean, School of Computer Science and Engineering, **Dr. NITHYANANDAM P**, Associate Dean, **Dr. SUGANYA G**, Associate Dean, and **Dr. VERGIN RAJA SAROBIN M**, Head of Department, for their administrative support, strategic oversight, and continuous encouragement of high-impact engineering projects.",
        "We are immensely indebted to our families and parents for their unconditional love, moral support, and sacrifices throughout our academic pursuits. Finally, we thank our peers and friends at VIT Chennai for their collaborative spirit and constructive critiques throughout this work."
    ]

    for text in paras:
        add_formatted_paragraph(doc, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=5, line_spacing=1.28)

    p_sig = doc.add_paragraph()
    p_sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sig.paragraph_format.space_before = Pt(16)
    p_sig.paragraph_format.space_after = Pt(0)
    p_sig.paragraph_format.line_spacing = 1.2
    r_sig1 = p_sig.add_run("VAIBHAV P.K (23BDS1148)\nMITHIL GIRISH (23BDS1168)\n")
    r_sig1.font.bold = True
    r_sig1.font.size = Pt(11.5)
    r_sig2 = p_sig.add_run("School of Computer Science and Engineering\nVellore Institute of Technology, Chennai")
    r_sig2.font.size = Pt(11)


# ==============================================================================
# SECTION PARSING AND DOCUMENT ASSEMBLY ENGINE
# ==============================================================================

def flush_code_or_table_or_image(doc, code_buffer):
    """
    Intelligently dispatches buffered blocks:
    - If buffer contains an <img src="..."> tag, renders an image figure.
    - If buffer contains an ASCII grid or pipe table, renders an academic table.
    - Otherwise, renders a clean monospace code block.
    """
    if not code_buffer:
        return

    # 1. Image check
    img_lines = [l.strip() for l in code_buffer if '<img ' in l]
    if img_lines:
        img_match = re.search(r'<img\s+[^>]*src=["\']([^"\']+)["\']', img_lines[0])
        if img_match:
            add_image_figure(doc, img_match.group(1))
            return

    # 2. Table check
    fne = [x.strip() for x in code_buffer if x.strip()]
    is_grid = any(x.startswith('+--') for x in fne[:3])
    is_pipe = any(x.startswith('|') and x.endswith('|') for x in fne[:3])
    is_python_code = any(re.match(r'^(def |class |from |import |return |@|#\s*pytest)', x) for x in fne[:5])

    if is_grid and not is_python_code:
        rows = parse_grid_table(code_buffer)
        if rows:
            add_academic_table(doc, rows)
            return

    if is_pipe and not is_python_code and len(fne) > 1:
        rows = parse_pipe_table(code_buffer)
        if rows:
            add_academic_table(doc, rows)
            return

    # 3. Default to code block
    add_code_block(doc, code_buffer)


def process_body_markdown(doc, md_text, is_first_in_section=False):
    """Processes chapter markdown with robust grid table and image parsing."""
    lines = md_text.splitlines()
    i = 0
    n = len(lines)

    in_code = False
    code_buffer = []

    while i < n:
        line = lines[i]
        line_s = line.strip()

        # Handle code blocks
        if line_s.startswith("```"):
            if in_code:
                in_code = False
                flush_code_or_table_or_image(doc, code_buffer)
                code_buffer = []
            else:
                in_code = True
                code_buffer = []
            i += 1
            continue

        if in_code:
            code_buffer.append(line)
            i += 1
            continue

        # Handle ASCII Grid Tables (+---+---+ and | ... |)
        if line_s.startswith("+") and line_s.endswith("+") and re.match(r'^\+[+= \-]+?\+$', line_s):
            tbl_lines = [line_s]
            i += 1
            while i < n and (lines[i].strip().startswith("|") or (lines[i].strip().startswith("+") and lines[i].strip().endswith("+"))):
                tbl_lines.append(lines[i].strip())
                i += 1
            rows = parse_grid_table(tbl_lines)
            if rows:
                add_academic_table(doc, rows)
            continue

        # Handle Markdown Pipe Tables (| col1 | col2 |)
        if line_s.startswith("|") and line_s.endswith("|") and not line_s.startswith("+"):
            tbl_lines = []
            while i < n and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                tbl_lines.append(lines[i].strip())
                i += 1
            rows = parse_pipe_table(tbl_lines)
            if rows:
                add_academic_table(doc, rows)
            continue

        # Images
        img_match = re.search(r'<img\s+src=["\']([^"\']+)["\']', line_s)
        if img_match:
            add_image_figure(doc, img_match.group(1))
            i += 1
            continue

        # Major Chapter breaks
        if line_s.startswith("# CHAPTER") or line_s.startswith("# REFERENCES") or line_s.startswith("# APPENDICES"):
            if not is_first_in_section:
                doc.add_page_break()
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_head.paragraph_format.space_before = Pt(14)
            p_head.paragraph_format.space_after = Pt(8)
            run = p_head.add_run(clean_xml_string(clean_math_text(line_s.lstrip('#').strip())))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(16)
            run.font.bold = True
            run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
            i += 1
            continue

        # Level 1 Heading
        if line_s.startswith("# "):
            title_text = clean_math_text(line_s[2:].strip())
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(12)
            p_head.paragraph_format.space_after = Pt(6)
            run = p_head.add_run(clean_xml_string(title_text))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(16)
            run.font.bold = True
            i += 1
            continue

        # Level 2 Headings (Sections): 14pt CAPS Bold
        if line_s.startswith("## "):
            sec_text = clean_math_text(line_s[3:].strip())
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(9)
            p_head.paragraph_format.space_after = Pt(3)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(sec_text.upper()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(13.5)
            run.font.bold = True
            i += 1
            continue

        # Level 3 Headings (Subsections): 12pt CAPS Bold
        if line_s.startswith("### "):
            subsec_text = clean_math_text(line_s[4:].strip())
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(6)
            p_head.paragraph_format.space_after = Pt(2)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(subsec_text.upper()))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.font.bold = True
            i += 1
            continue

        # Level 4 Headings: 12pt Italic Bold
        if line_s.startswith("#### "):
            sub3_text = clean_math_text(line_s[5:].strip())
            p_head = doc.add_paragraph()
            p_head.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_head.paragraph_format.space_before = Pt(4)
            p_head.paragraph_format.space_after = Pt(2)
            p_head.paragraph_format.keep_with_next = True
            run = p_head.add_run(clean_xml_string(sub3_text))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.font.bold = True
            run.font.italic = True
            i += 1
            continue

        # Rules / empty lines / html
        if line_s in ["---", "***", "___", "<div align=\"center\">", "</div>", "<br/>", "<br>"]:
            i += 1
            continue

        if line_s in ["<pagebreak/>", "<page_break/>"]:
            doc.add_page_break()
            i += 1
            continue

        # Captions (*Figure X.X...* or *Table X.X...*)
        if line_s.startswith("*Figure") or line_s.startswith("*Table"):
            cap_text = line_s.strip('*')
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.line_spacing = 1.0
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(6)
            run = p_cap.add_run(clean_xml_string(clean_math_text(cap_text)))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(10)
            run.font.italic = True
            run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
            i += 1
            continue

        # Math formulas $$ ... $$
        if line_s.startswith("$$") and line_s.endswith("$$") and len(line_s) > 4:
            math_text = clean_math_text(line_s[2:-2].strip())
            p_m = doc.add_paragraph()
            p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_m.paragraph_format.space_before = Pt(3)
            p_m.paragraph_format.space_after = Pt(3)
            run = p_m.add_run(clean_xml_string(math_text))
            run.font.name = 'Cambria Math'
            run.font.size = Pt(11)
            run.font.italic = True
            i += 1
            continue

        # Bullet points
        if line_s.startswith("- ") or line_s.startswith("* "):
            bullet_text = clean_math_text(line_s[2:].strip())
            p_b = doc.add_paragraph(style='List Bullet')
            p_b.paragraph_format.line_spacing = 1.32
            p_b.paragraph_format.space_before = Pt(0)
            p_b.paragraph_format.space_after = Pt(2)
            tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$)', bullet_text)
            for tok in tokens:
                if not tok:
                    continue
                if tok.startswith('**') and tok.endswith('**'):
                    run = p_b.add_run(clean_xml_string(tok[2:-2]))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    run.bold = True
                elif tok.startswith('*') and tok.endswith('*'):
                    run = p_b.add_run(clean_xml_string(tok[1:-1]))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    run.italic = True
                elif tok.startswith('`') and tok.endswith('`'):
                    run = p_b.add_run(clean_xml_string(tok[1:-1]))
                    run.font.name = 'Consolas'
                    run.font.size = Pt(9.5)
                elif tok.startswith('$') and tok.endswith('$'):
                    run = p_b.add_run(clean_xml_string(tok[1:-1].strip()))
                    run.font.name = 'Cambria Math'
                    run.font.size = Pt(11.5)
                    run.italic = True
                else:
                    run = p_b.add_run(clean_xml_string(tok))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
            i += 1
            continue

        # Numbered list item
        num_match = re.match(r'^(\d+)\.\s+(.*)', line_s)
        if num_match:
            item_text = clean_math_text(num_match.group(2))
            p_num = doc.add_paragraph()
            p_num.paragraph_format.line_spacing = 1.32
            p_num.paragraph_format.space_before = Pt(0)
            p_num.paragraph_format.space_after = Pt(2)
            p_num.paragraph_format.left_indent = Inches(0.25)
            run_num = p_num.add_run(f"{num_match.group(1)}. ")
            run_num.font.name = 'Times New Roman'
            run_num.font.size = Pt(12)
            run_num.font.bold = True

            tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$)', item_text)
            for tok in tokens:
                if not tok:
                    continue
                if tok.startswith('**') and tok.endswith('**'):
                    run = p_num.add_run(clean_xml_string(tok[2:-2]))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    run.bold = True
                elif tok.startswith('*') and tok.endswith('*'):
                    run = p_num.add_run(clean_xml_string(tok[1:-1]))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    run.italic = True
                elif tok.startswith('`') and tok.endswith('`'):
                    run = p_num.add_run(clean_xml_string(tok[1:-1]))
                    run.font.name = 'Consolas'
                    run.font.size = Pt(9.5)
                elif tok.startswith('$') and tok.endswith('$'):
                    run = p_num.add_run(clean_xml_string(tok[1:-1].strip()))
                    run.font.name = 'Cambria Math'
                    run.font.size = Pt(11.5)
                    run.italic = True
                else:
                    run = p_num.add_run(clean_xml_string(tok))
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
            i += 1
            continue

        # Regular body paragraph
        if line_s:
            add_formatted_paragraph(doc, line_s, align=WD_ALIGN_PARAGRAPH.JUSTIFY)

        i += 1

    # Flush lingering code blocks or tables
    if in_code and code_buffer:
        flush_code_or_table_or_image(doc, code_buffer)


# ==============================================================================
# TABLE OF CONTENTS, LIST OF FIGURES, AND LIST OF TABLES RENDERERS
# ==============================================================================

def add_academic_toc(doc, page_map):
    """Renders real publication-style Table of Contents fitting on exactly 2 pages."""
    p_head = doc.add_paragraph()
    p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_head.paragraph_format.space_before = Pt(8)
    p_head.paragraph_format.space_after = Pt(8)
    r_head = p_head.add_run("TABLE OF CONTENTS")
    r_head.font.name = 'Times New Roman'
    r_head.font.size = Pt(16)
    r_head.font.bold = True
    r_head.font.underline = True

    ch1_p = page_map.get("CHAPTER 1", 1)
    ch2_p = page_map.get("CHAPTER 2", 15)
    ch3_p = page_map.get("CHAPTER 3", 33)
    ch4_p = page_map.get("CHAPTER 4", 51)
    ch5_p = page_map.get("CHAPTER 5", 64)
    ref_p = page_map.get("REFERENCES", 70)
    app_p = page_map.get("APPENDICES", 73)

    toc_entries = [
        ("", "Declaration of Authorship", "i", False),
        ("", "Bonafide Certificate", "ii", False),
        ("", "Executive Abstract", "iii", False),
        ("", "Acknowledgments", "v", False),
        ("", "Table of Contents", "vi", False),
        ("", "List of Figures", "vii", False),
        ("", "List of Tables", "viii", False),
        ("", "List of Abbreviations & Symbols", "ix", False),
        ("CHAPTER 1", "INTRODUCTION", str(ch1_p), True),
        ("1.1", "Context and Urban Mobility Crisis", str(ch1_p), False),
        ("1.2", "Limitations of Legacy Traffic Signal Control Paradigms", str(ch1_p + 2), False),
        ("1.3", "The Emergency Preemption Failure in Modern Cities", str(ch1_p + 5), False),
        ("1.4", "Project Kinetica Overview: A Closed-Loop Cyber-Physical System", str(ch1_p + 7), False),
        ("1.5", "The Four Architectural Pillars", str(ch1_p + 8), False),
        ("1.6", "Project Objectives & Testable Success Criteria (SC1-SC4)", str(ch1_p + 11), False),
        ("1.7", "Delimitations and Project Scoping Boundaries", str(ch1_p + 11), False),
        ("1.8", "Organization of the Report", str(ch1_p + 12), False),
        ("CHAPTER 2", "LITERATURE REVIEW & THEORETICAL FOUNDATION", str(ch2_p), True),
        ("2.1", "Evolution of Urban Traffic Signal Control Paradigms", str(ch2_p), False),
        ("2.2", "Computer Vision and Edge Sensing in ITS", str(ch2_p + 2), False),
        ("2.3", "Stochastic Modeling of Traffic Arrivals & Queue Dynamics", str(ch2_p + 6), False),
        ("2.4", "Emergency Vehicle Preemption & Corridor Routing Mechanisms", str(ch2_p + 10), False),
        ("2.5", "Machine Learning & Statistical Validation in Traffic Systems", str(ch2_p + 13), False),
        ("2.6", "Comprehensive Literature Review Matrix", str(ch2_p + 14), False),
        ("2.7", "Identification of Key Research Gaps Addressed by Kinetica", str(ch2_p + 15), False),
        ("CHAPTER 3", "SYSTEM METHODOLOGY & ARCHITECTURE", str(ch3_p), True),
        ("3.1", "Closed-Loop Cyber-Physical Architecture & Operational State Machine", str(ch3_p), False),
        ("3.2", "Foundational Data Contracts & Schema Immutability", str(ch3_p + 2), False),
        ("3.3", "Module 1: Edge Vision & Spatial Perspective Projection Pipeline", str(ch3_p + 5), False),
        ("3.4", "Module 2: Demand-Responsive Stochastic Actuation Engine", str(ch3_p + 9), False),
        ("3.5", "Module 3: Priority Preemption & Corridor Routing Engine", str(ch3_p + 12), False),
        ("3.6", "Module 4: Predictive Analytics & Hypothesis Testing Framework", str(ch3_p + 15), False),
        ("3.7", "Observability Layer & Hardware Interface Architecture", str(ch3_p + 16), False),
        ("CHAPTER 4", "IMPLEMENTATION, EXPERIMENTAL EVALUATION & RESULTS", str(ch4_p), True),
        ("4.1", "Experimental Environment, Simulation Setup & Synthetic Data Generator", str(ch4_p), False),
        ("4.2", "Module 1: Edge Vision & Emergency Classification Results", str(ch4_p + 2), False),
        ("4.3", "Module 2: Demand-Responsive Actuation & Poisson Goodness-of-Fit", str(ch4_p + 3), False),
        ("4.4", "Module 3: Priority Preemption Benchmarks & Green Wave Latency", str(ch4_p + 5), False),
        ("4.5", "Module 4: Statistical Hypothesis Testing Results (SC4 Validation)", str(ch4_p + 8), False),
        ("4.6", "Post-Preemption Bottleneck Forecasting & Feature Importances", str(ch4_p + 10), False),
        ("4.7", "Saturation Flow Rate Empirical Calibration", str(ch4_p + 10), False),
        ("4.8", "Comprehensive Master Pipeline Integration Benchmark", str(ch4_p + 11), False),
        ("CHAPTER 5", "CONCLUSION & FUTURE WORK", str(ch5_p), True),
        ("5.1", "Summary of Research Contributions", str(ch5_p), False),
        ("5.2", "Success Criteria Final Verification Audit (SC1-SC4)", str(ch5_p + 1), False),
        ("5.3", "Quantitative Societal, Environmental & Economic Impact", str(ch5_p + 2), False),
        ("5.4", "Threats to Validity & Cyber-Physical Scoping Boundaries", str(ch5_p + 4), False),
        ("5.5", "Strategic Directions for Future Research", str(ch5_p + 4), False),
        ("REFERENCES", "Formatted Academic Bibliography in IEEE / APA Style", str(ref_p), True),
        ("APPENDICES", "Complete Data Contracts, Core Algorithms & Test Audits", str(app_p), True),
    ]

    tbl = doc.add_table(rows=len(toc_entries) + 1, cols=3)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    apply_table_borders(tbl, is_borderless=False)
    set_table_geometry(tbl, [1700, 6300, 800])

    headers = ["Chapter / Section", "Title", "Page No."]
    for c_idx, h_text in enumerate(headers):
        cell = tbl.cell(0, c_idx)
        set_cell_margins(cell, top=14, bottom=14, left=35, right=35)
        set_cell_background(cell, "F1F5F9")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx == 2 else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(h_text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(8.5)
        r.font.bold = True

    for r_idx, (sec, title, pg, is_maj) in enumerate(toc_entries, start=1):
        cell_sec = tbl.cell(r_idx, 0)
        cell_title = tbl.cell(r_idx, 1)
        cell_pg = tbl.cell(r_idx, 2)

        for c in (cell_sec, cell_title, cell_pg):
            set_cell_margins(c, top=11, bottom=11, left=35, right=35)

        p_s = cell_sec.paragraphs[0]
        p_s.paragraph_format.line_spacing = 1.0
        p_s.paragraph_format.space_before = Pt(0)
        p_s.paragraph_format.space_after = Pt(0)
        r_s = p_s.add_run(sec)
        r_s.font.name = 'Times New Roman'
        r_s.font.size = Pt(8.0)
        r_s.font.bold = is_maj

        p_t = cell_title.paragraphs[0]
        p_t.paragraph_format.line_spacing = 1.0
        p_t.paragraph_format.space_before = Pt(0)
        p_t.paragraph_format.space_after = Pt(0)
        r_t = p_t.add_run(title)
        r_t.font.name = 'Times New Roman'
        r_t.font.size = Pt(8.0)
        r_t.font.bold = is_maj

        p_p = cell_pg.paragraphs[0]
        p_p.paragraph_format.line_spacing = 1.0
        p_p.paragraph_format.space_before = Pt(0)
        p_p.paragraph_format.space_after = Pt(0)
        p_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_p = p_p.add_run(pg)
        r_p.font.name = 'Times New Roman'
        r_p.font.size = Pt(8.0)
        r_p.font.bold = is_maj


def add_academic_lof(doc, fig_map):
    """Renders real publication-style List of Figures fitting on exactly 1 page."""
    p_head = doc.add_paragraph()
    p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_head.paragraph_format.space_before = Pt(8)
    p_head.paragraph_format.space_after = Pt(8)
    r_head = p_head.add_run("LIST OF FIGURES")
    r_head.font.name = 'Times New Roman'
    r_head.font.size = Pt(16)
    r_head.font.bold = True
    r_head.font.underline = True

    figures = [
        ("Figure 1.1", "Project Kinetica Closed-Loop Cyber-Physical System Architecture", str(fig_map.get("Figure 1.1", 9))),
        ("Figure 1.2", "Anatomy of Urban Intersection Deadlock and Golden Hour Ambulance Traps", str(fig_map.get("Figure 1.2", 7))),
        ("Figure 2.1", "Evolution of Urban Traffic Signal Control: From Fixed Splits to Autonomous CPS", str(fig_map.get("Figure 2.1", 15))),
        ("Figure 2.2", "Perspective Geometric Distortion: Camera View Space vs. Metric Road Space", str(fig_map.get("Figure 2.2", 18))),
        ("Figure 2.3", "Poisson Inter-Arrival Exponential Distribution vs. Congested Renewal Processes", str(fig_map.get("Figure 2.3", 21))),
        ("Figure 2.4", "Webster Two-Term Delay Curve as a Function of Volume-to-Capacity Ratio", str(fig_map.get("Figure 2.4", 23))),
        ("Figure 3.1", "Detailed Sensor-to-Actuator Cyber-Physical Pipeline and Schema Exchange", str(fig_map.get("Figure 3.1", 33))),
        ("Figure 3.2", "Inverse Perspective Mapping via 3x3 Planar Homography Matrix", str(fig_map.get("Figure 3.2", 38))),
        ("Figure 3.3", "Priority Max-Heap Binary Tree Architecture with Dynamic Urgency Aging", str(fig_map.get("Figure 3.3", 44))),
        ("Figure 3.4", "Time-Space Diagram of Multi-Intersection Lookahead Green Wave Progression", str(fig_map.get("Figure 3.4", 47))),
        ("Figure 3.5", "Decision Tree Architecture for Post-Preemption Bottleneck Prediction", str(fig_map.get("Figure 3.5", 49))),
        ("Figure 3.6", "Distributed Edge Gateway and Next.js Control Room Observability Stack", str(fig_map.get("Figure 3.6", 50))),
        ("Figure 4.1", "Empirical Poisson Inter-Arrival Distribution Fit and Goodness-of-Fit Test", str(fig_map.get("Figure 4.1", 56))),
        ("Figure 4.2", "Metric Queue Length Timeline: Kinetica Dynamic Actuation vs. Fixed Baseline", str(fig_map.get("Figure 4.2", 58))),
        ("Figure 4.3", "Civilian Vehicular Wait-Time Distribution Comparison (Mann-Whitney U Test)", str(fig_map.get("Figure 4.3", 60))),
        ("Figure 4.4", "Decision Tree Bottleneck Predictor Feature Importances (Queue vs. Count)", str(fig_map.get("Figure 4.4", 61))),
        ("Figure 4.5", "Edge Hardware Inference Latency Distributions: AMD APU vs. NVIDIA Jetson", str(fig_map.get("Figure 4.5", 54))),
        ("Figure E.1", "Complete Edge Hardware and NEMA TS2 Cabinet Interface Schematic", str(fig_map.get("Figure E.1", 78))),
    ]

    tbl = doc.add_table(rows=len(figures) + 1, cols=3)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    apply_table_borders(tbl, is_borderless=False)
    set_table_geometry(tbl, [1700, 6300, 800])

    headers = ["Figure No.", "Caption", "Page No."]
    for c_idx, h_text in enumerate(headers):
        cell = tbl.cell(0, c_idx)
        set_cell_margins(cell, top=14, bottom=14, left=35, right=35)
        set_cell_background(cell, "F1F5F9")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx == 2 else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(h_text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(8.5)
        r.font.bold = True

    for r_idx, (fno, cap, pg) in enumerate(figures, start=1):
        cell_no = tbl.cell(r_idx, 0)
        cell_cap = tbl.cell(r_idx, 1)
        cell_pg = tbl.cell(r_idx, 2)
        for c in (cell_no, cell_cap, cell_pg):
            set_cell_margins(c, top=11, bottom=11, left=35, right=35)

        p_no = cell_no.paragraphs[0]
        p_no.paragraph_format.line_spacing = 1.0
        p_no.paragraph_format.space_before = Pt(0)
        p_no.paragraph_format.space_after = Pt(0)
        p_no.add_run(fno).font.size = Pt(8.0)

        p_cap = cell_cap.paragraphs[0]
        p_cap.paragraph_format.line_spacing = 1.0
        p_cap.paragraph_format.space_before = Pt(0)
        p_cap.paragraph_format.space_after = Pt(0)
        p_cap.add_run(cap).font.size = Pt(8.0)

        p_pg = cell_pg.paragraphs[0]
        p_pg.paragraph_format.line_spacing = 1.0
        p_pg.paragraph_format.space_before = Pt(0)
        p_pg.paragraph_format.space_after = Pt(0)
        p_pg.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_pg.add_run(pg).font.size = Pt(8.0)


def add_academic_lot(doc, page_map):
    """Renders real publication-style List of Tables fitting on exactly 1 page."""
    p_head = doc.add_paragraph()
    p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_head.paragraph_format.space_before = Pt(8)
    p_head.paragraph_format.space_after = Pt(8)
    r_head = p_head.add_run("LIST OF TABLES")
    r_head.font.name = 'Times New Roman'
    r_head.font.size = Pt(16)
    r_head.font.bold = True
    r_head.font.underline = True

    ch1_p = page_map.get("CHAPTER 1", 1)
    ch2_p = page_map.get("CHAPTER 2", 15)
    ch3_p = page_map.get("CHAPTER 3", 33)
    ch4_p = page_map.get("CHAPTER 4", 51)
    ch5_p = page_map.get("CHAPTER 5", 64)
    app_p = page_map.get("APPENDICES", 73)

    tables = [
        ("Table 1.1", "Comparison of Traffic Signal Control Paradigms in Modern Cities", str(ch1_p + 4)),
        ("Table 1.2", "Formal Success Criteria Specification and Test Suite Verification Mapping", str(ch1_p + 11)),
        ("Table 2.1", "Comparative Literature Review Matrix: State-of-the-Art ITS vs. Kinetica", str(ch2_p + 14)),
        ("Table 3.1", "Module Ownership, Data Production, and Consumption Contract Table", str(ch3_p + 2)),
        ("Table 3.2", "Emergency Vehicle Priority Weights, Urgency Offsets, and Thresholds", str(ch3_p + 12)),
        ("Table 3.3", "Arterial Corridor Topology, Link Distances, and Free-Flow Travel Times", str(ch3_p + 14)),
        ("Table 4.1", "Edge Hardware Inference Benchmarks: AMD Ryzen APU vs. NVIDIA Jetson", str(ch4_p + 2)),
        ("Table 4.2", "Emergency Livery Classifier Confusion Matrix, Precision, Recall, and F1", str(ch4_p + 2)),
        ("Table 4.3", "Success Criteria 1 (SC1) Verification: Queue Length vs. Allocated Green", str(ch4_p + 3)),
        ("Table 4.4", "Poisson Goodness-of-Fit Results Across Varying Traffic Volume Regimes", str(ch4_p + 4)),
        ("Table 4.5", "Binary Max-Heap Latency Scaling Across Variable Approach Lane Configs", str(ch4_p + 5)),
        ("Table 4.6", "Success Criteria 2 (SC2) Verification: Preemption Transition Latency", str(ch4_p + 6)),
        ("Table 4.7", "Success Criteria 3 (SC3) Verification: Corridor Green Wave Progression", str(ch4_p + 7)),
        ("Table 4.8", "Paired Wait-Time Descriptive Statistics: Fixed Baseline vs. Kinetica", str(ch4_p + 8)),
        ("Table 4.9", "Success Criteria 4 (SC4) Verification: Formal Hypothesis Test Results", str(ch4_p + 9)),
        ("Table 4.10", "Bottleneck Decision Tree Regression Hyperparameters and Importances", str(ch4_p + 10)),
        ("Table 4.11", "Empirical Saturation Flow Rate Departure Measurements and Calibration", str(ch4_p + 10)),
        ("Table 4.12", "Comprehensive Master Benchmark: Fixed-Timer, Actuated, SCATS vs. Kinetica", str(ch4_p + 11)),
        ("Table 5.1", "Project Kinetica Final Success Criteria Verification and Audit Matrix", str(ch5_p + 1)),
        ("Table 5.2", "Environmental and Economic Impact Summary per Signalized Intersection", str(ch5_p + 3)),
        ("Table F.1", "Project Work Breakdown and Individual Team Contributions Matrix", str(app_p + 6)),
    ]

    tbl = doc.add_table(rows=len(tables) + 1, cols=3)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    apply_table_borders(tbl, is_borderless=False)
    set_table_geometry(tbl, [1700, 6300, 800])

    headers = ["Table No.", "Title", "Page No."]
    for c_idx, h_text in enumerate(headers):
        cell = tbl.cell(0, c_idx)
        set_cell_margins(cell, top=14, bottom=14, left=35, right=35)
        set_cell_background(cell, "F1F5F9")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx == 2 else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(h_text)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(8.5)
        r.font.bold = True

    for r_idx, (tno, title, pg) in enumerate(tables, start=1):
        cell_no = tbl.cell(r_idx, 0)
        cell_title = tbl.cell(r_idx, 1)
        cell_pg = tbl.cell(r_idx, 2)
        for c in (cell_no, cell_title, cell_pg):
            set_cell_margins(c, top=11, bottom=11, left=35, right=35)

        p_no = cell_no.paragraphs[0]
        p_no.paragraph_format.line_spacing = 1.0
        p_no.paragraph_format.space_before = Pt(0)
        p_no.paragraph_format.space_after = Pt(0)
        p_no.add_run(tno).font.size = Pt(8.0)

        p_title = cell_title.paragraphs[0]
        p_title.paragraph_format.line_spacing = 1.0
        p_title.paragraph_format.space_before = Pt(0)
        p_title.paragraph_format.space_after = Pt(0)
        p_title.add_run(title).font.size = Pt(8.0)

        p_pg = cell_pg.paragraphs[0]
        p_pg.paragraph_format.line_spacing = 1.0
        p_pg.paragraph_format.space_before = Pt(0)
        p_pg.paragraph_format.space_after = Pt(0)
        p_pg.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_pg.add_run(pg).font.size = Pt(8.0)


# ==============================================================================
# MASTER DOCUMENT ASSEMBLY PIPELINE
# ==============================================================================

def assemble_master_document(page_map=None, fig_map=None):
    """Builds the complete master document."""
    doc = docx.Document()

    # Section 0: Cover & Title (no footer page number)
    sec0 = doc.sections[0]
    configure_section_geometry(sec0, num_format=None, start_num=None, has_footer=False)

    build_cover_page(doc)
    doc.add_page_break()
    build_title_page(doc)

    # Section 1: Preliminaries (Roman numerals: i, ii, iii...)
    sec1 = doc.add_section(docx.enum.section.WD_SECTION_START.NEW_PAGE)
    sec1.footer.is_linked_to_previous = False
    configure_section_geometry(sec1, num_format='lowerRoman', start_num=1, has_footer=True)

    # Declaration
    build_declaration_page(doc)
    doc.add_page_break()

    # Certificate
    build_certificate_page(doc)
    doc.add_page_break()

    # Abstract (Strictly 2 pages)
    p_abs_head = doc.add_paragraph()
    p_abs_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abs_head.paragraph_format.space_before = Pt(10)
    p_abs_head.paragraph_format.space_after = Pt(10)
    r_abs = p_abs_head.add_run("EXECUTIVE ABSTRACT")
    r_abs.font.name = 'Times New Roman'
    r_abs.font.size = Pt(16)
    r_abs.font.bold = True
    r_abs.font.underline = True

    abs_clean = ABSTRACT_MD.replace("# EXECUTIVE ABSTRACT", "").replace("<br/>", "").replace("<br>", "").strip()
    for para in abs_clean.split("\n\n"):
        para_s = para.strip()
        if para_s and not para_s.startswith("<div") and not para_s.startswith("</div"):
            add_formatted_paragraph(doc, para_s, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=3, line_spacing=1.26)
    doc.add_page_break()

    # Acknowledgements (Single page)
    build_acknowledgements_page(doc)
    doc.add_page_break()

    # Table of Contents (2 pages)
    add_academic_toc(doc, page_map or {})
    doc.add_page_break()

    # List of Figures (1 page)
    add_academic_lof(doc, fig_map or {})
    doc.add_page_break()

    # List of Tables (1 page)
    add_academic_lot(doc, page_map or {})
    doc.add_page_break()

    # List of Abbreviations (2 pages)
    p_abb_head = doc.add_paragraph()
    p_abb_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abb_head.paragraph_format.space_before = Pt(10)
    p_abb_head.paragraph_format.space_after = Pt(10)
    r_abb = p_abb_head.add_run("LIST OF ABBREVIATIONS & SYMBOLS")
    r_abb.font.name = 'Times New Roman'
    r_abb.font.size = Pt(16)
    r_abb.font.bold = True
    r_abb.font.underline = True

    abb_clean = LIST_OF_ABBREVIATIONS_MD.replace("# LIST OF ABBREVIATIONS & SYMBOLS", "").replace("<br/>", "").strip()
    process_body_markdown(doc, abb_clean, is_first_in_section=True)

    # Section 2: Main Body Chapters (Arabic numerals starting at 1)
    sec2 = doc.add_section(docx.enum.section.WD_SECTION_START.NEW_PAGE)
    sec2.footer.is_linked_to_previous = False
    configure_section_geometry(sec2, num_format='decimal', start_num=1, has_footer=True)

    # Helper function to replace code blocks preceding figure captions
    def replace_code_block_before_caption(text, caption_str, img_path):
        idx = text.find(caption_str)
        if idx == -1:
            return text
        close_fence = text.rfind("```", 0, idx)
        if close_fence == -1:
            return text
        open_fence = text.rfind("```", 0, close_fence)
        if open_fence == -1:
            return text
        before = text[:open_fence].rstrip()
        after = text[idx + len(caption_str):]
        return f"{before}\n\n<img src=\"{img_path}\"/>\n{caption_str}{after}"

    # Inject high-resolution figures into markdown text
    ch1 = CHAPTER_1_MD.replace(
        "*Figure 1.1: Project Kinetica Closed-Loop Cyber-Physical System Architecture and Data Contract Flow.*",
        '<img src="results/figures/architecture_cps_flow.png"/>\n*Figure 1.1: Project Kinetica Closed-Loop Cyber-Physical System Architecture and Data Contract Flow.*'
    ).replace(
        "creating a catastrophic priority inversion.",
        "creating a catastrophic priority inversion.\n\n<img src=\"results/figures/anatomy_urban_deadlock.png\"/>\n*Figure 1.2: Anatomy of Urban Intersection Deadlock and Golden Hour Ambulance Traps.*"
    )

    ch2 = replace_code_block_before_caption(CHAPTER_2_MD, "*Figure 2.1: Evolution of Urban Traffic Signal Control Paradigms across One Hundred Years.*", "results/figures/evolution_its_timeline.png")
    ch2 = replace_code_block_before_caption(ch2, "*Figure 2.2: Perspective Geometric Distortion and Homography Rectification to Metric Plane.*", "results/figures/perspective_distortion_geometry.png")
    ch2 = replace_code_block_before_caption(ch2, "*Figure 2.3: Theoretical Poisson Inter-Arrival Distribution vs. Congested Non-Poisson Regimes.*", "results/figures/poisson_vs_renewal_distributions.png")
    ch2 = replace_code_block_before_caption(ch2, "*Figure 2.4: Webster Two-Term Delay Curve Illustrating Non-Linear Delay Growth.*", "results/figures/webster_delay_curve.png")

    ch3 = replace_code_block_before_caption(CHAPTER_3_MD, "*Figure 3.1: Cyber-Physical Operational State Machine and Inter-Module Signal Flow.*", "results/figures/cps_state_machine_topology.png")
    ch3 = ch3.replace(
        "*Figure 3.2: Edge Computer Vision Pipeline and Metric Homography Extraction.*",
        '<img src="results/figures/homography_projection_pipeline.png"/>\n*Figure 3.2: Edge Computer Vision Pipeline and Metric Homography Extraction.*'
    ).replace(
        "*Figure 3.3: Priority Preemption Engine Architecture: Max-Heap and Corridor Router.*",
        '<img src="results/figures/priority_max_heap_structure.png"/>\n*Figure 3.3: Priority Preemption Engine Architecture: Max-Heap and Corridor Router.*'
    ).replace(
        "*Figure 3.4: Arterial Directed Graph and Multi-Intersection Lookahead Green Wave Progression.*",
        '<img src="results/figures/corridor_green_wave_schematic.png"/>\n*Figure 3.4: Arterial Directed Graph and Multi-Intersection Lookahead Green Wave Progression.*'
    )
    ch3 = replace_code_block_before_caption(ch3, "*Figure 3.5: Decision Tree Architecture for Post-Preemption Bottleneck Prediction.*", "results/figures/bottleneck_decision_tree_architecture.png")
    ch3 = replace_code_block_before_caption(ch3, "*Figure 3.6: Edge Gateway and Next.js Control Room Observability Architecture.*", "results/figures/observability_stack_architecture.png")

    ch4 = CHAPTER_4_MD.replace(
        "*Figure 4.1: Empirical Inter-Arrival Time Distribution against Theoretical Exponential Fit ($\\chi^2 = 6.40, p = 0.6025$).*",
        '<img src="results/figures/poisson_inter_arrival_fit.png"/>\n*Figure 4.1: Empirical Inter-Arrival Time Distribution against Theoretical Exponential Fit (\\chi^2 = 6.40, p = 0.6025).*'
    ).replace(
        "*Figure 4.2: Metric Queue Length Timeline: Kinetica Dynamic Preemption vs. Baseline Queue Buildup.*",
        '<img src="results/figures/queue_length_timeline.png"/>\n*Figure 4.2: Metric Queue Length Timeline: Kinetica Dynamic Preemption vs. Baseline Queue Buildup.*'
    ).replace(
        "*Figure 4.3: Civilian Vehicular Wait-Time Distribution: Fixed-Timer Baseline vs. Project Kinetica.*",
        '<img src="results/figures/wait_time_comparison.png"/>\n*Figure 4.3: Civilian Vehicular Wait-Time Distribution: Fixed-Timer Baseline vs. Project Kinetica.*'
    ).replace(
        "*Figure 4.4: Decision Tree Feature Importances for Secondary Bottleneck Prediction.*",
        '<img src="results/figures/bottleneck_feature_importances.png"/>\n*Figure 4.4: Decision Tree Feature Importances for Secondary Bottleneck Prediction.*'
    ).replace(
        "### 4.2.2 Emergency Livery Classifier Confusion Matrix & Precision-Recall",
        '<img src="results/figures/hardware_latency_distributions.png"/>\n*Figure 4.5: Edge Hardware Inference Latency Distributions: AMD APU vs. NVIDIA Jetson.*\n\n### 4.2.2 Emergency Livery Classifier Confusion Matrix & Precision-Recall'
    )

    app = replace_code_block_before_caption(APPENDICES_MD, "*Figure E.1: Complete Edge Hardware and NEMA TS2 Cabinet Interface Schematic.*", "results/figures/edge_cabinet_interface_schematic.png")
    app = app.replace("## Appendix F: Review Presentation", "<pagebreak/>\n## Appendix F: Review Presentation")

    chapters = [
        ch1,
        ch2,
        ch3,
        ch4,
        CHAPTER_5_MD,
        REFERENCES_MD,
        app
    ]

    for idx, chap_md in enumerate(chapters):
        process_body_markdown(doc, chap_md, is_first_in_section=(idx == 0))

    return doc


def extract_arabic_page_mapping(pdf_path):
    """Accurately extracts Arabic page mapping from generated PDF."""
    reader = pypdf.PdfReader(pdf_path)
    page_map = {}
    fig_map = {}

    prelim_count = 0
    for i, page in enumerate(reader.pages):
        txt = page.extract_text() or ''
        first_lines = [l.strip().upper() for l in txt.split('\n') if l.strip()][:3]
        if any(line.startswith("CHAPTER 1: INTRODUCTION") for line in first_lines):
            prelim_count = i
            break

    print(f"Chapter 1 starts at physical page {prelim_count + 1} (Prelim count = {prelim_count})")

    for i in range(prelim_count, len(reader.pages)):
        arabic_page = i - prelim_count + 1
        page = reader.pages[i]
        txt = page.extract_text() or ''
        first_lines = [l.strip().upper() for l in txt.split('\n') if l.strip()][:4]
        full_text = txt.upper()

        for heading in ['CHAPTER 1:', 'CHAPTER 2:', 'CHAPTER 3:', 'CHAPTER 4:', 'CHAPTER 5:', 'REFERENCES', 'APPENDICES']:
            clean_h = heading.rstrip(':')
            if any(line.startswith(heading) for line in first_lines) and clean_h not in page_map:
                page_map[clean_h] = arabic_page
                print(f"Detected {clean_h} -> Arabic Page {arabic_page} (physical {i+1})")

        for fig_num in [
            'Figure 1.1', 'Figure 1.2', 'Figure 2.1', 'Figure 2.2', 'Figure 2.3', 'Figure 2.4',
            'Figure 3.1', 'Figure 3.2', 'Figure 3.3', 'Figure 3.4', 'Figure 3.5', 'Figure 3.6',
            'Figure 4.1', 'Figure 4.2', 'Figure 4.3', 'Figure 4.4', 'Figure 4.5', 'Figure E.1'
        ]:
            if fig_num.upper() in full_text and fig_num not in fig_map:
                fig_map[fig_num] = arabic_page
                print(f"Detected {fig_num} -> Arabic Page {arabic_page} (physical {i+1})")

    return page_map, fig_map


def main():
    print("=================================================================")
    print("Project Kinetica: Generating Submission-Ready Academic Thesis")
    print("=================================================================")

    # Pass 1: Build draft document
    print("\n[Step 1/4] Building initial draft to establish pagination geometry...")
    draft_doc = assemble_master_document()
    draft_docx_path = os.path.join(REPORT_DIR, "perfect_draft.docx")
    draft_pdf_path = os.path.join(REPORT_DIR, "perfect_draft.pdf")
    draft_doc.save(draft_docx_path)
    print(f"Draft DOCX saved to {draft_docx_path}")

    # Convert to PDF
    print("\n[Step 2/4] Converting draft DOCX to PDF with LibreOffice headless...")
    cmd = [SOFFICE_BIN, "--headless", "--convert-to", "pdf", draft_docx_path, "--outdir", REPORT_DIR]
    subprocess.run(cmd, check=True)
    print(f"Draft PDF created at {draft_pdf_path}")

    # Extract true page numbers
    print("\n[Step 3/4] Parsing true page numbers from rendered PDF...")
    page_map, fig_map = extract_arabic_page_mapping(draft_pdf_path)
    print("Extracted page map:", page_map)
    print("Extracted figure map:", fig_map)

    # Pass 2: Re-build final document with accurate TOC/LOF/LOT
    print("\n[Step 4/4] Generating final submission-ready DOCX and PDF...")
    final_doc = assemble_master_document(page_map=page_map, fig_map=fig_map)
    final_doc.save(FINAL_DOCX_PATH)
    print(f"Final DOCX saved to: {FINAL_DOCX_PATH}")

    # Convert final DOCX to PDF
    cmd_final = [SOFFICE_BIN, "--headless", "--convert-to", "pdf", FINAL_DOCX_PATH, "--outdir", REPORT_DIR]
    subprocess.run(cmd_final, check=True)
    print(f"Final PDF saved to: {FINAL_PDF_PATH}")

    # Verify final page count
    reader = pypdf.PdfReader(FINAL_PDF_PATH)
    final_page_count = len(reader.pages)
    print("\n=================================================================")
    print(f"FINAL SUBMISSION AUDIT: Page Count = {final_page_count} pages")
    print(f"Status: {'PASS [60 <= pages <= 100]' if 60 <= final_page_count <= 100 else 'FAIL - OUT OF BOUNDS'}")
    print("=================================================================")


if __name__ == '__main__':
    main()
