#!/usr/bin/env python3
"""
Detect a dancer wearing a maroon shirt in a Twitch recording.
Uses color-based detection + motion analysis to find dance segments.
"""
import cv2
import numpy as np
import json
import sys

VIDEO_PATH = "/home/user/justout-hub/twitch-recorder/recordings/subeyvideography_20260411_215111.ts"
OUTPUT_JSON = "/home/user/justout-hub/twitch-recorder/dance_segments.json"

# Maroon color range in HSV
# Maroon is a dark red: H ~0-10 or ~170-180, low-mid S, low-mid V
MAROON_RANGES = [
    # Dark red / maroon
    (np.array([0, 50, 30]), np.array([12, 255, 150])),
    # Wrap-around reds
    (np.array([165, 50, 30]), np.array([180, 255, 150])),
    # Slightly brighter maroon
    (np.array([0, 70, 40]), np.array([10, 255, 180])),
    (np.array([168, 70, 40]), np.array([180, 255, 180])),
]

def detect_maroon_regions(frame):
    """Find large maroon-colored regions (likely the shirt)."""
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    combined_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for lo, hi in MAROON_RANGES:
        mask = cv2.inRange(hsv, lo, hi)
        combined_mask = cv2.bitwise_or(combined_mask, mask)

    # Clean up noise
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
    combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)

    # Find contours
    contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter: shirt-sized regions (at least 1% of frame area, maroon blob)
    min_area = frame.shape[0] * frame.shape[1] * 0.005  # 0.5% of frame
    regions = []
    for c in contours:
        area = cv2.contourArea(c)
        if area > min_area:
            x, y, w, h = cv2.boundingRect(c)
            regions.append({
                'bbox': (x, y, w, h),
                'area': area,
                'center': (x + w // 2, y + h // 2)
            })

    return regions, combined_mask


def compute_motion(prev_gray, curr_gray):
    """Compute overall motion between two frames."""
    diff = cv2.absdiff(prev_gray, curr_gray)
    _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
    return np.sum(thresh > 0) / thresh.size  # fraction of pixels with motion


def detect_motion_in_region(prev_gray, curr_gray, bbox, expand=50):
    """Compute motion specifically in the region around the detected person."""
    x, y, w, h = bbox
    # Expand region to capture full body around shirt
    x1 = max(0, x - expand)
    y1 = max(0, y - h)  # Expand upward for head
    x2 = min(prev_gray.shape[1], x + w + expand)
    y2 = min(prev_gray.shape[0], y + h + int(h * 1.5))  # Expand down for legs

    roi_prev = prev_gray[y1:y2, x1:x2]
    roi_curr = curr_gray[y1:y2, x1:x2]

    if roi_prev.size == 0 or roi_curr.size == 0:
        return 0.0

    diff = cv2.absdiff(roi_prev, roi_curr)
    _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
    return np.sum(thresh > 0) / thresh.size


def estimate_person_bbox(shirt_bbox, frame_shape):
    """Estimate full person bounding box from shirt detection."""
    x, y, w, h = shirt_bbox
    height, width = frame_shape[:2]

    # Shirt is roughly middle third of body
    # Estimate head above and legs below
    person_h = int(h * 3.5)  # Full body ~3.5x shirt height
    person_w = int(w * 1.8)  # Wider for arms
    person_x = max(0, x - int(w * 0.4))
    person_y = max(0, y - int(h * 1.0))  # Head above shirt

    # Clamp
    person_x = max(0, person_x)
    person_y = max(0, person_y)
    person_w = min(person_w, width - person_x)
    person_h = min(person_h, height - person_y)

    return (person_x, person_y, person_w, person_h)


def main():
    cap = cv2.VideoCapture(VIDEO_PATH)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"Analyzing {total_frames} frames ({total_frames/fps:.0f}s) at {fps}fps...")
    print(f"Resolution: {width}x{height}")

    # Sample every N frames (roughly 3 times per second for efficiency)
    sample_interval = max(1, int(fps / 3))

    prev_gray = None
    frame_data = []  # (timestamp, maroon_detected, motion_score, best_bbox)

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_interval == 0:
            timestamp = frame_idx / fps
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (5, 5), 0)

            regions, mask = detect_maroon_regions(frame)

            maroon_detected = len(regions) > 0
            motion_score = 0.0
            best_bbox = None
            person_bbox = None

            if regions:
                # Pick largest maroon region
                best = max(regions, key=lambda r: r['area'])
                best_bbox = best['bbox']
                person_bbox = estimate_person_bbox(best_bbox, frame.shape)

                if prev_gray is not None:
                    motion_score = detect_motion_in_region(prev_gray, gray, best_bbox)

            frame_data.append({
                'frame': frame_idx,
                'time': round(timestamp, 2),
                'maroon': maroon_detected,
                'motion': round(motion_score, 4),
                'bbox': best_bbox,
                'person_bbox': list(person_bbox) if person_bbox else None,
                'num_regions': len(regions)
            })

            if frame_idx % (int(fps) * 10) == 0:
                pct = frame_idx / total_frames * 100
                print(f"  {pct:.0f}% (t={timestamp:.1f}s) maroon={maroon_detected} motion={motion_score:.3f} regions={len(regions)}")

            prev_gray = gray

        frame_idx += 1

    cap.release()

    # --- Identify dance segments ---
    # A dance = maroon person detected + significant motion, sustained for a period
    print(f"\nAnalyzed {len(frame_data)} sample points")

    # Smooth the signals
    MOTION_THRESHOLD = 0.02  # 2% pixel change = dancing
    MIN_DANCE_DURATION = 3.0  # At least 3 seconds to count as a dance
    MERGE_GAP = 2.0  # Merge segments within 2 seconds

    # Mark dancing frames: maroon present AND motion above threshold
    dancing = []
    for d in frame_data:
        is_dancing = d['maroon'] and d['motion'] > MOTION_THRESHOLD
        dancing.append({**d, 'dancing': is_dancing})

    # Find contiguous dancing segments
    segments = []
    in_segment = False
    seg_start = None
    seg_bboxes = []

    for d in dancing:
        if d['dancing'] and not in_segment:
            in_segment = True
            seg_start = d['time']
            seg_bboxes = [d['person_bbox']] if d['person_bbox'] else []
        elif d['dancing'] and in_segment:
            if d['person_bbox']:
                seg_bboxes.append(d['person_bbox'])
        elif not d['dancing'] and in_segment:
            seg_end = d['time']
            if seg_end - seg_start >= MIN_DANCE_DURATION:
                segments.append({
                    'start': seg_start,
                    'end': seg_end,
                    'bboxes': seg_bboxes
                })
            in_segment = False
            seg_bboxes = []

    # Close last segment
    if in_segment and dancing:
        seg_end = dancing[-1]['time']
        if seg_end - seg_start >= MIN_DANCE_DURATION:
            segments.append({
                'start': seg_start,
                'end': seg_end,
                'bboxes': seg_bboxes
            })

    # Merge segments that are close together
    merged = []
    for seg in segments:
        if merged and seg['start'] - merged[-1]['end'] < MERGE_GAP:
            merged[-1]['end'] = seg['end']
            merged[-1]['bboxes'].extend(seg['bboxes'])
        else:
            merged.append(seg)

    # Compute average person bbox for each segment (for cropping)
    for seg in merged:
        if seg['bboxes']:
            bboxes = np.array(seg['bboxes'])
            avg_bbox = np.median(bboxes, axis=0).astype(int).tolist()
            seg['crop_bbox'] = avg_bbox
        else:
            seg['crop_bbox'] = None
        del seg['bboxes']  # Don't need all of them in output

    print(f"\nFound {len(merged)} dance segments:")
    for i, seg in enumerate(merged):
        duration = seg['end'] - seg['start']
        print(f"  Dance {i+1}: {seg['start']:.1f}s - {seg['end']:.1f}s ({duration:.1f}s) crop={seg['crop_bbox']}")

    # Save results
    result = {
        'video': VIDEO_PATH,
        'fps': fps,
        'width': width,
        'height': height,
        'segments': merged,
        'raw_stats': {
            'total_samples': len(frame_data),
            'maroon_detected': sum(1 for d in frame_data if d['maroon']),
            'dancing_detected': sum(1 for d in dancing if d['dancing']),
        }
    }

    with open(OUTPUT_JSON, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\nResults saved to {OUTPUT_JSON}")

    # Also print detailed motion timeline for debugging
    print("\n--- Motion Timeline ---")
    for d in frame_data:
        bar = '#' * int(d['motion'] * 200)
        marker = ' DANCE' if d['maroon'] and d['motion'] > MOTION_THRESHOLD else ''
        if d['maroon']:
            print(f"  {d['time']:6.1f}s  M:{d['motion']:.3f} |{bar}{marker}")


if __name__ == '__main__':
    main()
