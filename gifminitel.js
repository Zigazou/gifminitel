"use strict"
/**
 * @file gifminitel.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * GifMinitel is a Gif89a Encoder for Minitel images.
 */

/**
 * A GifString is a string of numbers.
 */
class GifString {
    /**
     * Constructor.
     *
     * @param {number?} item An optional item to initialize the GifString with.
     */
    constructor(item) {
        /**
         * A list of number
         * @member {number[]}
         * @private
         */
        this.numString = []

        if(item !== undefined) this.push(item)
    }

    /**
     * Calls a function for each element of the GifString.
     *
     * @param {*} fn Function to call.
     */
    forEach(fn) {
        this.numString.forEach(fn)
    }

    /**
     * Returns the length of the GifString.
     *
     * @returns {number}
     */
    len() {
        return this.numString.length
    }

    /**
     * Create a GifString which is the concatenation of this GifString and an
     * element.
     *
     * @param {number} item Element to concatenate.
     * @returns {GifString}
     */
    plus(item) {
        return new GifString(this.numString.concat([item]))
    }

    /**
     * Add an element to the current GifString.
     *
     * @param {number} item An item to add.
     */
    push(item) {
        if(item.forEach) {
            item.forEach(one => this.push(one))
        } else {
            this.numString.push(item)
        }
    }

    /**
     * Returns the first element of the GifString.
     *
     * @returns {number}
     */
    first() {
        return this.numString[0]
    }

    /**
     * Gives a string version of the GifString.
     *
     * @returns {string}
     */
    toString() {
        return this.numString.toString()
    }
}

/**
 * A Gif bits is a string of words of varying size which can then be packed in a
 * series of bytes.
 */
class GifBits {
    /**
     * Initializes a GifBits.
     *
     * @param {number} wordSize Size of a word in bits.
     */
    constructor(wordSize) {
        /**
         * Word size.
         *
         * @member {number}
         * @private
         */
        this.wordSize = wordSize

        /**
         * Bit string being constructed. The bits are stored as string of "0"
         * and "1" characters.
         *
         * @member {string}
         * @private
         */
        this.bitString = ""
    }

    /**
     * Change word size.
     *
     * @param {number} value
     */
    nextWordSize(value) {
        if(value >= Math.pow(this.wordSize)) this.wordSize++
    }

    /**
     * Add a word to the bits. Bits are stored reversed order.
     *
     * @param {number} value Word to add
     */
    push(value) {
        this.bitString = Number(value).toString(2).padStart(this.wordSize, "0")
                       + this.bitString
    }

    /**
     * Packs all words into bytes.
     *
     * @returns {Uint8Array}
     */
    bytes() {
        // Calculate pad bits
        const orphanBits = this.bitString.length % 8
        if(orphanBits !== 0) {
            this.bitString = "0".repeat(8 - orphanBits) + this.bitString
        }

        const bytes = []

        for(let offset = this.bitString.length - 8; offset >= 0; offset -= 8) {
            bytes.push(parseInt(this.bitString.substr(offset, 8), 2))
        }

        return new Uint8Array(bytes)
    }
}

/**
 * Implementation of the LZW encoder algorithm à la GIF.
 */
class GifCompress {
    /**
     * Constructor.
     */
    constructor() {
        /**
         * The last code being created in the dictionary. It starts at 18
         * because code 16 and 17 are reserved.
         * @member {number}
         */
        this.nextCode = 18

        /**
         * The dictionary of our LZW encoder.
         *
         * @member {Map}
         */
        this.dictionary = new Map()

        /**
         * The current phrase being read.
         *
         * @member {GifString}
         */
        this.phrase = new GifString()

        /**
         * The output starts with words of 5 bits length since the color palette
         * will always have 16 colors max.
         *
         * @member {GifBits}
         */
        this.output = new GifBits(5)
        this.output.push(16)
    }

