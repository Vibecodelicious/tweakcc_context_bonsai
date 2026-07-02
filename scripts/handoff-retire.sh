#!/usr/bin/env bash
# Retire a predecessor window in the hand-off relay. Kills the target window
# ONLY if all guards pass:
#   - we are inside a tmux pane
#   - the target is not the window this script runs in
#   - the target window exists in this session (already gone => success, no-op)
#   - the target carries @handoff_state=retiring, set by handoff-relay.sh
#
# The marker guard is what protects other agents' windows: only a window that
# explicitly handed off marks itself retiring, so this script can never kill a
# window doing unrelated work, whatever id it is given.

set -euo pipefail

TARGET="${1:?usage: handoff-retire.sh <window-id, e.g. @3>}"

if [ -z "${TMUX:-}" ] || [ -z "${TMUX_PANE:-}" ]; then
  echo "error: not inside a tmux pane" >&2
  exit 1
fi

SELF_WINDOW="$(tmux display-message -p -t "$TMUX_PANE" '#{window_id}')"
if [ "$TARGET" = "$SELF_WINDOW" ]; then
  echo "refusing: $TARGET is this window — a session never retires itself" >&2
  exit 1
fi

if ! tmux list-windows -F '#{window_id}' | grep -qxF "$TARGET"; then
  echo "window $TARGET is already gone; nothing to do"
  exit 0
fi

STATE="$(tmux show-options -wqv -t "$TARGET" @handoff_state)"
if [ "$STATE" != "retiring" ]; then
  echo "refusing: window $TARGET is not marked retiring (@handoff_state='${STATE}') — it may belong to another agent" >&2
  exit 1
fi

tmux kill-window -t "$TARGET"
echo "retired predecessor window $TARGET"
