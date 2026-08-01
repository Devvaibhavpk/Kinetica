# Kinetica — Vision Model Plan

This document covers the full dataset selection, training strategy, and step-by-step
Google Colab instructions for building the custom YOLO model used in `vision/`.

---

## 1. Dataset Status

| # | Name | Kaggle Link | Role | Verified |
|---|---|---|---|---|
| 1 | Top-View Vehicle Detection | [farzadnekouei/top-view-vehicle-detection-image-dataset](https://www.kaggle.com/datasets/farzadnekouei/top-view-vehicle-detection-image-dataset) | YOLO Training — standard vehicles overhead (car, bus, truck) | ✅ |
| 2 | Cars Video Object Tracking | [trainingdatapro/cars-video-object-tracking](https://www.kaggle.com/datasets/trainingdatapro/cars-video-object-tracking) | Live Stream — Intersection A urban video feed | ✅ |
| 3 | Emergency Vehicles Identification | [abhisheksinghblr/emergency-vehicles-identification](https://www.kaggle.com/datasets/abhisheksinghblr/emergency-vehicles-identification) | YOLO Training — ambulance/police classifier (**CSV format** — needs bbox conversion, see Step 3b) | ✅ |
| 4 | Intersection-Flow-5K | [starsw/intersection-flow-5k](https://www.kaggle.com/datasets/starsw/intersection-flow-5k) | Training + Inference — 6,928 images from 7 real intersections | ✅ |
| 5 | Indian Vehicle Dataset | [radhesyam/indian-vehicle-dataset](https://www.kaggle.com/datasets/radhesyam/indian-vehicle-dataset) | YOLO Training — Indian-specific vehicles (auto-rickshaws, two-wheelers) | ✅ |

> **⚠️ Dataset 3 Format Note**: This dataset uses `train.csv` with labels `0` (non-emergency) / `1` (emergency)
> and **2,352 plain images** — it is a **classification** dataset, NOT a YOLO bounding-box dataset.
> Before merging with other datasets, you must auto-generate bounding boxes (see **Step 3b** in the Colab guide below).
> Per AGENTS.md Rule 7 — document in `vision/classify.py` docstring that Dataset 3 was used as a
> classification source with auto-generated boxes, not as a hand-annotated detection dataset.

---

## 2. Pipeline Architecture

```
========================= TRAINING STAGE =========================

  ┌───────────────────────────────────────────────────────────┐
  │  Dataset 1: Top-View Vehicle Detection (standard cars)    │
  │  Dataset 3: Emergency Vehicles (ambulance/police)         │
  │  Dataset 4: Intersection-Flow-5K (7 intersection types)   │
  │  Dataset 5: Indian Vehicle Dataset (auto, two-wheelers)   │
  └──────────────────────────┬────────────────────────────────┘
                             │  Merge into unified YAML config
                             ▼
              [ Fine-Tune YOLOv8n via vision/finetune.py ]
                             │
                             ▼
                    [ weights/best.pt ]
              (detects standard + emergency + Indian vehicles)

========================= INFERENCE STAGE ========================

                             │
          ┌──────────────────┴──────────────────┐
          ▼                                     ▼
 Dataset 2: Urban Video Stream       Dataset 4: Intersection Scenes
 (trainingdatapro)                   (starsw — 7 different views)
 → Intersection A                    → Intersection B / C / D
 → vision/ingest.py                  → vision/ingest.py
          │                                     │
          └──────────────────┬──────────────────┘
                             ▼
              LaneObservation + PriorityEvent
              → actuation/engine.py
              → preemption/graph_router.py
```

---

## 3. Google Colab Training Guide (Step-by-Step)

### Prerequisites
- Google account with Google Drive
- Kaggle account (free)
- Download your Kaggle API token: Kaggle → Account → API → "Create New Token" → saves `kaggle.json`
- In Colab: **Runtime → Change runtime type → T4 GPU**

---

### Step 1 — Set Up Colab Environment

```python
# Install dependencies
!pip install ultralytics kaggle

# Mount Google Drive (to save weights persistently)
from google.colab import drive
drive.mount('/content/drive')
```

---

### Step 2 — Configure Kaggle API

```python
# Upload your kaggle.json token
from google.colab import files
files.upload()  # select your kaggle.json file

# Move it to the correct location
!mkdir -p ~/.kaggle
!cp kaggle.json ~/.kaggle/
!chmod 600 ~/.kaggle/kaggle.json

# Verify it works
!kaggle datasets list
```

---

### Step 3 — Download All 5 Datasets

```python
import os
os.makedirs('/content/datasets', exist_ok=True)

# Dataset 1 — Top-View Vehicle Detection (TRAINING)
!kaggle datasets download -d farzadnekouei/top-view-vehicle-detection-image-dataset \
    -p /content/datasets/dataset1 --unzip

# Dataset 2 — Cars Video Object Tracking (INFERENCE ONLY)
!kaggle datasets download -d trainingdatapro/cars-video-object-tracking \
    -p /content/datasets/dataset2 --unzip

# Dataset 3 — Emergency Vehicles (TRAINING) — verify link before running
!kaggle datasets download -d abhisheksinghblr/emergency-vehicles-identification \
    -p /content/datasets/dataset3 --unzip

# Dataset 4 — Intersection-Flow-5K (TRAINING + INFERENCE)
!kaggle datasets download -d starsw/intersection-flow-5k \
    -p /content/datasets/dataset4 --unzip

# Dataset 5 — Indian Vehicle Dataset (TRAINING)
!kaggle datasets download -d radhesyam/indian-vehicle-dataset \
    -p /content/datasets/dataset5 --unzip
```

---

### Step 3b — Convert Dataset 3 from CSV Classification → YOLO Bounding Box Format

Dataset 3 (`emergency-vehicles-identification`) contains **plain images + CSV labels** (0/1),
not YOLO `.txt` bounding box annotations. Run this conversion before merging.

```python
import pandas as pd
import os
from ultralytics import YOLO
from PIL import Image

# Load the CSV
df = pd.read_csv('/content/datasets/dataset3/train.csv')
# Only keep emergency vehicle images (label == 1)
emergency_df = df[df['emergency_or_not'] == 1]
print(f"Emergency vehicle images found: {len(emergency_df)}")

# Use base YOLOv8n to auto-detect vehicle bounding boxes in emergency images
# These boxes will be relabeled as 'ambulance' (class 5 in our schema)
base_model = YOLO('yolov8n.pt')

images_dir = '/content/datasets/dataset3/images'
out_images = '/content/datasets/dataset3_yolo/images'
out_labels = '/content/datasets/dataset3_yolo/labels'
os.makedirs(out_images, exist_ok=True)
os.makedirs(out_labels, exist_ok=True)

VEHICLE_COCO_IDS = {2, 3, 5, 7}  # car, motorcycle, bus, truck in COCO
AMBULANCE_CLASS_ID = 5            # class index in our kinetica.yaml

converted = 0
for _, row in emergency_df.iterrows():
    img_name = row['image_names']
    img_path = os.path.join(images_dir, img_name)

    if not os.path.exists(img_path):
        continue

    results = base_model.predict(img_path, conf=0.3, verbose=False)
    img = Image.open(img_path)
    w, h = img.size

    label_lines = []
    for box in results[0].boxes:
        cls = int(box.cls[0])
        if cls not in VEHICLE_COCO_IDS:
            continue
        # Convert to YOLO normalized format
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        xc = ((x1 + x2) / 2) / w
        yc = ((y1 + y2) / 2) / h
        bw = (x2 - x1) / w
        bh = (y2 - y1) / h
        # Relabel as ambulance (class 5)
        label_lines.append(f"{AMBULANCE_CLASS_ID} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}")

    if label_lines:
        import shutil
        shutil.copy(img_path, os.path.join(out_images, img_name))
        lbl_file = os.path.join(out_labels, img_name.replace('.jpg', '.txt').replace('.png', '.txt'))
        with open(lbl_file, 'w') as f:
            f.write('\n'.join(label_lines))
        converted += 1

print(f"Converted {converted} emergency images to YOLO format → /content/datasets/dataset3_yolo/")
```

> **AGENTS.md Rule 7 compliance**: Document in `vision/classify.py`'s `classify_priority()` docstring
> that Dataset 3 boxes were auto-generated by base YOLOv8n — they are not hand-annotated ground truth.

---

### Step 4 — Explore Downloaded Dataset Structures

```python
# Run this to see folder structures before merging
import os
for ds in ['dataset1', 'dataset3', 'dataset4', 'dataset5']:
    print(f"\n=== {ds} ===")
    for root, dirs, files in os.walk(f'/content/datasets/{ds}'):
        level = root.replace(f'/content/datasets/{ds}', '').count(os.sep)
        indent = ' ' * 2 * level
        print(f'{indent}{os.path.basename(root)}/')
        if level < 2:
            subindent = ' ' * 2 * (level + 1)
            for f in files[:5]:  # show first 5 files
                print(f'{subindent}{f}')
```

---

### Step 5 — Merge Training Datasets (1, 3, 4, 5)

```python
import shutil, os, glob

# Create unified training directories
os.makedirs('/content/kinetica_dataset/images/train', exist_ok=True)
os.makedirs('/content/kinetica_dataset/images/val', exist_ok=True)
os.makedirs('/content/kinetica_dataset/labels/train', exist_ok=True)
os.makedirs('/content/kinetica_dataset/labels/val', exist_ok=True)

def merge_dataset(src_images, src_labels, prefix):
    """Copy images and YOLO label .txt files into unified dataset."""
    imgs = glob.glob(f'{src_images}/**/*.jpg', recursive=True) + \
           glob.glob(f'{src_images}/**/*.png', recursive=True)
    for img in imgs:
        dst = f'/content/kinetica_dataset/images/train/{prefix}_{os.path.basename(img)}'
        shutil.copy(img, dst)
    for lbl in glob.glob(f'{src_labels}/**/*.txt', recursive=True):
        dst = f'/content/kinetica_dataset/labels/train/{prefix}_{os.path.basename(lbl)}'
        shutil.copy(lbl, dst)
    print(f"[{prefix}] Copied {len(imgs)} images")

# Adjust paths to match actual unzipped folder structure (check Step 4 output)
merge_dataset('/content/datasets/dataset1/images', '/content/datasets/dataset1/labels', 'd1')
merge_dataset('/content/datasets/dataset3/images', '/content/datasets/dataset3/labels', 'd3')
merge_dataset('/content/datasets/dataset4/images', '/content/datasets/dataset4/labels', 'd4')
merge_dataset('/content/datasets/dataset5/images', '/content/datasets/dataset5/labels', 'd5')

total = len(glob.glob('/content/kinetica_dataset/images/train/*'))
print(f"\nTotal merged training images: {total}")
```

---

### Step 6 — Create Dataset YAML Config

```python
yaml_content = """
path: /content/kinetica_dataset
train: images/train
val: images/val

nc: 7
names:
  0: car
  1: bus
  2: truck
  3: motorcycle
  4: auto_rickshaw
  5: ambulance
  6: police
"""

with open('/content/kinetica_dataset/kinetica.yaml', 'w') as f:
    f.write(yaml_content)

print("YAML config written to /content/kinetica_dataset/kinetica.yaml")
```

---

### Step 7 — Verify GPU and Fine-Tune YOLO

```python
import torch
print("GPU available:", torch.cuda.is_available())
print("Device:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU — switch runtime!")

from ultralytics import YOLO

# Load base YOLOv8 nano weights (pretrained on COCO)
model = YOLO('yolov8n.pt')

# Fine-tune on merged Kinetica dataset
results = model.train(
    data='/content/kinetica_dataset/kinetica.yaml',
    epochs=30,          # increase to 50-100 for production
    imgsz=640,
    batch=16,           # reduce to 8 if you see CUDA Out of Memory
    project='/content/drive/MyDrive/Kinetica',
    name='yolo_kinetica_v1',
    patience=10,        # early stopping after 10 stagnant epochs
    device=0,           # use GPU
    verbose=True
)

print("\nTraining complete!")
print(f"Best weights: /content/drive/MyDrive/Kinetica/yolo_kinetica_v1/weights/best.pt")
```

---

### Step 8 — Test Inference on Dataset 2 (Urban Video Stream)

```python
from ultralytics import YOLO

model = YOLO('/content/drive/MyDrive/Kinetica/yolo_kinetica_v1/weights/best.pt')

# Point to a video file from Dataset 2 (adjust filename after exploring dataset2 folder)
video_path = '/content/datasets/dataset2/images'  # or a specific .mp4 file

results = model.predict(
    source=video_path,
    conf=0.4,
    save=True,
    project='/content/drive/MyDrive/Kinetica',
    name='inference_test_intersection_A'
)

print("Inference complete. Check Drive for annotated output.")
```

---

### Step 9 — Test Inference on Dataset 4 (Intersection-Flow-5K)

```python
results = model.predict(
    source='/content/datasets/dataset4/images',
    conf=0.4,
    save=True,
    project='/content/drive/MyDrive/Kinetica',
    name='inference_test_intersection_BCD'
)

print("Multi-intersection inference complete.")
```

---

## 4. Local Usage After Training

Once `weights/best.pt` is downloaded from Google Drive into the repo root:

```python
# vision/detect.py usage with custom weights
from vision.detect import load_detector, detect_frame
from vision.ingest import ingest_source

# Load custom Kinetica model (Indian + Emergency + Standard vehicles)
model = load_detector("weights/best.pt")

# Feed Dataset 2 video into the pipeline
for frame in ingest_source("data/raw/intersection_a.mp4"):
    detections = detect_frame(model, frame)
    # detections now include: car, bus, truck, motorcycle,
    #                         auto_rickshaw, ambulance, police
```

Also update `data/DATASET_SOURCE.md` STATUS from `PENDING` to `ACTIVE` after first successful run.

---

## 5. Compliance Notes (AGENTS.md Rules)

| Rule | Requirement | Action |
|---|---|---|
| Rule 7 | Never label a heuristic as a trained classifier | After fine-tuning, update `vision/classify.py` docstring to say "trained YOLOv8 classifier" replacing the heuristic note |
| Rule 9 | Check `data/DATASET_SOURCE.md` before Vision work | Update STATUS to `ACTIVE` once datasets are downloaded |
| Rule 4 | Schema immutability | Adding `auto_rickshaw` class does NOT change `schemas/lane_state.py` — it maps to `VehicleClass.STANDARD` in `vision/classify.py` |
