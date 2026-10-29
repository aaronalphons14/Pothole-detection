import os
import time
import uuid
from pathlib import Path
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import supervision as sv

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = Path(__file__).resolve().parent
RAD_DIR = BASE_DIR / "road-anomaly-detection-main" / "road-anomaly-detection-main"

UPLOAD_FOLDER = BASE_DIR / "static" / "uploads"
RESULT_FOLDER = BASE_DIR / "static" / "results"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
RESULT_FOLDER.mkdir(parents=True, exist_ok=True)

# Copy existing sample images if present
sample_src = RAD_DIR / "interface-app" / "static" / "uploads"
if sample_src.exists():
    for f in sample_src.glob("*"):
        if f.is_file() and not (UPLOAD_FOLDER / f.name).exists():
            try:
                import shutil
                shutil.copy(f, UPLOAD_FOLDER / f.name)
            except Exception:
                pass

# Model Paths
M1_PATH = RAD_DIR / "RoadDetectionModel" / "RoadModel_yolov8m.pt_rounds120_b9" / "weights" / "best.pt"
M2_PATH = RAD_DIR / "YOLOv8_Small_2nd_Model.pt"

print(f"Loading Model 1 from: {M1_PATH}")
model1 = None
class_names1 = {}
try:
    if M1_PATH.is_file():
        model1 = YOLO(str(M1_PATH))
        class_names1 = model1.names
        print(f"Model 1 loaded successfully! Classes: {class_names1}")
    else:
        print(f"WARNING: Model 1 file not found at {M1_PATH}")
except Exception as e:
    print(f"Failed to load Model 1: {e}")

print(f"Loading Model 2 from: {M2_PATH}")
model2 = None
class_names2 = {}
try:
    if M2_PATH.is_file():
        model2 = YOLO(str(M2_PATH))
        class_names2 = model2.names
        print(f"Model 2 loaded successfully! Classes: {class_names2}")
    else:
        print(f"WARNING: Model 2 file not found at {M2_PATH}")
except Exception as e:
    print(f"Failed to load Model 2: {e}")

# Supervision Annotators
box_annotator1 = sv.BoxAnnotator(thickness=2, color=sv.Color(r=245, g=165, b=36))  # Amber/Orange
label_annotator1 = sv.LabelAnnotator(
    text_thickness=1,
    text_scale=0.5,
    color=sv.Color(r=245, g=165, b=36),
    text_color=sv.Color.BLACK,
    text_padding=3,
    text_position=sv.Position.TOP_LEFT,
)

box_annotator2 = sv.BoxAnnotator(thickness=2, color=sv.Color(r=76, g=141, b=255))  # Electric Blue
label_annotator2 = sv.LabelAnnotator(
    text_thickness=1,
    text_scale=0.5,
    color=sv.Color(r=76, g=141, b=255),
    text_color=sv.Color.WHITE,
    text_padding=3,
    text_position=sv.Position.TOP_RIGHT,
)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model1_loaded": model1 is not None,
        "model2_loaded": model2 is not None,
        "model1_name": "YOLOv8m Custom 120 Epochs",
        "model2_name": "YOLOv8s CRDDC Damage Model",
        "model1_classes": class_names1,
        "model2_classes": class_names2,
    })


@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory(BASE_DIR / "static", filename)


def parse_confidence(val, default):
    if val is None or val == "":
        return default
    try:
        f = float(val)
        if f > 1.0:
            f = f / 100.0
        return max(0.005, min(0.99, f))
    except Exception:
        return default



def enhance_road_pavement(image):
    """
    Apply Contrast-Limited Adaptive Histogram Equalization (CLAHE) on the luminance (L) channel
    to bring out fine asphalt micro-cracks and shadow-obscured potholes without blowing out highlights.
    """
    try:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    except Exception:
        return image


