#!/bin/bash
# Skeptical Audit for Phase 0: "Parked" Status Purge
# Fails if 'parked' is found in any source file.

TARGET_STRING="parked"
SEARCH_PATH="src"

# Grep for the string in all .ts and .svelte files
MATCHES=$(grep -rn "$TARGET_STRING" "$SEARCH_PATH")

if [ -n "$MATCHES" ]; then
    echo "FAIL: Found '$TARGET_STRING' in the following files:"
    echo "$MATCHES"
    exit 1
else
    echo "PASS: No '$TARGET_STRING' instances found in $SEARCH_PATH."
    exit 0
fi
