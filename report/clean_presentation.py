"""
Cleans and standardizes all text, glyphs, and character encodings in Kinetica_Project_Review_Presentation.pptx.
Ensures zero replacement chars or broken bullets across all platforms.
"""
import os
import subprocess
import pptx

PPTX_PATH = os.path.join(os.path.dirname(__file__), "Kinetica_Project_Review_Presentation.pptx")
PDF_PATH = os.path.join(os.path.dirname(__file__), "Kinetica_Project_Review_Presentation.pdf")
SOFFICE_BIN = r"C:\Program Files\LibreOffice\program\soffice.com"

def clean_presentation():
    prs = pptx.Presentation(PPTX_PATH)
    changed_count = 0

    for slide_idx, slide in enumerate(prs.slides):
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            tf = shape.text_frame
            for p in tf.paragraphs:
                for r in p.runs:
                    orig_text = r.text
                    new_text = orig_text
                    # Replace em-dash / en-dash with clean hyphen / dashes
                    new_text = new_text.replace('\u2014', ' - ')
                    new_text = new_text.replace('\u2013', '-')
                    new_text = new_text.replace('\u2022', '-')
                    new_text = new_text.replace('\ufffd', '-')
                    new_text = new_text.replace('\u2018', "'").replace('\u2019', "'")
                    new_text = new_text.replace('\u201c', '"').replace('\u201d', '"')
                    
                    if new_text != orig_text:
                        r.text = new_text
                        changed_count += 1
                    
                    # Ensure font family is standard
                    if not r.font.name:
                        r.font.name = 'Calibri'

    prs.save(PPTX_PATH)
    print(f"Cleaned PPTX saved. Updated {changed_count} text runs.")

    # Convert to PDF
    if os.path.exists(SOFFICE_BIN):
        cmd = [SOFFICE_BIN, "--headless", "--convert-to", "pdf", PPTX_PATH, "--outdir", os.path.dirname(PPTX_PATH)]
        subprocess.run(cmd, check=True)
        print("Exported clean PDF to:", PDF_PATH)

if __name__ == '__main__':
    clean_presentation()
