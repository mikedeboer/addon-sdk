@echo off
setlocal
for /F "tokens=*" %%a in ('C:\Windows\System32\more.com') do (
  echo %%a
)
