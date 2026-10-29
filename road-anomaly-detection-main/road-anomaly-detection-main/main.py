import streamlit as st
import cv2
import numpy as np
from ultralytics import YOLO
import supervision as sv
import tempfile
import os
from streamlit_webrtc import webrtc_streamer, VideoProcessorBase, WebRtcMode
import av
import logging
import time

# --- Configuration ---
MODEL_PATHS = {
    "M1 (Model 1)": "./RoadDetectionModel/RoadModel_yolov8m.pt_rounds120_b9/weights/best.pt",
    "M2 (Model 2)": "./YOLOv8_Small_2nd_Model.pt",
}
MODEL_PREFIX = {
    "M1 (Model 1)": "M1",
    "M2 (Model 2)": "M2",
}
DEFAULT_CONF = {"M1 (Model 1)": 0.35, "M2 (Model 2)": 0.40}
LIVE_FEED_TARGET_WIDTH = 640

# Setup logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

if "processed_file_id" not in st.session_state:
    st.session_state.processed_file_id = None
if "processing_complete" not in st.session_state:
    st.session_state.processing_complete = False
if "output_file_path" not in st.session_state:
    st.session_state.output_file_path = None
if "output_file_name" not in st.session_state:
    st.session_state.output_file_name = None
if "last_counts" not in st.session_state:
    st.session_state.last_counts = None
if "last_inference_time" not in st.session_state:
    st.session_state.last_inference_time = None


@st.cache_resource
def load_yolo_model(path: str):
    try:
        model = YOLO(path)
        logger.info(f"Successfully loaded model from {path}")
        return model, model.names
    except Exception as e:
        st.error(f"Error loading model at {path}: {e}")
        logger.error(f"Failed to load model at {path}", exc_info=e)
        return None, {}


def make_annotators(color: sv.Color):
    box_annotator = sv.BoxAnnotator(thickness=2, color=color)
    label_annotator = sv.LabelAnnotator(
        text_thickness=1,
        text_scale=0.5,
        color=sv.Color.WHITE,
        text_color=sv.Color.BLACK,
        text_padding=3,
    )
    return box_annotator, label_annotator


