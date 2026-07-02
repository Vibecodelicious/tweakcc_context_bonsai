#!/usr/bin/env bash
# Hand-off relay: launch a fresh claude session in a new tmux window, which
# reads HAND_OFF.md and continues the work, then retires this (predecessor)
# window via scripts/handoff-retire.sh.
#
# Called by the *outgoing* claude session as its final tool call, AFTER
# updating HAND_OFF.md. Must be run from inside a tmux pane.
#
# Do NOT call this when the next step is blocked on Basil — update HAND_OFF.md
# and send a slack message instead (see HAND_OFF.md relay protocol).

set -euo pipefail

if [ -z "${TMUX:-}" ] || [ -z "${TMUX_PANE:-}" ]; then
  echo "error: not inside a tmux pane; the relay chain must be started from a tmux session" >&2
  exit 1
fi

WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"

# Identify THIS window by the pane this script runs in ($TMUX_PANE), never by
# the client's active window — that is whatever window Basil is looking at,
# which may be a different agent's.
PRED_WINDOW="$(tmux display-message -p -t "$TMUX_PANE" '#{window_id}')"

# Mark this window as retiring. handoff-retire.sh kills only marked windows,
# so a garbled or stale id can never take down an unrelated agent.
tmux set-option -w -t "$PRED_WINDOW" @handoff_state retiring

CLAUDE_CMD="${HANDOFF_CLAUDE_CMD:-claude --model claude-fable-5}"

PROMPT="You are a fresh session in the hand-off relay. First run: scripts/handoff-retire.sh ${PRED_WINDOW} — it safely kills your predecessor's tmux window (never call tmux kill-window directly; the script verifies the target is marked as retiring). Then read HAND_OFF.md and execute its immediate next action. When your work unit is done: update HAND_OFF.md, then run scripts/handoff-relay.sh as your final tool call — unless you are blocked on input from Basil, in which case do not relaunch; slack him instead."

tmux new-window -c "$WORKDIR" "$CLAUDE_CMD $(printf '%q' "$PROMPT")"
