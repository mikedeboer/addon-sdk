@echo off
rem Use `ping` to an invalid IP address because `timeout` isn't on
rem all environments??
rem http://stackoverflow.com/a/1672349/1785755
ping 1.1.1.1 -n 1 -w 2000 > nul