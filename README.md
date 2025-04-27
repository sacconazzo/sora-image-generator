# Sora-Get

## Description

This script uses **Puppeteer** to interact with the [sora.com](https://sora.com) website. It automates the process of entering prompts and generating images. The script requires **Chromium** to run.

## Requirements

1. **Chromium** installed on your system.
2. You must be logged into the [sora.com](https://sora.com) website.
3. Navigate to a generated image page, such as:  
   [https://sora.chatgpt.com/g/gen_01jstffcxxf9dafhw0cb3yzt9z](https://sora.chatgpt.com/g/gen_01jstffcxxf9dafhw0cb3yzt9z).

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
2. Log in to [sora.com](https://sora.com) and navigate to a generated image page.
3. Run the script with:

```bash
yarn start
```

The script will begin interacting with the page, entering prompts, and generating images automatically.

## Notes

- Prompts and variables used by the script are configured in the `prompts.json` file.
- Ensure the `prompts.json` file is correctly set up before running the script.
- Logs of operations are saved in the `logs.log` file.

## Dependencies

- [puppeteer-core](https://www.npmjs.com/package/puppeteer-core)
