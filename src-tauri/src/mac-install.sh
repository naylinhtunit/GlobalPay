#!/bin/sh
# CodePlus-style atomic replacement, with rollback. Arguments are native-generated paths.
set -eu
old=$1
fresh=$2
backup=$3
old_pid=$4
status=$5
mark() { printf '%s\n' "$1" > "$status"; }
mark waiting
attempt=0
while kill -0 "$old_pid" 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 120 ]; then mark failed-timeout; exit 1; fi
  /bin/sleep 0.5
done
if [ ! -d "$old" ] || [ ! -d "$fresh" ] || [ -e "$backup" ]; then mark failed-path; exit 1; fi
if ! /bin/mv "$old" "$backup"; then mark failed-backup; exit 1; fi
if ! /bin/mv "$fresh" "$old"; then
  /bin/mv "$backup" "$old" || true
  mark failed-replace
  /usr/bin/open -n -a "$old" || true
  exit 1
fi
if ! /usr/bin/open -n -a "$old"; then
  /bin/mv "$old" "$fresh" || true
  /bin/mv "$backup" "$old" || true
  mark failed-launch
  /usr/bin/open -n -a "$old" || true
  exit 1
fi
mark installed
