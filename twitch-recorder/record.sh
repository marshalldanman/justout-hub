#!/bin/bash
# =============================================================================
# JustOut Hub - Twitch Stream Recorder
# Records a Twitch channel's live stream using streamlink
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECORDINGS_DIR="${SCRIPT_DIR}/recordings"
PID_FILE="${SCRIPT_DIR}/.recording_pid"

# Defaults
CHANNEL=""
QUALITY="best"
ACTION="record"

usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  record <channel> [quality]   Record a live Twitch stream"
    echo "  check  <channel>             Check if a channel is live"
    echo "  stop                         Stop the current recording"
    echo "  status                       Show recording status"
    echo ""
    echo "Quality options: best, 1080p, 720p30, 480p30, 360p30, audio_only, worst"
    echo ""
    echo "Examples:"
    echo "  $0 record subeyvideography"
    echo "  $0 record subeyvideography 720p30"
    echo "  $0 check subeyvideography"
    echo "  $0 stop"
    echo "  $0 status"
}

check_streamlink() {
    if ! command -v streamlink &> /dev/null; then
        echo "Error: streamlink is not installed."
        echo "Install it with: pip3 install streamlink"
        exit 1
    fi
}

check_live() {
    local channel="$1"
    local url="https://www.twitch.tv/${channel}"

    echo "Checking if ${channel} is live..."
    local output
    output=$(streamlink "$url" 2>&1)

    if echo "$output" | grep -q "Available streams:"; then
        echo "LIVE - ${channel} is streaming!"
        echo "$output" | grep "Available streams:"
        return 0
    else
        echo "OFFLINE - ${channel} is not currently streaming."
        return 1
    fi
}

record_stream() {
    local channel="$1"
    local quality="${2:-best}"
    local url="https://www.twitch.tv/${channel}"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local output_file="${RECORDINGS_DIR}/${channel}_${timestamp}.ts"

    # Check if already recording
    if [ -f "$PID_FILE" ]; then
        local existing_pid
        existing_pid=$(cat "$PID_FILE")
        if kill -0 "$existing_pid" 2>/dev/null; then
            echo "Already recording (PID: ${existing_pid}). Stop it first with: $0 stop"
            exit 1
        fi
    fi

    mkdir -p "$RECORDINGS_DIR"

    echo "Starting recording..."
    echo "  Channel:  ${channel}"
    echo "  Quality:  ${quality}"
    echo "  Output:   ${output_file}"
    echo ""

    streamlink "$url" "$quality" -o "$output_file" &
    local pid=$!
    echo "$pid" > "$PID_FILE"

    echo "Recording started (PID: ${pid})"
    echo "Use '$0 status' to check progress"
    echo "Use '$0 stop' to stop recording"
}

stop_recording() {
    if [ ! -f "$PID_FILE" ]; then
        echo "No active recording found."
        return 1
    fi

    local pid
    pid=$(cat "$PID_FILE")

    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "Recording stopped (PID: ${pid})"
    else
        echo "Recording process (PID: ${pid}) is no longer running."
    fi

    rm -f "$PID_FILE"

    # Show the latest recording
    local latest
    latest=$(ls -t "$RECORDINGS_DIR"/*.ts 2>/dev/null | head -1)
    if [ -n "$latest" ]; then
        local size
        size=$(du -h "$latest" | cut -f1)
        echo "Recording saved: ${latest} (${size})"
    fi
}

show_status() {
    echo "=== Twitch Recorder Status ==="
    echo ""

    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Status: RECORDING (PID: ${pid})"
        else
            echo "Status: STOPPED (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo "Status: IDLE"
    fi

    echo ""
    echo "=== Recordings ==="
    if [ -d "$RECORDINGS_DIR" ] && ls "$RECORDINGS_DIR"/*.ts &>/dev/null; then
        ls -lh "$RECORDINGS_DIR"/*.ts | awk '{print $NF, $5}'
    else
        echo "No recordings found."
    fi
}

# --- Main ---
check_streamlink

case "${1:-}" in
    record)
        if [ -z "${2:-}" ]; then
            echo "Error: channel name required"
            usage
            exit 1
        fi
        record_stream "$2" "${3:-best}"
        ;;
    check)
        if [ -z "${2:-}" ]; then
            echo "Error: channel name required"
            usage
            exit 1
        fi
        check_live "$2"
        ;;
    stop)
        stop_recording
        ;;
    status)
        show_status
        ;;
    *)
        usage
        exit 1
        ;;
esac
