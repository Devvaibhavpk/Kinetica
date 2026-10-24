# Google Colab Training Guide — Project Kinetica

This guide walks you through fine-tuning your custom **YOLOv8 Nano (7-class)** edge traffic perception model on Google Colab using your 5 merged datasets.

---

## 1. What Has Been Merged & Packaged

Your 5 datasets from `data/raw/` have been processed, cleaned, and unified into **`F:\project\Kinetica\data\kinetica_dataset.zip`**:

| Dataset | Raw Source | Processed Content & Mapping | Target Classes |
|---|---|---|---|
| **Dataset 1** | `Vehicle_Detection_Image_Dataset` | 626 overhead CCTV images (536 train / 90 val) | `0: car` |
| **Dataset 2** | `Car Tracking & Object Detection Dataset` | 301-frame continuous 1080p video sequence | **Preserved as test inference stream** |
| **Dataset 3** | `Emergency_Vehicles` | 681 emergency vehicles with auto-generated bounding boxes | `5: ambulance` |
| **Dataset 4** | `Intersection-Flow-5K` | ~6,200 junction images remapped from 8 classes | `0: car`, `1: bus`, `2: truck`, `3: motorcycle`, `4: auto_rickshaw` |
| **Dataset 5** | `IVDB` | 23 auto-rickshaw images | `4: auto_rickshaw` |

### Unified 7-Class Schema (`kinetica.yaml`):
```yaml
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
```

---

## 2. Step-by-Step Training Instructions (3 Simple Steps)

### Step 1: Open Google Colab & Select Free T4 GPU
1. Go to **[colab.research.google.com](https://colab.research.google.com)**.
2. Click **Upload** and select the prepared notebook:  
   `F:\project\Kinetica\notebooks\Train_Kinetica_YOLOv8_Colab.ipynb`
3. In Colab's top menu bar, go to:  
   **Runtime → Change runtime type → Hardware accelerator → T4 GPU → Save**.

---

### Step 2: Automatic Dataset Ingestion from Google Drive
You do **not** need to manually upload the 5.3 GB zip file to Colab!
The notebook is pre-configured with your Google Drive download link:
`https://drive.google.com/file/d/1Hxr0KxgEZFwatjf50VtIZNigci1dfie9/view?usp=sharing`

When you run Cell 3, it automatically uses `gdown` to download and unzip the dataset into Colab storage in ~1-2 minutes at high speed.

---

### Step 3: Run All Cells & Download `best.pt`
1. Click **Runtime → Run all** (or press `Ctrl + F9`).
2. Training will run for **35 epochs** on the T4 GPU (takes approximately **25 to 35 minutes**).
3. Once training completes, the notebook will:
   - Evaluate validation mAP scores.
   - Export an ONNX version for edge deployment.
   - **Automatically download `best.pt`** directly to your browser's Downloads folder!

---

## 3. After Training: Deploying Weights Locally

Once `best.pt` finishes downloading:
1. Create a `weights/` folder in your project (if not already present):  
   `F:\project\Kinetica\weights\`
2. Move the downloaded `best.pt` file to:  
   `F:\project\Kinetica\weights\best.pt`
3. That's it! Kinetica's Vision Monitor, ROIManager, and live WebSocket feed will immediately load your custom-trained weights.
