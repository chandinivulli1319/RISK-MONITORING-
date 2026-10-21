from pathlib import Path

MODEL_PATH = Path(__file__).parent / "models" / "best.pt"
_model = None


def get_model():
    """Load the trained YOLO model once and reuse it (loading is slow)."""
    global _model
    if _model is None:
        from ultralytics import YOLO
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model file not found. Put best.pt inside {MODEL_PATH.parent}"
            )
        _model = YOLO(str(MODEL_PATH))
    return _model


def detect_ppe(image_path, conf=0.35, save_to=None):
    """Run the trained model on one photo and count what it finds."""
    import cv2

    model = get_model()
    result = model.predict(str(image_path), conf=conf, verbose=False)[0]

    counts = {}
    for box in result.boxes:
        name = model.names[int(box.cls)].lower()
        counts[name] = counts.get(name, 0) + 1

    if save_to:
        cv2.imwrite(str(save_to), result.plot())   # OpenCV saves the photo with boxes drawn

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