def process_frame(
    frame: np.ndarray, models: dict[str, tuple], thresholds: dict[str, float]
) -> np.ndarray:
    annotated_frame = frame.copy()
    counts = {"potholes": 0, "cracks": 0, "bumps": 0, "total": 0}

    for model_name, (model, names_map, box_ann, label_ann) in models.items():
        try:
            results = model.predict(frame, conf=thresholds[model_name], verbose=False)[
                0
            ]
            detections = sv.Detections.from_ultralytics(results)
            labels = [
                f"{MODEL_PREFIX[model_name]}:{names_map.get(cls_id, str(cls_id))} {conf:.2f}"
                for cls_id, conf in zip(detections.class_id, detections.confidence)
            ]

            # Tabulate detections for UI metrics display
            for cls_id in detections.class_id:
                cname = str(names_map.get(cls_id, "")).lower()
                counts["total"] += 1
                if "pothole" in cname:
                    counts["potholes"] += 1
                elif "crack" in cname:
                    counts["cracks"] += 1
                elif "bump" in cname or "hump" in cname:
                    counts["bumps"] += 1

            annotated_frame = box_ann.annotate(annotated_frame, detections)
            annotated_frame = label_ann.annotate(
                annotated_frame, detections, labels=labels
            )
        except Exception as e:
            logger.error(f"Error during prediction/annotation for {model_name}: {e}")
            cv2.putText(
                annotated_frame,
                f"Error processing {model_name}",
                (10, 30 + list(models.keys()).index(model_name) * 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2,
            )

    try:
        st.session_state["last_counts"] = counts
    except Exception:
        pass
    return annotated_frame


def cleanup_previous_output():
    """Deletes the previously generated output file if it exists."""
    if st.session_state.output_file_path and os.path.exists(
        st.session_state.output_file_path
    ):
        try:
            os.remove(st.session_state.output_file_path)
            logger.info(
                f"Cleaned up previous output file: {st.session_state.output_file_path}"
            )
        except OSError as rm_err:
            logger.error(
                f"Error removing previous output file {st.session_state.output_file_path}: {rm_err}"
            )
    st.session_state.output_file_path = None
    st.session_state.output_file_name = None
    st.session_state.processing_complete = False
    st.session_state.processed_file_id = None
    st.session_state.last_counts = None
    st.session_state.last_inference_time = None


def inject_custom_css():
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');

        /* Global base typography */
        html, body, [class*="css"] {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Hide default Streamlit padding */
        .block-container {
            padding-top: 1.5rem !important;
            padding-bottom: 3rem !important;
            max-width: 1350px !important;
        }

        /* Top Brand Navbar (BuiltIn style) */
        .builtin-nav {
            background-color: #050B1B;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 12px 12px 0 0;
            margin-bottom: 0;
        }
        .nav-logo-box {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .nav-logo-badge {
            border: 2px solid #00D2FF;
            color: #FFFFFF;
            padding: 3px 10px;
            font-size: 1.15rem;
            font-weight: 800;
            font-family: 'Space Grotesk', sans-serif;
            letter-spacing: -0.02em;
            background: rgba(0, 210, 255, 0.05);
            border-radius: 4px;
            display: inline-block;
        }
        .nav-tagline {
            color: #94A3B8;
            font-size: 0.85rem;
            font-weight: 500;
            border-left: 1px solid rgba(255, 255, 255, 0.15);
            padding-left: 12px;
            display: none;
        }
        @media (min-width: 768px) {
            .nav-tagline { display: inline-block; }
        }
        .nav-links-right {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .nav-btn-outline {
            color: #F8FAFC !important;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 0.82rem;
            font-weight: 600;
            text-decoration: none !important;
            transition: all 0.2s ease;
        }
        .nav-btn-outline:hover {
            border-color: #00D2FF;
            background: rgba(0, 210, 255, 0.15);
            color: #00D2FF !important;
        }
        .nav-btn-primary {
            background: #0088FF !important;
            color: #FFFFFF !important;
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 0.82rem;
            font-weight: 700;
            text-decoration: none !important;
            transition: all 0.2s ease;
        }
        .nav-btn-primary:hover {
            background: #0070D4 !important;
            box-shadow: 0 0 15px rgba(0, 136, 255, 0.5);
        }

        /* Secondary Sub-Navbar (BuiltIn white ribbon) */
        .builtin-subnav {
            background-color: #FFFFFF;
            padding: 10px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            margin-bottom: 0;
        }
        .subnav-items {
            display: flex;
            gap: 22px;
            align-items: center;
            overflow-x: auto;
        }
        .subnav-item {
            color: #1E293B;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            text-decoration: none !important;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
        }
        .subnav-item.active {
            color: #0066FF;
            border-bottom: 2px solid #0066FF;
            padding-bottom: 2px;
        }
        .subnav-location {
            color: #0066FF;
            font-size: 0.82rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        /* BuiltIn Hero Section (Vibrant Gradient Blue) */
        .builtin-hero {
            background: linear-gradient(135deg, #024599 0%, #0066D6 45%, #0050AA 85%, #01285C 100%);
            padding: 45px 36px 40px 36px;
            border-radius: 0 0 16px 16px;
            box-shadow: 0 20px 40px -10px rgba(0, 50, 150, 0.5);
            margin-bottom: 28px;
            position: relative;
            overflow: hidden;
        }
        .hero-badge-tag {
            color: #7DD3FC;
            font-size: 0.8rem;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .hero-badge-tag::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #00D2FF;
            border-radius: 50%;
            box-shadow: 0 0 8px #00D2FF;
        }
        .hero-main-title {
            color: #FFFFFF;
            font-size: 2.8rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            line-height: 1.15;
            margin-bottom: 12px;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .hero-main-title .dot {
            color: #00D2FF;
        }
        .hero-stats-row {
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.88rem;
            font-weight: 600;
            letter-spacing: 0.05em;
            margin-bottom: 26px;
        }
        .hero-stats-row span {
            color: #38BDF8;
            font-weight: 800;
        }

        /* Floating Hero Action Bar (White pill/card in BuiltIn) */
        .hero-floating-card {
            background: #FFFFFF;
            border-radius: 12px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
        }
        .floating-label {
            color: #0F172A;
            font-size: 1.25rem;
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        .floating-meta-group {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .floating-field {
            display: flex;
            flex-direction: column;
        }
        .floating-field-label {
            color: #64748B;
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .floating-field-value {
            color: #0284C7;
            font-size: 0.95rem;
            font-weight: 700;
        }
        .floating-btn-badge {
            background: #0088FF;
            color: #FFFFFF;
            padding: 10px 24px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.9rem;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            box-shadow: 0 4px 14px rgba(0, 136, 255, 0.4);
            border: none;
            display: inline-block;
        }

        /* 3 Quick Action Links below hero bar */
        .hero-action-links {
            display: flex;
            align-items: center;
            gap: 28px;
            flex-wrap: wrap;
            padding-top: 6px;
        }
        .hero-link-pill {
            color: #E0F2FE;
            font-size: 0.92rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
        }
        .hero-link-pill:hover {
            color: #FFFFFF;
            text-decoration: underline;
        }

        /* Metric Telemetry Cards */
        div[data-testid="stMetric"] {
            background: #0D1A38;
            border: 1px solid rgba(0, 180, 255, 0.25);
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
            transition: all 0.25s ease;
        }
        div[data-testid="stMetric"]:hover {
            border-color: #00D2FF;
            transform: translateY(-2px);
            box-shadow: 0 10px 28px rgba(0, 210, 255, 0.2);
        }
        div[data-testid="stMetric"] label {
            color: #94A3B8 !important;
            font-weight: 700 !important;
            font-size: 0.8rem !important;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        div[data-testid="stMetric"] div[data-testid="stMetricValue"] {
            color: #FFFFFF !important;
            font-size: 2rem !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em;
        }

        /* Panels & Cards */
        .panel-card {
            background: #0D1A38;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 18px;
            margin-bottom: 20px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.35);
        }
        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .panel-title {
            color: #F8FAFC;
            font-size: 1.05rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
        }
        .panel-tag {
            font-size: 0.75rem;
            color: #00D2FF;
            background: rgba(0, 210, 255, 0.1);
            padding: 3px 10px;
            border-radius: 20px;
            border: 1px solid rgba(0, 210, 255, 0.3);
            font-weight: 700;
            letter-spacing: 0.03em;
        }

        /* Empty state showcase */
        .empty-state {
            background: #091329;
            border: 2px dashed rgba(0, 180, 255, 0.25);
            border-radius: 16px;
            padding: 50px 30px;
            text-align: center;
            color: #94A3B8;
            margin-bottom: 25px;
        }
        .empty-state h3 {
            color: #FFFFFF;
            font-size: 1.4rem;
            font-weight: 800;
            margin-bottom: 8px;
            letter-spacing: -0.01em;
        }
        .empty-state p {
            max-width: 580px;
            margin: 0 auto;
            font-size: 0.98rem;
            line-height: 1.6;
        }

        /* Sidebar Styling */
        section[data-testid="stSidebar"] {
            background-color: #050B1B;
            border-right: 1px solid rgba(255, 255, 255, 0.08);
        }
        section[data-testid="stSidebar"] h2, section[data-testid="stSidebar"] h3, section[data-testid="stSidebar"] h4 {
            color: #00D2FF !important;
            font-weight: 800;
            letter-spacing: -0.01em;
        }

        /* Primary Action Buttons */
        div.stButton > button, div.stDownloadButton > button {
            background: linear-gradient(135deg, #0088FF 0%, #0066D6 100%) !important;
            color: #FFFFFF !important;
            border: none !important;
            font-weight: 700 !important;
            border-radius: 8px !important;
            padding: 12px 24px !important;
            transition: all 0.2s ease !important;
            box-shadow: 0 4px 15px rgba(0, 136, 255, 0.4) !important;
        }
        div.stButton > button:hover, div.stDownloadButton > button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(0, 136, 255, 0.6) !important;
        }

        /* Benchmark Expander */
        div[data-testid="stExpander"] {
            background: #0D1A38;
            border: 1px solid rgba(0, 180, 255, 0.2);
            border-radius: 12px;
            overflow: hidden;
            margin-top: 25px;
        }

        /* Footer */
        .builtin-footer {
            text-align: center;
            color: #64748B;
            font-size: 0.85rem;
            margin-top: 45px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def handle_image_input(models, thresholds):
    # Reset video processing state if switching to image mode
    if st.session_state.processed_file_id is not None:
        cleanup_previous_output()

    st.sidebar.markdown("---")
    st.sidebar.subheader("📤 Surface Image Input")
    uploaded_file = st.sidebar.file_uploader(
        "Upload Road Surface Photo",
        type=["jpg", "jpeg", "png", "bmp", "webp"],
        key="img_upload",
        help="Upload roadway image for high-precision defect segmentation",
    )

    if uploaded_file:
        file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if img is None:
            st.error("Could not decode image. Please upload a valid image file.")
            return

        with st.spinner("⚡ Running AI inference across neural weights..."):
            t_start = time.perf_counter()
            processed_img = process_frame(img, models, thresholds)
            inference_ms = (time.perf_counter() - t_start) * 1000
            st.session_state.last_inference_time = inference_ms

        # Summary Metric Cards
        counts = st.session_state.get(
            "last_counts", {"potholes": 0, "cracks": 0, "bumps": 0, "total": 0}
        )
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.metric(label="🕳️ Potholes Detected", value=counts["potholes"])
        with m2:
            st.metric(label="⚡ Cracks Identified", value=counts["cracks"])
        with m3:
            st.metric(label="⚠️ Speed Bumps / Hazards", value=counts["bumps"])
        with m4:
            st.metric(label="⏱️ Neural Latency", value=f"{inference_ms:.1f} ms")

        st.markdown("<div style='height: 14px;'></div>", unsafe_allow_html=True)

        # 2-Column Responsive Layout: Left = Input, Right = Output
        col_input, col_output = st.columns(2)

        with col_input:
            st.markdown(
                """
                <div class="panel-card">
                    <div class="panel-header">
                        <h4 class="panel-title">📷 Source Roadway Image</h4>
                        <span class="panel-tag">Raw Input</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.image(img, channels="BGR", use_container_width=True)

        with col_output:
            st.markdown(
                """
                <div class="panel-card">
                    <div class="panel-header">
                        <h4 class="panel-title">🎯 AI Anomaly Detection</h4>
                        <span class="panel-tag">Annotated Overlay</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.image(processed_img, channels="BGR", use_container_width=True)

        st.success("✅ Neural inspection complete. Anomaly coordinates localized.")

    else:
        # Prompt user with an empty state showcase
        st.markdown(
            """
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 14px;">🛣️</div>
                <h3>Ready to Analyze Road Surface</h3>
                <p>Upload any high-resolution pavement photo via the sidebar control panel to run automated detection for cracks, potholes, and speed bumps.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )


def handle_video_input(models, thresholds, status_placeholder):
    st.sidebar.markdown("---")
    st.sidebar.subheader("🎬 Video Input")
    uploaded_file = st.sidebar.file_uploader(
        "Upload Video Footage",
        type=["mp4", "avi", "mov", "mkv"],
        key="vid_upload",
        help="Upload roadway dashcam video",
    )

    if uploaded_file:
        current_file_id = uploaded_file.file_id

        # Check if it's a new file upload
        if current_file_id != st.session_state.processed_file_id:
            logger.info(
                f"New video file uploaded (ID: {current_file_id}). Resetting state."
            )
            cleanup_previous_output()
            st.session_state.processed_file_id = current_file_id

        # If processing is already complete for this file, just show download button
        if st.session_state.processing_complete and st.session_state.output_file_path:
            status_placeholder.success("✅ Video processing complete!")
            if os.path.exists(st.session_state.output_file_path):
                try:
                    with open(st.session_state.output_file_path, "rb") as f:
                        video_bytes = f.read()
                    st.download_button(
                        label="⬇️ Download Processed Video",
                        data=video_bytes,
                        file_name=st.session_state.output_file_name
                        or f"processed_{uploaded_file.name}",
                        mime="video/mp4",
                        key="download_btn_rerun",
                    )
                    logger.info(
                        f"Download button shown again for already processed file: {st.session_state.output_file_path}"
                    )
                except Exception as e:
                    st.error(
                        f"Error reading previously processed video for download: {e}"
                    )
                    logger.error(
                        f"Error reading existing output file {st.session_state.output_file_path} for download",
                        exc_info=e,
                    )
            else:
                st.error("Previously processed file not found. Please upload again.")
                logger.warning(
                    f"Session state indicated processed file {st.session_state.output_file_path} but it was not found."
                )
                cleanup_previous_output()
            return

        # --- Start Processing for a new file or if not yet complete ---
        input_tmp_path = None
        output_video_path_current_run = None
        cap = None
        writer = None
        processing_succeeded = False

        try:
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=".mp4"
            ) as input_tmp_file:
                input_tmp_path = input_tmp_file.name
                input_tmp_file.write(uploaded_file.read())
            logger.info(f"Input video saved to temporary file: {input_tmp_path}")

            cap = cv2.VideoCapture(input_tmp_path)
            if not cap.isOpened():
                st.error("Error opening uploaded video file.")
                status_placeholder.empty()
                return

            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if fps <= 0:
                fps = 30
                logger.warning("Could not read video FPS, defaulting to 30.")

            with tempfile.NamedTemporaryFile(
                delete=False, suffix=".mp4"
            ) as output_tmp_file:
                output_video_path_current_run = output_tmp_file.name
            logger.info(
                f"Output video for this run will be saved to: {output_video_path_current_run}"
            )

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(
                output_video_path_current_run, fourcc, fps, (width, height)
            )
            if not writer.isOpened():
                st.error("Error initializing video writer.")
                logger.error(
                    f"Failed to open VideoWriter for path: {output_video_path_current_run}"
                )
                if output_video_path_current_run and os.path.exists(
                    output_video_path_current_run
                ):
                    os.remove(output_video_path_current_run)
                output_video_path_current_run = None
                return

            prog_bar = st.progress(0, text="Processing video...")
            status_placeholder.info("Processing roadway video frame by frame, please wait...")
            frame_idx = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                out_frame = process_frame(frame, models, thresholds)
                writer.write(out_frame)
                frame_idx += 1
                progress_percentage = (
                    frame_idx / total_frames if total_frames > 0 else 0
                )
                prog_text = f"Analyzing frame {frame_idx}/{total_frames if total_frames > 0 else '?'}"
                prog_bar.progress(min(progress_percentage, 1.0), text=prog_text)

            processing_succeeded = True
            prog_bar.progress(1.0, text="Processing complete.")
            logger.info("Video processing finished.")

        except Exception as e:
            st.error(f"An error occurred during video processing: {e}")
            logger.error("Error during video processing loop", exc_info=e)
            status_placeholder.error("Processing failed.")
            if "prog_bar" in locals():
                prog_bar.empty()

        finally:
            if cap is not None:
                cap.release()
            if writer is not None:
                writer.release()
            logger.info("Video capture and writer resources released.")
            if input_tmp_path and os.path.exists(input_tmp_path):
                try:
                    os.remove(input_tmp_path)
                    logger.info(f"Removed input temp file: {input_tmp_path}")
                except OSError as rm_err:
                    logger.error(
                        f"Error removing input temp file {input_tmp_path}: {rm_err}"
                    )

        # --- Post-processing logic ---
        if (
            processing_succeeded
            and output_video_path_current_run
            and os.path.exists(output_video_path_current_run)
        ):
            st.session_state.output_file_path = output_video_path_current_run
            st.session_state.output_file_name = f"processed_{uploaded_file.name}"
            st.session_state.processing_complete = True
            st.session_state.processed_file_id = current_file_id

            status_placeholder.success("✅ Video processing complete!")
            try:
                with open(st.session_state.output_file_path, "rb") as f:
                    video_bytes = f.read()
                st.download_button(
                    label="⬇️ Download Processed Video",
                    data=video_bytes,
                    file_name=st.session_state.output_file_name,
                    mime="video/mp4",
                    key="download_btn_first",
                )
                logger.info(
                    f"Download button provided for newly processed file: {st.session_state.output_file_path}"
                )
            except Exception as e:
                st.error(f"Error reading processed video for download: {e}")
                logger.error(
                    f"Error reading output file {st.session_state.output_file_path} for download",
                    exc_info=e,
                )
                cleanup_previous_output()

        elif output_video_path_current_run and os.path.exists(
            output_video_path_current_run
        ):
            logger.warning(
                f"Processing failed, cleaning up temporary output file: {output_video_path_current_run}"
            )
            try:
                os.remove(output_video_path_current_run)
            except OSError as rm_err:
                logger.error(
                    f"Error removing failed output temp file {output_video_path_current_run}: {rm_err}"
                )
            if current_file_id == st.session_state.processed_file_id:
                cleanup_previous_output()

        if "prog_bar" in locals():
            prog_bar.empty()

    else:
        if st.session_state.processed_file_id is not None:
            cleanup_previous_output()
        st.markdown(
            """
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 14px;">📹</div>
                <h3>Video Stream Pipeline Ready</h3>
                <p>Upload a video clip from the left sidebar to perform continuous defect localization across all video frames.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )


class YOLOVideoProcessor(VideoProcessorBase):
    def __init__(self, models, thresholds, target_width):
        self.models = models
        self.thresholds = thresholds
        self.target_width = target_width
        logger.info(
            f"YOLOVideoProcessor initialized. Target processing width: {self.target_width}"
        )

    def recv(self, frame: av.VideoFrame) -> av.VideoFrame:
        img = frame.to_ndarray(format="bgr24")
        original_height, original_width = img.shape[:2]
        img_resized = img
        if self.target_width is not None and original_width > self.target_width:
            aspect_ratio = original_height / original_width
            target_height = int(self.target_width * aspect_ratio)
            img_resized = cv2.resize(
                img, (self.target_width, target_height), interpolation=cv2.INTER_AREA
            )
        annotated_frame_resized = process_frame(
            img_resized, self.models, self.thresholds
        )
        if img_resized is not img:
            final_frame = cv2.resize(
                annotated_frame_resized,
                (original_width, original_height),
                interpolation=cv2.INTER_LINEAR,
            )
        else:
            final_frame = annotated_frame_resized
        return av.VideoFrame.from_ndarray(final_frame, format="bgr24")


def handle_live_camera(models, thresholds):
    if st.session_state.processed_file_id is not None:
        cleanup_previous_output()

    st.markdown(
        """
        <div class="panel-card">
            <div class="panel-header">
                <h4 class="panel-title">📹 Real-Time Dashcam & Live Stream</h4>
                <span class="panel-tag">WebRTC Low Latency</span>
            </div>
            <p style="color: #94A3B8; font-size: 0.92rem; margin-bottom: 14px;">
                Click <strong>START</strong> below to access local or dashcam camera feeds. Ensure browser permissions are granted.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    media_constraints = {
        "video": {
            "width": {"ideal": 640},
            "height": {"ideal": 480},
            "frameRate": {"ideal": 15, "max": 30},
        },
        "audio": False,
    }

    def processor_factory():
        return YOLOVideoProcessor(
            models=models, thresholds=thresholds, target_width=LIVE_FEED_TARGET_WIDTH
        )

    webrtc_ctx = webrtc_streamer(
        key="live-camera-streamer",
        mode=WebRtcMode.SENDRECV,
        video_processor_factory=processor_factory,
        media_stream_constraints=media_constraints,
        async_processing=True,
        rtc_configuration={"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]},
    )
    if not webrtc_ctx.state.playing:
        st.info("Live feed standby. Click 'START' above to initiate camera pipeline.")


def render_about_model():
    with st.expander("📊 Benchmark Metrics & Model Specifications", expanded=False):
        st.markdown(
            """
            ### Production YOLOv8 Anomaly Detection Architecture
            
            Our vision pipeline leverages dual neural networks trained specifically for transportation infrastructure:
            
            - **Model 1 (`RoadModel_yolov8m.pt`)**: YOLOv8m trained for 120 epochs (~27.8 hrs on RTX 3060) on unified datasets (RAD, Indian Roads, Humps/Bumps/Potholes, HighRPD - 30,685 images).
            - **Model 2 (`YOLOv8_Small_2nd_Model.pt`)**: Pre-trained YOLOv8s specializing in transverse, longitudinal, alligator cracks, and potholes (CRDDC2022 dataset).

            #### Model 1 Dedicated Test Set Performance:
            """
        )
        metrics_data = [
            {"Class": "Overall", "Precision": "0.736", "Recall": "0.740", "mAP@0.5": "0.745", "mAP@0.5:.95": "0.448"},
            {"Class": "Pedestrian", "Precision": "0.822", "Recall": "0.915", "mAP@0.5": "0.918", "mAP@0.5:.95": "0.522"},
            {"Class": "Crack", "Precision": "0.576", "Recall": "0.484", "mAP@0.5": "0.505", "mAP@0.5:.95": "0.240"},
            {"Class": "Crack-Severe", "Precision": "0.548", "Recall": "0.503", "mAP@0.5": "0.493", "mAP@0.5:.95": "0.273"},
            {"Class": "Pothole", "Precision": "0.597", "Recall": "0.440", "mAP@0.5": "0.468", "mAP@0.5:.95": "0.198"},
            {"Class": "Speed-Bump", "Precision": "0.804", "Recall": "0.908", "mAP@0.5": "0.885", "mAP@0.5:.95": "0.487"},
        ]
        st.table(metrics_data)
        st.caption("Average Inference Latency: ~12.0 ms per image (GPU Benchmark) | Tested on 2,846 unseen roadway images.")


def main():
    st.set_page_config(
        page_title="Road Anomaly Detection Platform",
        page_icon="🛣️",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    inject_custom_css()

    # BuiltIn-style Top Navbar
    st.markdown(
        """
        <div class="builtin-nav">
            <div class="nav-logo-box">
                <span class="nav-logo-badge">[ road.ai ]</span>
                <span class="nav-tagline">Vision AI for Infrastructure</span>
            </div>
            <div class="nav-links-right">
                <a href="https://github.com/collabdoor/Road-Anomaly-Detection" target="_blank" class="nav-btn-outline">
                    GitHub Repo
                </a>
                <a href="#analyze" class="nav-btn-primary">
                    Live Demo
                </a>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # BuiltIn-style Secondary Subnav (White Ribbon)
    st.markdown(
        """
        <div class="builtin-subnav">
            <div class="subnav-items">
                <a href="#overview" class="subnav-item active">OVERVIEW</a>
                <a href="#detection" class="subnav-item">DEFECT SCANNER</a>
                <a href="#models" class="subnav-item">YOLOv8 MODELS</a>
                <a href="#benchmarks" class="subnav-item">BENCHMARK METRICS</a>
                <a href="#live" class="subnav-item">DASHCAM FEED</a>
            </div>
            <div class="subnav-location">
                📍 30.7K DATASET HUB
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # BuiltIn-style Hero Section
    st.markdown(
        """
        <div class="builtin-hero">
            <div class="hero-badge-tag">INFRASTRUCTURE VISION • YOLOv8 ENGINE</div>
            <h1 class="hero-main-title">
                Inspect<span class="dot">.</span> Detect<span class="dot">.</span><br>
                Safeguard road surfaces<span class="dot">.</span>
            </h1>
            <div class="hero-stats-row">
                <span>120</span> TRAINING EPOCHS • <span>30.7K</span> ROAD DATASET IMAGES • <span>2</span> NEURAL MODELS • <span>~12MS</span> LATENCY
            </div>
            
            <!-- Floating Hero Action Bar (BuiltIn Style) -->
            <div class="hero-floating-card">
                <div class="floating-label">Automated Road Anomaly Inspection</div>
                <div class="floating-meta-group">
                    <div class="floating-field">
                        <span class="floating-field-label">Primary Engine</span>
                        <span class="floating-field-value">Custom YOLOv8m</span>
                    </div>
                    <div class="floating-field">
                        <span class="floating-field-label">Secondary Engine</span>
                        <span class="floating-field-value">Damage YOLOv8s</span>
                    </div>
                    <div class="floating-field">
                        <span class="floating-field-label">Detection Status</span>
                        <span class="floating-field-value" style="color: #10B981;">● Ready to Scan</span>
                    </div>
                </div>
                <div class="floating-btn-badge">AI Scanner Active</div>
            </div>

            <!-- 3 Quick Action Link Pills -->
            <div class="hero-action-links">
                <span class="hero-link-pill">🔍 Multi-Class Distress Detection</span>
                <span class="hero-link-pill">⚡ High-Speed Real-Time Inference</span>
                <span class="hero-link-pill">🛡️ Pavement Quality Auditing</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.sidebar.markdown("### ⚙️ Pipeline Control")
    st.sidebar.markdown("#### 🧠 Model Selection")
    use_m1 = st.sidebar.checkbox("Model 1: Custom YOLOv8m (Road Defects)", value=True, key="cb_m1")
    use_m2 = st.sidebar.checkbox("Model 2: Pre-trained YOLOv8s (Cracks/Potholes)", value=True, key="cb_m2")

    models_to_load = {}
    if use_m1:
        models_to_load["M1 (Model 1)"] = MODEL_PATHS["M1 (Model 1)"]
    if use_m2:
        models_to_load["M2 (Model 2)"] = MODEL_PATHS["M2 (Model 2)"]

    loaded_models = {}
    thresholds = {}
    model_load_failed = False

    if not models_to_load:
        st.sidebar.warning("Select at least one model checkbox to start.")
        st.info("👈 Please select at least one active model in the sidebar.")
        render_about_model()
        st.stop()

    st.sidebar.markdown("#### 🎯 Confidence Thresholds")
    for name, path in models_to_load.items():
        model, names_map = load_yolo_model(path)
        if model and names_map:
            color = sv.Color.RED if name == "M1 (Model 1)" else sv.Color.BLUE
            box_ann, label_ann = make_annotators(color)
            loaded_models[name] = (model, names_map, box_ann, label_ann)
            thresholds[name] = st.sidebar.slider(
                f"{name} Conf",
                0.1,
                1.0,
                DEFAULT_CONF[name],
                0.05,
                key=f"{name}_conf",
            )
        else:
            model_load_failed = True

    if model_load_failed:
        st.error("One or more models failed to load. Check logs and file paths.")
        st.stop()

    st.sidebar.markdown("#### 🎬 Input Source")
    input_mode = st.sidebar.radio(
        "Choose Source Mode",
        ["Image", "Video", "Live Camera"],
        key="input_mode_radio",
    )

    if input_mode == "Image":
        handle_image_input(loaded_models, thresholds)
    elif input_mode == "Video":
        video_status_placeholder = st.empty()
        handle_video_input(loaded_models, thresholds, video_status_placeholder)
    elif input_mode == "Live Camera":
        handle_live_camera(loaded_models, thresholds)

    render_about_model()

    st.markdown(
        """
        <div class="builtin-footer">
            Road Anomaly Detection Platform • Vision AI for Transportation Infrastructure
        </div>
        """,
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
