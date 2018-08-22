#!/bin/bash

GIFFILE="$1"
CODESIZE="$2"

tail --bytes=+81 "$GIFFILE" \
    | head --bytes=-2 \
    | xxd -b -c 1 \
    | cut -f 2 -d' ' \
    | tac \
    | tr -d '\n' \
    | sed -r 's/(.{'$CODESIZE'})/\1\n/g' \
    | tac
