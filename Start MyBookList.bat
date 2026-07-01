@echo off
title MyBookList
cd /d "C:\Users\chris\mybooklist"
echo Starting MyBookList...
echo.
echo Open in browser: http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.
start http://localhost:3000/add
npm run dev