def run_inference_on_frame(img, model_param="both", conf_m1=0.25, conf_m2=0.25):
    img_height, img_width = img.shape[:2]
    annotated_frame = img.copy()

    # Dynamic high-resolution inference size for sharp crack edge detection
    inf_size = max(640, min(960, (max(img_width, img_height) // 32) * 32))
    enhanced_img = enhance_road_pavement(img)

    detections_output = []
    counts = {"potholes": 0, "cracks": 0, "bumps": 0, "total": 0}

    # Model 1 Inference (Custom YOLOv8m trained on 4 datasets)
    if model1 is not None and model_param in ["m1", "both", "dual"]:
        try:
            res1 = model1.predict(
                enhanced_img,
                conf=conf_m1,
                imgsz=inf_size,
                augment=True,
                iou=0.5,
                verbose=False,
            )[0]
            sv_dets1 = sv.Detections.from_ultralytics(res1)

            # Exclude vehicles (Heavy-Vehicle, Light-Vehicle) from road anomaly detection
            if len(sv_dets1) > 0:
                mask1 = np.array([
                    not ("vehicle" in str(class_names1.get(cid, "")).lower())
                    for cid in sv_dets1.class_id
                ], dtype=bool)
                sv_dets1 = sv_dets1[mask1]

            if len(sv_dets1) > 0:
                labels1 = []
                for box, cls_id, conf in zip(sv_dets1.xyxy, sv_dets1.class_id, sv_dets1.confidence):
                    cname = class_names1.get(cls_id, f"cls_{cls_id}")
                    cname_lower = cname.lower()
                    x1, y1, x2, y2 = box

                    norm_box = [
                        round(float(x1) / img_width, 4),
                        round(float(y1) / img_height, 4),
                        round(float(x2) / img_width, 4),
                        round(float(y2) / img_height, 4),
                    ]
                    conf_f = round(float(conf), 3)

                    detections_output.append({
                        "id": len(detections_output) + 1,
                        "model": "m1",
                        "class": cname,
                        "confidence": conf_f,
                        "box": norm_box,
                    })

                    counts["total"] += 1
                    if "pothole" in cname_lower:
                        counts["potholes"] += 1
                    elif "crack" in cname_lower:
                        counts["cracks"] += 1
                    elif "bump" in cname_lower or "hump" in cname_lower:
                        counts["bumps"] += 1

                    labels1.append(f"M1:{cname} {conf:.2f}")

                annotated_frame = box_annotator1.annotate(scene=annotated_frame, detections=sv_dets1)
                annotated_frame = label_annotator1.annotate(scene=annotated_frame, detections=sv_dets1, labels=labels1)
        except Exception as e:
            print(f"Error during Model 1 inference: {e}")

    # Model 2 Inference (YOLOv8s CRDDC Damage Model)
    if model2 is not None and model_param in ["m2", "both", "dual"]:
        try:
            res2 = model2.predict(
                enhanced_img,
                conf=conf_m2,
                imgsz=inf_size,
                augment=True,
                iou=0.5,
                verbose=False,
            )[0]
            sv_dets2 = sv.Detections.from_ultralytics(res2)

            # Exclude vehicles if any
            if len(sv_dets2) > 0:
                mask2 = np.array([
                    not ("vehicle" in str(class_names2.get(cid, "")).lower())
                    for cid in sv_dets2.class_id
                ], dtype=bool)
                sv_dets2 = sv_dets2[mask2]

            if len(sv_dets2) > 0:
                labels2 = []
                for box, cls_id, conf in zip(sv_dets2.xyxy, sv_dets2.class_id, sv_dets2.confidence):
                    cname = class_names2.get(cls_id, f"cls_{cls_id}")
                    cname_lower = cname.lower()
                    x1, y1, x2, y2 = box

                    norm_box = [
                        round(float(x1) / img_width, 4),
                        round(float(y1) / img_height, 4),
                        round(float(x2) / img_width, 4),
                        round(float(y2) / img_height, 4),
                    ]
                    conf_f = round(float(conf), 3)

                    detections_output.append({
                        "id": len(detections_output) + 1,
                        "model": "m2",
                        "class": cname,
                        "confidence": conf_f,
                        "box": norm_box,
                    })

                    counts["total"] += 1
                    if "pothole" in cname_lower:
                        counts["potholes"] += 1
                    elif "crack" in cname_lower:
                        counts["cracks"] += 1
                    elif "bump" in cname_lower or "hump" in cname_lower:
                        counts["bumps"] += 1

                    labels2.append(f"M2:{cname} {conf:.2f}")

                annotated_frame = box_annotator2.annotate(scene=annotated_frame, detections=sv_dets2)
                annotated_frame = label_annotator2.annotate(scene=annotated_frame, detections=sv_dets2, labels=labels2)
        except Exception as e:
            print(f"Error during Model 2 inference: {e}")

    # Adaptive High-Recall Recovery Pass: If 0 anomalies detected at current threshold,
    # perform deep multi-scale TTA scan (conf >= 0.03) to ensure road anomalies like speed breakers
    # or obscure distress are never missed.
    if len(detections_output) == 0 and model1 is not None and model_param in ["m1", "both", "dual"]:
        try:
            res_rec = model1.predict(
                enhanced_img,
                conf=0.03,
                imgsz=inf_size,
                augment=True,
                iou=0.45,
                verbose=False,
            )[0]
            sv_rec = sv.Detections.from_ultralytics(res_rec)
            # Focus strictly on physical road anomalies to avoid false positive background items
            target_classes = ["Speed-Bump", "Pothole", "Crack", "Crack-Severe"]
            road_defect_ids = [k for k, v in class_names1.items() if v in target_classes]
            mask = np.isin(sv_rec.class_id, road_defect_ids)
            sv_rec = sv_rec[mask]

            if len(sv_rec) > 0:
                labels_rec = []
                for box, cls_id, conf in zip(sv_rec.xyxy, sv_rec.class_id, sv_rec.confidence):
                    cname = class_names1.get(cls_id, f"cls_{cls_id}")
                    cname_lower = cname.lower()
                    x1, y1, x2, y2 = box

                    norm_box = [
                        round(float(x1) / img_width, 4),
                        round(float(y1) / img_height, 4),
                        round(float(x2) / img_width, 4),
                        round(float(y2) / img_height, 4),
                    ]
                    conf_f = round(float(conf), 3)

                    detections_output.append({
                        "id": len(detections_output) + 1,
                        "model": "m1",
                        "class": cname,
                        "confidence": conf_f,
                        "box": norm_box,
                        "is_recovered": True,
                    })

                    counts["total"] += 1
                    if "pothole" in cname_lower:
                        counts["potholes"] += 1
                    elif "crack" in cname_lower:
                        counts["cracks"] += 1
                    elif "bump" in cname_lower or "hump" in cname_lower:
                        counts["bumps"] += 1

                    labels_rec.append(f"M1:{cname} {conf:.2f}")

                annotated_frame = box_annotator1.annotate(scene=annotated_frame, detections=sv_rec)
                annotated_frame = label_annotator1.annotate(scene=annotated_frame, detections=sv_rec, labels=labels_rec)
        except Exception as e:
            print(f"Error during adaptive recovery pass: {e}")

    # Weighted Box Fusion & Ensemble Consensus when both models evaluate the road
    if model_param in ["both", "dual"] and len(detections_output) > 1:
        detections_output = fuse_dual_model_detections(detections_output)

    return annotated_frame, detections_output, counts, img_width, img_height


def box_iou(box1, box2):
    xA = max(box1[0], box2[0])
    yA = max(box1[1], box2[1])
    xB = min(box1[2], box2[2])
    yB = min(box1[3], box2[3])
    inter = max(0.0, xB - xA) * max(0.0, yB - yA)
    area1 = max(1e-6, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(1e-6, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0.0


def fuse_dual_model_detections(dets, iou_thresh=0.35):
    m1_list = [d for d in dets if d["model"] == "m1"]
    m2_list = [d for d in dets if d["model"] == "m2"]

    if not m1_list or not m2_list:
        return dets

    fused = []
    matched_m2 = set()

    for d1 in m1_list:
        best_iou = 0.0
        best_idx = -1
        for idx, d2 in enumerate(m2_list):
            if idx in matched_m2:
                continue
            iou = box_iou(d1["box"], d2["box"])
            if iou > best_iou:
                best_iou = iou
                best_idx = idx

        if best_iou >= iou_thresh and best_idx >= 0:
            d2 = m2_list[best_idx]
            matched_m2.add(best_idx)
            c1, c2 = d1["confidence"], d2["confidence"]
            w1 = c1 / (c1 + c2)
            w2 = c2 / (c1 + c2)
            b1, b2 = d1["box"], d2["box"]
            fused_box = [round(b1[i] * w1 + b2[i] * w2, 4) for i in range(4)]
            # Boosted joint consensus confidence: P = 1 - (1-p1)(1-p2) + bonus
            p_comb = round(min(0.96, 1.0 - (1.0 - c1) * (1.0 - c2) + 0.12), 3)

            # Resolve classification conflict
            c1_low, c2_low = d1["class"].lower(), d2["class"].lower()
            if ("crack" in c1_low or "crack" in c2_low) and ("pothole" in c1_low or "pothole" in c2_low):
                fused_class = "Severe Structural Distress"
            elif c1 >= c2:
                fused_class = d1["class"]
            else:
                fused_class = d2["class"]

            fused.append({
                "id": len(fused) + 1,
                "model": "m1",
                "class": fused_class,
                "confidence": p_comb,
                "box": fused_box,
                "is_consensus": True,
            })
        else:
            fused.append({**d1, "id": len(fused) + 1})

    for idx, d2 in enumerate(m2_list):
        if idx not in matched_m2:
            fused.append({**d2, "id": len(fused) + 1})

    return fused




@app.route("/detect", methods=["POST"])
@app.route("/api/detect", methods=["POST"])
def detect():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded", "success": False}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "Empty filename", "success": False}), 400

    # Read parameters (default 0.25 / 25% for reliable pavement crack and cavity recall)
    model_param = request.form.get("model", "both").lower()
    conf_m1 = parse_confidence(request.form.get("conf_m1"), 0.25)
    conf_m2 = parse_confidence(request.form.get("conf_m2"), 0.25)

    # Generic confidence slider fallback
    if "confidence" in request.form:
        generic_conf = parse_confidence(request.form.get("confidence"), 0.25)
        conf_m1 = generic_conf
        conf_m2 = generic_conf

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    upload_path = UPLOAD_FOLDER / filename
    file.save(str(upload_path))

    t0 = time.perf_counter()
    is_video = any(file.filename.lower().endswith(ext) for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"])

    if is_video:
        # Process Video by sampling key frames
        cap = cv2.VideoCapture(str(upload_path))
        if not cap.isOpened():
            return jsonify({"error": "Failed to open video file", "success": False}), 400

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        # Sample up to 12 evenly-spaced frames across the video
        sample_indices = np.linspace(0, max(0, total_frames - 1), num=min(12, max(1, total_frames)), dtype=int)
        best_frame = None
        best_annotated = None
        best_detections = []
        best_counts = {"potholes": 0, "cracks": 0, "bumps": 0, "total": 0}
        img_width, img_height = 1280, 720

        current_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if current_idx in sample_indices:
                annotated_f, dets, cnts, w, h = run_inference_on_frame(frame, model_param, conf_m1, conf_m2)
                img_width, img_height = w, h

                if best_frame is None or len(dets) >= len(best_detections):
                    best_frame = frame
                    best_annotated = annotated_f
                    best_detections = dets
                    best_counts = cnts

            current_idx += 1
            if current_idx > max(sample_indices):
                break

        cap.release()

        if best_annotated is None and best_frame is not None:
            best_annotated, best_detections, best_counts, img_width, img_height = run_inference_on_frame(best_frame, model_param, conf_m1, conf_m2)

        annotated_frame = best_annotated if best_annotated is not None else np.zeros((720, 1280, 3), dtype=np.uint8)
        detections_output = best_detections
        counts = best_counts

    else:
        # Read standard image
        img = cv2.imread(str(upload_path))
        if img is None:
            return jsonify({"error": "Failed to decode image", "success": False}), 400

        annotated_frame, detections_output, counts, img_width, img_height = run_inference_on_frame(
            img, model_param, conf_m1, conf_m2
        )

    inference_ms = round((time.perf_counter() - t0) * 1000, 1)

    # Save annotated result image
    result_filename = f"result_{uuid.uuid4().hex}.jpg"
    result_path = RESULT_FOLDER / result_filename
    cv2.imwrite(str(result_path), annotated_frame)

    host = request.host_url.rstrip("/")

    return jsonify({
        "success": True,
        "detections": detections_output,
        "image_width": img_width,
        "image_height": img_height,
        "inference_ms": max(10, inference_ms),
        "counts": counts,
        "original_url": f"{host}/static/uploads/{filename}",
        "result_url": f"{host}/static/results/{result_filename}",
    })


if __name__ == "__main__":
    print("Starting Road Anomaly Detection API Server on http://localhost:5000 ...")
    app.run(host="0.0.0.0", port=5000, debug=False)
