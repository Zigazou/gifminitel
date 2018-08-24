#!/bin/bash
# This script unpacks the first image block from a GIF file.
# It does not uncompress it!
# It is used as a reverse engineering tool to analyze the LZW encoded stream.

# Converts a binary file in a sequence of 2 hex digits separated by a space.
# $1 = file path
function hexbytes() {
    local binfile="$1"

    xxd -cols 1 "$binfile" \
        | cut --fields=2 --delimiter=' ' \
        | tr '\n' ' '
}

# Converts a stream of binary numbers (one per line) into a stream of decimal
# numbers (one per line)
function bin2dec() {
    local line
    local dec

    while read line
    do
        dec=$(( 2#$line ))

        if [ $dec -eq $CLEARCODE ]
        then
            echo -e "\e[31m${dec}\e[39m"
            continue
        fi

        if [ $dec -eq $ENDOFINFORMATION ]
        then
            echo -e "\e[31m${dec}\e[39m"
            continue
        fi

        if [ $dec -ge $FIRSTCODE ]
        then
            echo -e "\e[1m${dec}\e[22m"
        else
            echo -e "\e[2m${dec}\e[22m"
        fi
    done
}

# Find the first offset of a binary string in a binary file.
# $1 = file path
# $2 = hexadecimal sequence to search (lowercase, separated by a space like
#      "21 f9 04")
# output = offset (decimal number)
function binoffset() {
    local binfile="$1"
    local searchbytes="$2"
    local offset

    offset=$(
        hexbytes "$binfile" \
            | grep --byte-offset --only-matching "$searchbytes" \
            | cut --fields=1 --delimiter=':' \
            | head --lines=1
    )

    printf "%d" $((offset / 3))
}

# Get the decimal value of a byte located at a specific offset in a binary file.
# $1 = file path
# $2 = offset (decimal number)
# output = value (decimal number)
function getbyte() {
    local binfile="$1"
    local offset="$(($2 + 1))"
    local hexvalue

    hexvalue=$(hexbytes "$binfile" | cut --fields="$offset" --delimiter=' ')

    printf '%d' 0x$hexvalue
}

# The GIF file.
GIFFILE="$1"

# Offset of the first image.
START=$(binoffset "$GIFFILE" "2c 00 00 00 00")

# Number of bits used to encode codes.
CODESIZE=$(( $(getbyte "$GIFFILE" $((START + 10))) + 1))
printf "CODESIZE=%d\n" $CODESIZE

# Defines clear, end of information and first codes.
CLEARCODE=$((2 ** (CODESIZE - 1)))
ENDOFINFORMATION=$((CLEARCODE + 1))
FIRSTCODE=$((CLEARCODE +2))

# Block length in bytes of the first block.
BLOCKLENGTH=$(getbyte "$GIFFILE" $((START + 11)))
printf "BLOCKLENGTH=%d\n" $BLOCKLENGTH

# Unpacks the values.
printf "CODES="
tail --bytes=+$((START + 13)) "$GIFFILE" \
    | head --bytes=$BLOCKLENGTH \
    | xxd -bits -cols 1 \
    | cut --fields=2 --delimiter=' ' \
    | tac \
    | tr --delete '\n'
echo