    /**
     * Push computes a pixels from the stream. It implements an iteration from
     * the LZW compression algorithm.
     *
     * @param {number} red Red component.
     * @param {number} green Green component.
     * @param {number} blue Blue component.
     * @param {number} opacity Opacity (255=opaque, 0=transparent)
     */
    push(red, green, blue, opacity) {
        const colorIndex = GifCompress.colorToValue(red, green, blue, opacity)

        // Initial state.
        if(this.phrase.len() === 0) {
            this.phrase.push(colorIndex)
            return
        }

        // The next phrase is the current phrase plus the character being read.
        const nextPhrase = this.phrase.plus(colorIndex).toString()

        if(this.dictionary.has(nextPhrase)) {
            // If the next phrase is known, it becomes the current phrase.
            this.phrase.push(colorIndex)
            return this
        }

        // Output the current phrase.
        this.outPhrase()

        // One more phrase in the dictionary.
        this.dictionary.set(nextPhrase, this.nextCode)
        this.nextCode++

        // The new phrase contains only the character being read.
        this.phrase = new GifString(colorIndex)

        return this
    }

    /**
     * Place codes in the output stream.
     * @private
     */
    outPhrase() {
        if(this.phrase.len() === 1) {
            // A raw value is its own index.
            this.output.push(this.phrase.first())
        } else {
            // Find the index of the phrase in the dictionary.
            this.output.push(this.dictionary.get(this.phrase.toString()))
        }

        if(this.nextCode >= Math.pow(2, this.output.wordSize)) {
            this.output.wordSize++
        }
    }

    /**
     * Returns the LZW encoded stream.
     *
     * @returns {Uint8Array}
     */
    encode() {
        // Flush the last phrase in the output stream.
        this.outPhrase()

        // Add the end of information code at the end of the output stream.
        this.output.push(17)

        // Packs the bits string in bytes.
        return this.output.bytes()
    }
}

/**
 * Converts a RGBA color into a Minitel color.
 *
 * @param {number} red Red component.
 * @param {number} green Green component.
 * @param {number} blue Blue component.
 * @param {number} opacity Opacity level.
 * @returns {number}
 */
GifCompress.colorToValue = function(red, green, blue, opacity) {
    if(opacity === 0) return 15
    return (red === 0 ? 0 : 4) | (green === 0 ? 0 : 2) | (blue === 0 ? 0 : 1)
}

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

    /**
     * Add an image to the animation.
     *
     * @param {*} image Image to add.
     * @param {number} delay Delay in milliseconds.
     */
    add(image, width, height, delay) {
        this.width = width
        this.height = height
        this.image = image
    }

    /**
     * Generates a GIF file from all images that have been added to the
     * animation.
     * @returns {Uint8Array}
     */
    save() {
        return GifMinitel.concatArray(
            GifMinitel.header,
            GifMinitel.logicalScreenDescriptor(this.width, this.height),
            GifMinitel.globalColorTable,
            GifMinitel.graphicControlExtension(this.width, this.height, 40),
            GifMinitel.imageDescriptor(0, 0, this.width, this.height),
            GifMinitel.imageData(this.image),
            GifMinitel.trailer
        )
    }
}

/**
 * Concatenate multiple Uint8Array.
 *
 * @param {Uint8Array} arrays Arrays to concatenate.
 * @returns {Uint8Array}
 */
GifMinitel.concatArray = function(...arrays) {
    // Calculates total length.
    let totalLength = 0
    for(let array of arrays) {
        totalLength += array.length
    }

    const result = new Uint8Array(totalLength)
    let offset = 0

    for(let arr of arrays) {
        result.set(arr, offset)
        offset += arr.length
    }

    return result
}

/**
 * Put an array into blocks. Gif data must be contained into blocks preceded by
 * their size. The size of a block is 255 bytes at most.
 *
 * @param {Uint8Array} array Arrays to slice into blocks.
 * @returns {Uint8Array}
 */
GifMinitel.arrayBlock = function(array) {
    // GIF supports blocks up to 255 bytes.
    const nbBlock = Math.ceil(array.length / 255)
    const arrayBlock = new Uint8Array(array.length + nbBlock)

    let src = 0
    let dst = 0
    let size = 0
    while(src < array.length) {
        // How many bytes in this block?
        size = Math.min(255, array.length - src)

        // Insert the length of the block.
        arrayBlock.set(new Uint8Array([size]), dst)

        // Copy the block from the source array.
        arrayBlock.set(array.slice(src, src + size), dst + 1)

        // Next block.
        src += 255
        dst += 256
    }

    return arrayBlock
}

