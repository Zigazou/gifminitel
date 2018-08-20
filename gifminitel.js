"use strict"
/**
 * @file gifminitel.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * GifMinitel is a Gif89a Encoder for Minitel images.
 */

/**
 * GifMinitel is a Gif89a Encoder for Minitel images.
 */
class GifMinitel {
    /**
     * @param {int?} width Width in pixels of the resulting image, 320 by
     *                     default.
     * @param {int?} height Height in pixels of the resulting image, 250 by
     *                      default.
     * @param {int?} delay Delay in milliseconds used between images, 40 ms by
     *                     default (25 Hz).
     */
    constructor(width, height, delay) {
        /**
         * Width in pixels of the resulting image.
         * @member {int}
         * @private
         */
        this.width = width || 320

        /**
         * Height in pixels of the resulting image.
         * @member {int}
         * @private
         */
        this.height = height || 250

        /**
         * Default delay in milliseconds between each image.
         * @member {int}
         * @private
         */
        this.delay = delay || 40

        /**
         * Copy of the previous encoded frame. It is used to create a delta
         * image which will require much less memory to be encoded in Gif.
         * @member {}
         * @private
         */
        this.previous = undefined
    }

    add(image, delay) {

    }

    save() {
        GifMinitel.concatArray(
            GifMinitel.header,
            GifMinitel.logicalScreenDescriptor(this.width, this.height),
            GifMinitel.globalColorTable,
            GifMinitel.trailer
        )
    }
}

GifMinitel.concatArray = function(...arrays) {
    let totalLength = 0

    for(let arr of arrays) {
        totalLength += arr.length
    }

    const result = new Uint8Array(totalLength)
    let offset = 0

    for(let arr of arrays) {
        result.set(arr, offset)
        offset += arr.length
    }

    return result
}

GifMinitel.header = new Uint8Array([
    0x47, 0x49, 0x46, // "GIF"
    0x38, 0x39, 0x61  // "89a"
])

GifMinitel.logicalScreenDescriptor = function(width, height) {
    return Uint8Array([
        width & 0x00FF, width >> 8, // Width (16 bits)
        height & 0x00FF, height >> 8, // Height (16 bits)
        0b10000011, // global color table, 1 bit color resolution, no sort
                    // 16 entries in the global color table
        0x08, // Background color index
        0x00 // No pixel aspect ratio information
    ])
}

GifMinitel.globalColorTable = new Uint8Array([
    0x00, 0x00, 0x00, // Black
    0xFF, 0x00, 0x00, // Red
    0x00, 0xFF, 0x00, // Green
    0x00, 0x00, 0xFF, // Blue
    0xFF, 0xFF, 0x00, // Yellow
    0xFF, 0x00, 0xFF, // Magenta
    0x00, 0xFF, 0xFF, // Cyan
    0xFF, 0xFF, 0xFF, // White
    0xFB, 0xFB, 0xFB, // Transparent color
    0x00, 0x00, 0x00,
    0x00, 0x00, 0x00,
    0x00, 0x00, 0x00,
    0x00, 0x00, 0x00,
    0x00, 0x00, 0x00,
    0x00, 0x00, 0x00,
    0x00, 0x00, 0x00
])

GifMinitel.GraphicControlExtension = function(delay) {
    delay = delay / 10

    return new Uint8Array([
        0x21, // Extension introducer
        0xF9, // Graphic Control Extension
        0x04, // Block size
        0b00000101, // Do not dispose, user input not expected, transparent
                    // index given.
        delay & 0x00FF, delay >> 8, // Delay time in 1/100th seconds
        0x08, // Transparent color index
        0x00 // Block terminator
    ])
}

GifMinitel.trailer = new Uint8Array([
    0x38 // Trailer
])
