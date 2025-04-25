## Chrome

```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
--remote-debugging-port=9222 \
--user-data-dir="/tmp/puppeteer-profile" \
--no-first-run \
--no-default-browser-check
```

## Chromium RPI

```
chromium-browser \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/rpi-puppeteer-profile \
  --no-first-run \
  --no-default-browser-check \
  --disable-features=TranslateUI \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu
```
