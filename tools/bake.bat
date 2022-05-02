@echo off

:: Output file
SET OUTPUT_FILE=game.min.js


:: Change CWD to Krater's base dir
cd ../

:: Bake!
php tools/bake.php %OUTPUT_FILE%

:: If you dont have the php.exe in your PATH uncomment the
:: following line and point it to your php.exe

::c:/php/php.exe tools/bake.php %OUTPUT_FILE%

pause