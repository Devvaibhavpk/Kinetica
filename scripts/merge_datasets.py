"""
scripts/merge_datasets.py — Unified Dataset Merger for Project Kinetica

Merges the raw datasets in data/raw/ into a unified YOLO dataset
at data/kinetica_dataset/ ready for training on Google Colab or local GPU.

Target Schema:
  0: car
  1: bus
  2: truck
  3: motorcycle
  4: auto_rickshaw
  5: ambulance
  6: police
"""

import os
import sys
from pathlib import Path

# Safe DLL loading for Windows PyTorch
if sys.platform == "win32":
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import shutil
import glob
import zipfile
import pandas as pd
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT_DIR / "data" / "raw"
OUTPUT_DIR = ROOT_DIR / "data" / "kinetica_dataset"

# Target directories
TRAIN_IMG = OUTPUT_DIR / "images" / "train"
VAL_IMG = OUTPUT_DIR / "images" / "val"
TRAIN_LBL = OUTPUT_DIR / "labels" / "train"
VAL_LBL = OUTPUT_DIR / "labels" / "val"

def init_output_dirs():
    if OUTPUT_DIR.exists():
        print(f"Cleaning existing output directory: {OUTPUT_DIR}")
        shutil.rmtree(OUTPUT_DIR)
    for p in [TRAIN_IMG, VAL_IMG, TRAIN_LBL, VAL_LBL]:
        p.mkdir(parents=True, exist_ok=True)
    print("Initialized clean output directories.")

def process_dataset_1_vehicle_detection():
    """
    Dataset 1: Vehicle_Detection_Image_Dataset
    Raw Class: 0 (Vehicle) -> Maps to 0 (car)
    """
    ds_dir = RAW_DIR / "Vehicle_Detection_Image_Dataset"
    if not ds_dir.exists():
        print(f"[SKIP] Dataset 1 not found at {ds_dir}")
        return 0, 0

    print("\n--- Processing Dataset 1: Top-View Vehicle Detection ---")
    train_count = 0
    val_count = 0

    # Train split
    train_imgs = glob.glob(str(ds_dir / "train" / "images" / "*.*"))
    for img_path in train_imgs:
        base = os.path.basename(img_path)
        stem = os.path.splitext(base)[0]
        lbl_path = ds_dir / "train" / "labels" / f"{stem}.txt"
        if lbl_path.exists():
            dst_img = TRAIN_IMG / f"d1_{base}"
            dst_lbl = TRAIN_LBL / f"d1_{stem}.txt"
            shutil.copy(img_path, dst_img)
            shutil.copy(lbl_path, dst_lbl)
            train_count += 1

    # Valid split
    val_imgs = glob.glob(str(ds_dir / "valid" / "images" / "*.*"))
    for img_path in val_imgs:
        base = os.path.basename(img_path)
        stem = os.path.splitext(base)[0]
        lbl_path = ds_dir / "valid" / "labels" / f"{stem}.txt"
        if lbl_path.exists():
            dst_img = VAL_IMG / f"d1_{base}"
            dst_lbl = VAL_LBL / f"d1_{stem}.txt"
            shutil.copy(img_path, dst_img)
            shutil.copy(lbl_path, dst_lbl)
            val_count += 1

    print(f"Dataset 1 Done: {train_count} train images, {val_count} val images.")
    return train_count, val_count

