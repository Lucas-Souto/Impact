#!/bin/bash

# Output file
OUTPUT_FILE=game.min.js


# Change CWD to Krater's base dir and bake!
cd ..
php tools/bake.php $OUTPUT_FILE