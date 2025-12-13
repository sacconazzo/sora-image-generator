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

The application will start both the generator script and a web server on port **6699**.

### Web Interface

Access the web interface at `http://localhost:6699` to manage your playbook configuration and control the generator:

**Features:**

- **🚀 Generator Control**: Start and stop the image generation process with real-time status monitoring
- **📋 Live Logs**: View generation logs in real-time with automatic updates via Server-Sent Events (SSE)
- **📝 Prompt Management**: Add, edit, enable/disable, and remove prompts dynamically
- **🔧 Variable Management**: Configure variables with multiple values for prompt randomization
- **⚙️ Parameters**: Adjust wait times (min/max) between generation cycles
- **💾 Playbook Management**: Load and save your configuration to `playbook.json`
- **📚 Multiple Playbooks**: Save, load, and manage multiple playbook configurations in the `playbooks/` folder

The web interface provides a user-friendly way to manage your automation without editing JSON files manually. All changes are validated before being saved to ensure configuration integrity.

## Notes

- Prompts and variables used by the script are configured in the `playbook.json` file.
- Ensure the `playbook.json` file is correctly set up before running the script.
- Logs of operations are saved in the `logs.log` file.

## API Endpoints

The application exposes the following REST API endpoints:

- `GET /api/playbook` - Retrieve current playbook configuration
- `POST /api/playbook` - Update playbook configuration (with validation)
- `GET /api/playbooks` - List all saved playbooks
- `GET /api/playbooks/:name` - Load a specific playbook
- `POST /api/playbooks/:name` - Save a playbook with custom name
- `DELETE /api/playbooks/:name` - Delete a playbook
- `GET /api/generator/status` - Check if generator is running
- `POST /api/generator/start` - Start the generator
- `POST /api/generator/stop` - Stop the generator
- `GET /api/logs` - Get recent logs
- `GET /api/logs/stream` - Real-time log stream (SSE)

## Dependencies

- [puppeteer-core](https://www.npmjs.com/package/puppeteer-core)
- [express](https://www.npmjs.com/package/express)
