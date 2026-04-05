from ultralytics import YOLO
import numpy as np
import cv2

# Load model sekali saja saat server start
model = YOLO("best.pt")

# Sesuaikan dengan nama class di model YOLO kamu
PRODUCT_CLASSES = ["Product A", "Product B", "Product C", "Product D"]
GOOD_CLASSES = ["good_A", "good_B", "good_C", "good_D"]
BAD_CLASSES  = ["bad_A",  "bad_B",  "bad_C",  "bad_D"]

def run_detection(image_bytes: bytes) -> dict:
    # Convert bytes ke numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model(img)[0]
    detections = []

    for box in results.boxes:
        class_name = model.names[int(box.cls)]
        confidence = float(box.conf)

        # Tentukan label good/bad dan nama produk
        # Sesuaikan logika ini dengan nama class model kamu
        if "good" in class_name.lower():
            label = "good"
        elif "bad" in class_name.lower() or "defect" in class_name.lower():
            label = "bad"
        else:
            continue

        # Ambil nama produk dari class name
        # Contoh: "good_ProductA" → "Product A"
        product = class_name.replace("good_", "").replace("bad_", "")

        detections.append({
            "product": product,
            "label": label,
            "confidence": round(confidence * 100, 1),
            "bbox": box.xyxy[0].tolist()
        })

    return {"detections": detections}