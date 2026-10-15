from pathlib import Path
import cv2
from ultralytics import YOLO

MODEL_PATH = Path(__file__).parent / "models" / "best.pt"
_model = None


def get_model():
    """Load the model once and reuse it (loading is slow)."""
    global _model
    if _model is None:
        _model = YOLO(str(MODEL_PATH))
    return _model


def detect_ppe(image_path, conf=0.35, save_to=None):
    model = get_model()
    result = model.predict(image_path, conf=conf, verbose=False)[0]

    # Count how many of each class were detected
    counts = {}
    for box in result.boxes:
        name = model.names[int(box.cls)].lower()
        counts[name] = counts.get(name, 0) + 1

    # OpenCV: save the photo with boxes drawn on it
    if save_to:
        annotated = result.plot()          # image with boxes (BGR array)
        cv2.imwrite(str(save_to), annotated)

    return {
        "people": counts.get("person", 0),
        "helmets": counts.get("helmet", 0),
        "vests": counts.get("vest", 0),
        "no_helmet": counts.get("no_helmet", 0),
        "no_goggle": counts.get("no_goggle", 0),
        "no_gloves": counts.get("no_gloves", 0),
        "no_boots": counts.get("no_boots", 0),
        "all_counts": counts,
    }