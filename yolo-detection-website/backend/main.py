import cv2
import torch
import threading
import time
from ultralytics import YOLO
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

# =========================
# Konfigurasi
# =========================
VIDEO_INDEX   = 1
MODEL_PATH    = "best.pt"
MODEL_CONF    = 0.70
LINE_COLOR    = (0, 255, 255)   # Kuning - garis tengah
LINE_THICKNESS = 2

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Device
# =========================
def get_best_device():
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif torch.backends.mps.is_available():
        return torch.device("mps")
    else:
        return torch.device("cpu")

# =========================
# Load Model
# =========================
model = YOLO(MODEL_PATH)
model.to(get_best_device())
print("\n=============================")
print("CLASS NAMES:", model.names)
print("=============================\n")

# =========================
# Auto Build Mapping
# =========================
def build_mapping(names: dict):
    product_map = {}
    label_map   = {}
    suffix_to_product = {
        "a": "Product A", "b": "Product B",
        "c": "Product C", "d": "Product D",
        "1": "Product A", "2": "Product B",
        "3": "Product C", "4": "Product D",
    }
    for idx, name in names.items():
        name_lower = name.lower()
        if "good" in name_lower:
            label = "good"
        elif "bad" in name_lower or "defect" in name_lower:
            label = "bad"
        else:
            print(f"[WARNING] Class '{name}' tidak dikenali, dilewati")
            continue
        product = "Product A"
        parts = name_lower.replace("good","").replace("bad","").replace("defect","").strip("_- ")
        if parts in suffix_to_product:
            product = suffix_to_product[parts]
        product_map[name] = product
        label_map[name]   = label
        print(f"  '{name}' → {product} | {label}")
    return product_map, label_map

PRODUCT_MAP, LABEL_MAP = build_mapping(model.names)

# =========================
# Counter & Tracking State
# =========================
counters = {
    "Product A": {"good": 0, "bad": 0},
    "Product B": {"good": 0, "bad": 0},
    "Product C": {"good": 0, "bad": 0},
    "Product D": {"good": 0, "bad": 0},
}
counter_lock = threading.Lock()

# Simpan posisi X terakhir tiap track_id
# {track_id: {"x": float, "class": str}}
prev_positions = {}
tracking_lock  = threading.Lock()

latest_frame = None
frame_lock   = threading.Lock()

# =========================
# Detection + Line Crossing Loop
# =========================
def detection_loop():
    global latest_frame

    cap = cv2.VideoCapture(VIDEO_INDEX, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    if not cap.isOpened():
        print("[ERROR] Kamera tidak bisa dibuka!")
        return

    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Posisi garis vertical di tengah frame
    line_x = frame_w // 2

    print(f"Frame: {frame_w}x{frame_h} | Garis di X={line_x}\n")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            continue

        results = model.track(
            frame,
            conf=MODEL_CONF,
            persist=True,
            verbose=False
        )[0]

        crossed_this_frame = []  # Untuk animasi flash garis

        if results.boxes.id is not None:
            for box in results.boxes:
                track_id   = int(box.id)
                class_name = model.names[int(box.cls)]
                product    = PRODUCT_MAP.get(class_name)
                label      = LABEL_MAP.get(class_name)

                if not product or not label:
                    continue

                # Ambil center X objek saat ini
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2

                with tracking_lock:
                    prev = prev_positions.get(track_id)

                    if prev is not None:
                        prev_x = prev["x"]

                        # Cek apakah objek BARU SAJA melewati garis
                        # Arah kiri→kanan: prev_x < line_x dan center_x >= line_x
                        # Arah kanan→kiri: prev_x > line_x dan center_x <= line_x
                        crossed_left_to_right = prev_x < line_x <= center_x
                        crossed_right_to_left = prev_x > line_x >= center_x

                        if crossed_left_to_right or crossed_right_to_left:
                            with counter_lock:
                                counters[product][label] += 1
                            direction = "→" if crossed_left_to_right else "←"
                            print(f"[CROSS] ID#{track_id} {direction} | {class_name} | {product} | {label}")
                            crossed_this_frame.append((int(center_x), int(center_y), label))

                    # Update posisi terakhir
                    prev_positions[track_id] = {"x": center_x, "class": class_name}

        # =========================
        # Gambar Annotasi di Frame
        # =========================
        annotated = results.plot()

        # Gambar garis vertical di tengah
        line_color = LINE_COLOR
        if crossed_this_frame:
            line_color = (0, 255, 0)  # Flash hijau saat ada yang lewat

        cv2.line(annotated, (line_x, 0), (line_x, frame_h), line_color, LINE_THICKNESS)

        # Label garis
        cv2.putText(annotated, "COUNT LINE", (line_x + 8, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, line_color, 2)

        # Tanda panah zona kiri & kanan
        cv2.putText(annotated, "[ IN ]", (line_x - 90, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)
        cv2.putText(annotated, "[ OUT ]", (line_x + 50, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

        # Lingkaran flash saat objek melewati garis
        for cx, cy, lbl in crossed_this_frame:
            color = (0, 255, 0) if lbl == "good" else (0, 0, 255)
            cv2.circle(annotated, (line_x, cy), 10, color, -1)

        with frame_lock:
            latest_frame = annotated.copy()

        # Bersihkan ID yang sudah lama hilang dari frame
        # agar memori tidak membengkak
        if results.boxes.id is not None:
            active_ids = {int(b.id) for b in results.boxes}
        else:
            active_ids = set()

        with tracking_lock:
            stale = [tid for tid in prev_positions if tid not in active_ids]
            for tid in stale:
                del prev_positions[tid]

    cap.release()

thread = threading.Thread(target=detection_loop, daemon=True)
thread.start()

# =========================
# MJPEG Stream
# =========================
def generate_frames():
    while True:
        with frame_lock:
            frame = latest_frame
        if frame is None:
            time.sleep(0.03)
            continue
        success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not success:
            continue
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )

# =========================
# Endpoints
# =========================
@app.get("/stream")
def stream():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/counters")
def get_counters():
    with counter_lock:
        return dict(counters)

@app.post("/reset")
def reset_counters():
    with counter_lock, tracking_lock:
        for product in counters:
            counters[product] = {"good": 0, "bad": 0}
        prev_positions.clear()
    print("[RESET] Counter dan tracking direset")
    return {"message": "Reset berhasil"}

@app.get("/debug")
def debug():
    return {
        "model_names": model.names,
        "product_map": PRODUCT_MAP,
        "label_map":   LABEL_MAP,
        "active_tracks": len(prev_positions),
        "counters": counters,
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)