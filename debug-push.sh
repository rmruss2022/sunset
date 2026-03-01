#!/bin/bash
# Run this if push still fails to see GitHub's actual error message:
# GIT_TRACE=1 GIT_CURL_VERBOSE=1 git push -u origin main 2>&1 | tee push-debug.log
echo "To capture why GitHub returns 400, run:"
echo "  GIT_TRACE=1 GIT_CURL_VERBOSE=1 git push -u origin main 2>&1 | tee push-debug.log"
echo "Then check push-debug.log for the HTTP response body (often says 'file too large' or ref error)."
