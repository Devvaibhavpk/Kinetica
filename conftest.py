import os
import sys

# Prevent OpenMP runtime conflict and DLL initialization errors on Windows
if sys.platform == "win32":
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
    try:
        import torch
    except Exception:
        pass