def process_dataset_4_intersection_flow():
    """
    Dataset 4: Intersection-Flow-5K
    Raw Classes:
      0: vehicle    -> 0 (car)
      1: bus        -> 1 (bus)
      2: bicycle    -> SKIP
      3: pedestrian -> SKIP
      4: engine     -> 3 (motorcycle)
      5: truck      -> 2 (truck)
      6: tricycle   -> 4 (auto_rickshaw)
      7: obstacle   -> SKIP
    """
    ds_dir = RAW_DIR / "Intersection-Flow-5K"
    if not ds_dir.exists():
        print(f"[SKIP] Dataset 4 not found at {ds_dir}")
        return 0, 0

    print("\n--- Processing Dataset 4: Intersection-Flow-5K ---")
    mapping = {
        0: 0,  # vehicle -> car
        1: 1,  # bus -> bus
        4: 3,  # engine -> motorcycle
        5: 2,  # truck -> truck
        6: 4,  # tricycle -> auto_rickshaw
    }

    train_count = 0
    val_count = 0

    def process_split(split_name, dst_img_dir, dst_lbl_dir):
        count = 0
        img_dir = ds_dir / "images" / split_name
        lbl_dir = ds_dir / "labels" / split_name
        if not img_dir.exists() or not lbl_dir.exists():
            return 0

        img_files = [f for f in os.listdir(img_dir) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
        for f in img_files:
            stem = os.path.splitext(f)[0]
            lbl_file = lbl_dir / f"{stem}.txt"
            if not lbl_file.exists():
                continue

            # Read and remap annotations
            valid_lines = []
            with open(lbl_file, "r") as rfh:
                for line in rfh:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        raw_cls = int(float(parts[0]))
                        if raw_cls in mapping:
                            new_cls = mapping[raw_cls]
                            coords = " ".join(parts[1:5])
                            valid_lines.append(f"{new_cls} {coords}")

            if valid_lines:
                shutil.copy(img_dir / f, dst_img_dir / f"d4_{f}")
                with open(dst_lbl_dir / f"d4_{stem}.txt", "w") as wfh:
                    wfh.write("\n".join(valid_lines) + "\n")
                count += 1
        return count

    train_count = process_split("train", TRAIN_IMG, TRAIN_LBL)
    val_count = process_split("val", VAL_IMG, VAL_LBL)
    print(f"Dataset 4 Done: {train_count} train images, {val_count} val images.")
    return train_count, val_count

def process_dataset_3_emergency_vehicles(base_model=None):
    """
    Dataset 3: Emergency_Vehicles
    Uses train.csv (emergency_or_not == 1) + YOLO detection to generate
    bounding boxes for ambulance (class 5).
    """
    ds_dir = RAW_DIR / "Emergency_Vehicles"
    csv_path = ds_dir / "train.csv"
    img_dir = ds_dir / "train"

    if not csv_path.exists() or not img_dir.exists():
        print(f"[SKIP] Dataset 3 not found at {ds_dir}")
        return 0, 0

    print("\n--- Processing Dataset 3: Emergency Vehicles (Classification -> Bounding Boxes) ---")
    df = pd.read_csv(csv_path)
    emergency_df = df[df["emergency_or_not"] == 1]
    print(f"Found {len(emergency_df)} emergency vehicle records.")

    AMBULANCE_CLS_ID = 5
    VEHICLE_COCO_IDS = {2, 3, 5, 7}  # car, motorcycle, bus, truck in COCO

    converted = 0
    records = emergency_df.to_dict(orient="records")

    # 80/20 train/val split
    split_idx = int(len(records) * 0.8)

    train_count = 0
    val_count = 0

    for idx, row in enumerate(records):
        img_name = row["image_names"]
        img_path = img_dir / img_name
        if not img_path.exists():
            continue

        label_lines = []
        try:
            if base_model is not None:
                results = base_model.predict(str(img_path), conf=0.25, verbose=False)
                with Image.open(img_path) as img:
                    w, h = img.size

                for box in results[0].boxes:
                    cls_id = int(box.cls[0])
                    if cls_id in VEHICLE_COCO_IDS:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        xc = ((x1 + x2) / 2.0) / w
                        yc = ((y1 + y2) / 2.0) / h
                        bw = (x2 - x1) / w
                        bh = (y2 - y1) / h
                        label_lines.append(f"{AMBULANCE_CLS_ID} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}")
        except Exception:
            pass

        # If base model missed or not available, use centered bounding box
        if not label_lines:
            label_lines.append(f"{AMBULANCE_CLS_ID} 0.500000 0.500000 0.800000 0.700000")

        is_train = idx < split_idx
        dst_img = (TRAIN_IMG if is_train else VAL_IMG) / f"d3_{img_name}"
        stem = os.path.splitext(img_name)[0]
        dst_lbl = (TRAIN_LBL if is_train else VAL_LBL) / f"d3_{stem}.txt"

        shutil.copy(img_path, dst_img)
        with open(dst_lbl, "w") as fh:
            fh.write("\n".join(label_lines) + "\n")

        if is_train:
            train_count += 1
        else:
            val_count += 1
        converted += 1

    print(f"Dataset 3 Done: {train_count} train images, {val_count} val images (Total {converted}).")
    return train_count, val_count

def process_dataset_5_ivdb(base_model=None):
    """
    Dataset 5: IVDB (Indian Vehicle Dataset - Auto-Rickshaws)
    Uses auto_test images -> Class 4 (auto_rickshaw)
    """
    ds_dir = RAW_DIR / "IVDB" / "auto_test"
    if not ds_dir.exists():
        print(f"[SKIP] Dataset 5 not found at {ds_dir}")
        return 0, 0

    print("\n--- Processing Dataset 5: Indian Vehicles (Auto-Rickshaws) ---")
    imgs = [f for f in os.listdir(ds_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    AUTO_CLS_ID = 4
    train_count = 0
    val_count = 0

    split_idx = int(len(imgs) * 0.8)

    for idx, f in enumerate(imgs):
        img_path = ds_dir / f
        label_lines = []
        try:
            if base_model is not None:
                results = base_model.predict(str(img_path), conf=0.20, verbose=False)
                with Image.open(img_path) as img:
                    w, h = img.size

                for box in results[0].boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    xc = ((x1 + x2) / 2.0) / w
                    yc = ((y1 + y2) / 2.0) / h
                    bw = (x2 - x1) / w
                    bh = (y2 - y1) / h
                    label_lines.append(f"{AUTO_CLS_ID} {xc:.6f} {yc:.6f} {bw:.6f} {bh:.6f}")
        except Exception:
            pass

        if not label_lines:
            label_lines.append(f"{AUTO_CLS_ID} 0.500000 0.500000 0.750000 0.700000")

        is_train = idx < split_idx
        dst_img = (TRAIN_IMG if is_train else VAL_IMG) / f"d5_{f}"
        stem = os.path.splitext(f)[0]
        dst_lbl = (TRAIN_LBL if is_train else VAL_LBL) / f"d5_{stem}.txt"

        shutil.copy(img_path, dst_img)
        with open(dst_lbl, "w") as fh:
            fh.write("\n".join(label_lines) + "\n")

        if is_train:
            train_count += 1
        else:
            val_count += 1

    print(f"Dataset 5 Done: {train_count} train images, {val_count} val images.")
    return train_count, val_count

def write_kinetica_yaml():
    yaml_path = OUTPUT_DIR / "kinetica.yaml"
    content = """# Kinetica Unified Traffic Perception Dataset
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
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"\nCreated {yaml_path}")

def create_zip_archive():
    zip_path = ROOT_DIR / "data" / "kinetica_dataset.zip"
    print(f"\nCompressing merged dataset into: {zip_path}")
    print("This may take 1-2 minutes...")

    file_count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(OUTPUT_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ROOT_DIR / "data")
                zipf.write(full_path, rel_path)
                file_count += 1
                if file_count % 1000 == 0:
                    print(f"  Zipped {file_count} files...")

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Successfully created {zip_path} ({size_mb:.1f} MB, {file_count} total files).")

def main():
    print("==================================================")
    print("   PROJECT KINETICA: MULTI-DATASET MERGER")
    print("==================================================")

    init_output_dirs()

    base_model = None
    try:
        from ultralytics import YOLO
        print("\nLoading base YOLOv8n model for annotation conversion...")
        base_model = YOLO("yolov8n.pt")
        print("Base model loaded successfully.")
    except Exception as e:
        print(f"\nNote: Base YOLO model skipped ({e}), using geometric bounding box generator.")

    t1, v1 = process_dataset_1_vehicle_detection()
    t4, v4 = process_dataset_4_intersection_flow()
    t3, v3 = process_dataset_3_emergency_vehicles(base_model)
    t5, v5 = process_dataset_5_ivdb(base_model)

    write_kinetica_yaml()

    total_train = len(os.listdir(TRAIN_IMG))
    total_val = len(os.listdir(VAL_IMG))
    print("\n==================================================")
    print(f"  MERGE SUMMARY:")
    print(f"  Total Train Images: {total_train}")
    print(f"  Total Val Images:   {total_val}")
    print(f"  Grand Total Images: {total_train + total_val}")
    print("==================================================")

    create_zip_archive()

if __name__ == "__main__":
    main()
