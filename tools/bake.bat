@echo off

:: Path to krater.js and your game's main .js
SET IMPACT_LIBRARY=lib/krater/krater.js
SET GAME=lib/game/main.js

:: Output file
SET OUTPUT_FILE=game.min.js


:: Change CWD to Impact's base dir
cd ../


:: Bake!
php tools/bake.php %IMPACT_LIBRARY% %GAME% %OUTPUT_FILE%

:: If you dont have the php.exe in your PATH uncomment the
:: following line and point it to your php.exe

::c:/php/php.exe tools/bake.php %IMPACT_LIBRARY% %GAME% %OUTPUT_FILE%

pause