/**
 * GIF89a header.
 *
 * @member {Uint8Array}
 */
GifMinitel.header = new Uint8Array([
    0x47, 0x49, 0x46, // "GIF"
    0x38, 0x39, 0x61  // "89a"
])

/**
 * Generate a logical screen descriptor.
 *
 * @param {number} width Width in pixels.
 * @param {number} height Height in pixels.
 * @returns {Uint8Array}
 */
GifMinitel.logicalScreenDescriptor = function(width, height) {
    return new Uint8Array([
        width & 0x00FF, width >> 8, // Width (16 bits)
        height & 0x00FF, height >> 8, // Height (16 bits)
        0b10000011, // global color table, 1 bit color resolution, no sort
                    // 16 entries in the global color table
        0x08, // Background color index
        0x00 // No pixel aspect ratio information
    ])
}

/**
 * A global color table designed specifically for Minitel images.
 *
 * @member {Uint8Array}
 */
GifMinitel.globalColorTable = new Uint8Array([
    0x00, 0x00, 0x00, // Black
    0x00, 0x00, 0xFF, // Blue
    0x00, 0xFF, 0x00, // Green
    0x00, 0xFF, 0xFF, // Cyan
    0xFF, 0x00, 0x00, // Red
    0xFF, 0x00, 0xFF, // Magenta
    0xFF, 0xFF, 0x00, // Yellow
    0xFF, 0xFF, 0xFF, // White
    0xFB, 0xFB, 0xFB,
    0xFB, 0xFB, 0xFB,
    0xFB, 0xFB, 0xFB,
    0xFB, 0xFB, 0xFB,
    0xFB, 0xFB, 0xFB,
    0xFB, 0xFB, 0xFB,
    0xFB, 0xFB, 0xFB,
    0xFB, 0xFB, 0xFB  // Transparent color
])

/**
 * Generate a graphic control extension block.
 *
 * @param {number} delay Delay between images in millisecondes.
 * @returns {Uint8Array}
 */
GifMinitel.graphicControlExtension = function(delay) {
    delay = Math.floor(delay / 10)

    return new Uint8Array([
        0x21, // Extension introducer
        0xF9, // Graphic Control Extension
        0x04, // Block size
        0b00000001, // Do not dispose, user input not expected, transparent
                    // index given.
        delay & 0x00FF, delay >> 8, // Delay time in 1/100th seconds
        0x0F, // Transparent color index
        0x00 // Block terminator
    ])
}

/**
 * Generate an image description block.
 *
 * @param {number} left Left image position in pixels.
 * @param {number} top Top image position in pixels.
 * @param {number} width Width in pixels.
 * @param {number} height Height in pixels.
 * @returns {Uint8Array}
 */
GifMinitel.imageDescriptor = function(left, top, width, height) {
    return new Uint8Array([
        0x2C, // Image separator
        left & 0x00FF, left >> 8, // Image left position (16 bits)
        top & 0x00FF, top >> 8, // Image top position (16 bits)
        width & 0x00FF, width >> 8, // Width (16 bits)
        height & 0x00FF, height >> 8, // Height (16 bits)
        0b00000000 // No local color table, not interlaced, not sorted
    ])
}

/**
 * Generate an image data block.
 *
 * @param {number[][]} image Image from which to extract data.
 * @returns {Uint8Array}
 */
GifMinitel.imageData = function(image) {
    const gifc = new GifCompress(18)

    image.forEach(color => {
        gifc.push(color[0], color[1], color[2], color[3])
    })

    const data = gifc.encode()

    return GifMinitel.concatArray(
        new Uint8Array([4]),
        GifMinitel.arrayBlock(data),
        new Uint8Array([0x00])
    )
}

/**
 * A trailer block.
 *
 * @member {Uint8Array}
 */
GifMinitel.trailer = new Uint8Array([0x3B]) // Trailer
