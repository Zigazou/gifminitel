GifMinitel
==========

GifMinitel is a JavaScript library that can create an animated Gif file. It is
targeted to encode Minitel screens, therefore it cannot be used for other types
of images.

![Example](output.gif)

Why another Gif encoder?
------------------------

There exists other Gif encoder written in JavaScript but I needed an encoder
which could compute differences between consecutive frames in order to better
compress the animation. Available Gif encoders compress all the image every
frame, thus generating bigger files.

Another reason was that I wanted to understand how the Gif file works at the
lower level.

How to use it?
--------------

Have a look at [the test.html demonstration](test.html)
