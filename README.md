# Sora Image Generator

## Description

This script uses **Puppeteer** to interact with the [sora.com](https://sora.com) website. It automates the process of entering prompts and generating images. The script requires **Chromium** to run.

## Requirements

1. **Chromium** installed on your system.
2. You must be logged into the [sora.com](https://sora.com) website.
3. Navigate to the **My Media** page and select a generated image (URL such as: https://sora.chatgpt.com/t/task_01jsw4zeykft8b36de9d73vfag).

## Setup

### Start Chromium with Remote Debugging

Run the following command to start Chromium with remote debugging enabled:

```bash
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

### Install Dependencies

Ensure **Node.js** is installed, then run:

```bash
yarn install
```

## Usage

1. Start Chromium with the command above.
2. Log in to [sora.com](https://sora.com) and navigate to the **My Media** page.
3. Open a generated image.
4. Run the script with:

```bash
yarn start
```

The script will begin interacting with the page, entering prompts, and generating images automatically.

## Notes

- Prompts and variables used by the script are configured in the `playbook.json` file.
- Ensure the `playbook.json` file is correctly set up before running the script.
- Logs of operations are saved in the `logs.log` file.

## Dependencies

- [puppeteer-core](https://www.npmjs.com/package/puppeteer-core)
