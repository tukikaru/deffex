from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from detector import run_detection
import uvicorn

app = FastAPI()

# Allow Next.js to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simpan counter di memory (simple, no database)
counters = {
    "Product A": {"good": 0, "bad": 0},
    "Product B": {"good": 0, "bad": 0},
    "Product C": {"good": 0, "bad": 0},
    "Product D": {"good": 0, "bad": 0},
}

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """Terima gambar, jalankan YOLO, return hasil deteksi"""
    image_bytes = await file.read()
    results = run_detection(image_bytes)  # dari detector.py

    # Update counter berdasarkan hasil
    for item in results["detections"]:
        product = item["product"]
        label = item["label"]  # "good" atau "bad"
        if product in counters:
            counters[product][label] += 1

    return {
        "detections": results["detections"],
        "counters": counters
    }

@app.get("/counters")
def get_counters():
    """Ambil semua counter produk"""
    return counters

@app.post("/reset")
def reset_counters():
    """Reset semua counter ke 0"""
    for product in counters:
        counters[product] = {"good": 0, "bad": 0}
    return {"message": "Counters reset"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)