@echo off
FOR /l %%i in (0,1,%1) DO echo "E" 1>&2
