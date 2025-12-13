// State
let playbook = {
  prompts: [],
  vars: {},
  params: { waitMin: 7, waitMax: 10 },
};

// DOM Elements
const promptsContainer = document.getElementById("promptsContainer");
const varsContainer = document.getElementById("varsContainer");
const waitMinInput = document.getElementById("waitMin");
const waitMaxInput = document.getElementById("waitMax");
const messageDiv = document.getElementById("message");
const logContainer = document.getElementById("logContainer");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

// Buttons
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const addPromptBtn = document.getElementById("addPromptBtn");
const addVarBtn = document.getElementById("addVarBtn");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const clearLogsBtn = document.getElementById("clearLogsBtn");

// Utility Functions
function showMessage(text, type = "info") {
  messageDiv.textContent = text;
  messageDiv.className = `message show ${type}`;
  setTimeout(() => {
    messageDiv.classList.remove("show");
  }, 5000);
}

// API Calls
async function loadPlaybook() {
  try {
    const response = await fetch("/api/playbook");
    if (!response.ok) throw new Error("Failed to load playbook");
    playbook = await response.json();
    renderAll();
    showMessage("✅ Playbook loaded successfully", "success");
  } catch (error) {
    showMessage(`❌ Error loading: ${error.message}`, "error");
  }
}

async function savePlaybook() {
  try {
    collectData();
    const response = await fetch("/api/playbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(playbook),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.details ? result.details.join(", ") : result.error
      );
    }

    showMessage("✅ Playbook saved successfully", "success");
  } catch (error) {
    showMessage(`❌ Error saving: ${error.message}`, "error");
  }
}

// Generator Control
async function checkGeneratorStatus() {
  try {
    const response = await fetch("/api/generator/status");
    const { running } = await response.json();
    updateGeneratorUI(running);
  } catch (error) {
    console.error("Error checking status:", error);
  }
}

function updateGeneratorUI(running) {
  if (running) {
    statusDot.className = "status-dot running";
    statusText.textContent = "Running";
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusDot.className = "status-dot stopped";
    statusText.textContent = "Stopped";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function startGenerator() {
  try {
    const response = await fetch("/api/generator/start", {
      method: "POST",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error);
    }

    showMessage("✅ Generator started", "success");
    checkGeneratorStatus();
  } catch (error) {
    showMessage(`❌ Error: ${error.message}`, "error");
  }
}

async function stopGenerator() {
  try {
    const response = await fetch("/api/generator/stop", {
      method: "POST",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error);
    }

    showMessage("🛑 Generator stopping...", "info");
    checkGeneratorStatus();
  } catch (error) {
    showMessage(`❌ Error: ${error.message}`, "error");
  }
}

// Log Management
function addLogEntry(logEntry) {
  const logDiv = document.createElement("div");
  logDiv.className = `log-entry ${logEntry.type}`;
  logDiv.innerHTML = `<span class="timestamp">[${logEntry.timestamp}]</span>${logEntry.message}`;
  logContainer.appendChild(logDiv);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function clearLogs() {
  logContainer.innerHTML = "";
}

// SSE for real-time logs
function connectToLogStream() {
  const eventSource = new EventSource("/api/logs/stream");

  eventSource.onmessage = (event) => {
    const logEntry = JSON.parse(event.data);
    addLogEntry(logEntry);
  };

  eventSource.onerror = (error) => {
    console.error("SSE error:", error);
    setTimeout(connectToLogStream, 5000); // Reconnect after 5 seconds
  };
}

async function loadRecentLogs() {
  try {
    const response = await fetch("/api/logs");
    const logs = await response.json();
    logs.forEach(addLogEntry);
  } catch (error) {
    console.error("Error loading logs:", error);
  }
}

// Collect data from DOM
function collectData() {
  // Collect prompts
  const promptCards = document.querySelectorAll(".prompt-card");
  playbook.prompts = Array.from(promptCards).map((card) => ({
    text: card.querySelector(".prompt-text").value,
    retries: parseInt(card.querySelector(".prompt-retries").value) || 1,
    enabled: card.querySelector(".prompt-enabled").checked,
  }));

  // Collect vars
  const varCards = document.querySelectorAll(".var-card");
  playbook.vars = {};
  varCards.forEach((card) => {
    const varName = card.querySelector(".var-name-input").value.trim();
    if (varName) {
      const valueInputs = card.querySelectorAll(".value-input");
      playbook.vars[varName] = Array.from(valueInputs)
        .map((input) => input.value.trim())
        .filter((v) => v !== "");
    }
  });

  // Collect params
  playbook.params = {
    waitMin: parseFloat(waitMinInput.value) || 7,
    waitMax: parseFloat(waitMaxInput.value) || 10,
  };
}

// Render Functions
function renderAll() {
  renderPrompts();
  renderVars();
  renderParams();
}

function renderPrompts() {
  promptsContainer.innerHTML = "";
  playbook.prompts.forEach((prompt, index) => {
    const card = createPromptCard(prompt, index);
    promptsContainer.appendChild(card);
  });
}

function createPromptCard(prompt, index) {
  const card = document.createElement("div");
  card.className = "prompt-card";

  card.innerHTML = `
    <div class="prompt-header">
      <span class="prompt-number">Prompt ${index + 1}</span>
      <button class="btn btn-danger remove-prompt">🗑️ Remove</button>
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" class="prompt-enabled" ${
          prompt.enabled !== false ? "checked" : ""
        }>
        Enabled
      </label>
    </div>
    <div class="form-group">
      <label>Prompt Text:</label>
      <textarea class="prompt-text" placeholder="Enter prompt with variables {{name}}">${
        prompt.text || ""
      }</textarea>
    </div>
    <div class="form-group">
      <label>Number of Retries:</label>
      <input type="number" class="prompt-retries" min="1" value="${
        prompt.retries || 1
      }" />
    </div>
  `;

  card.querySelector(".remove-prompt").addEventListener("click", () => {
    playbook.prompts.splice(index, 1);
    renderPrompts();
  });

  return card;
}

function renderVars() {
  varsContainer.innerHTML = "";
  Object.entries(playbook.vars).forEach(([varName, values]) => {
    const card = createVarCard(varName, values);
    varsContainer.appendChild(card);
  });
}

function createVarCard(varName, values) {
  const card = document.createElement("div");
  card.className = "var-card";

  card.innerHTML = `
    <div class="var-header">
      <input type="text" class="var-name-input" value="${varName}" placeholder="variable_name" style="font-weight: bold; color: #764ba2; font-size: 1.1em; border: none; background: transparent; width: auto;">
      <button class="btn btn-danger remove-var">🗑️ Remove</button>
    </div>
    <div class="values-container"></div>
    <button class="btn-add-value">+ Add Value</button>
  `;

  const valuesContainer = card.querySelector(".values-container");

  function renderValues() {
    valuesContainer.innerHTML = "";
    values.forEach((value, valueIndex) => {
      const valueRow = document.createElement("div");
      valueRow.className = "value-row";
      valueRow.innerHTML = `
        <input type="text" class="value-input" value="${value}" placeholder="Value">
        <button class="btn-remove-value">✕</button>
      `;

      valueRow
        .querySelector(".btn-remove-value")
        .addEventListener("click", () => {
          values.splice(valueIndex, 1);
          renderValues();
        });

      valuesContainer.appendChild(valueRow);
    });
  }

  renderValues();

  card.querySelector(".btn-add-value").addEventListener("click", () => {
    values.push("");
    renderValues();
  });

  card.querySelector(".remove-var").addEventListener("click", () => {
    delete playbook.vars[varName];
    renderVars();
  });

  return card;
}

function renderParams() {
  waitMinInput.value = playbook.params.waitMin;
  waitMaxInput.value = playbook.params.waitMax;
}

// Add new items
addPromptBtn.addEventListener("click", () => {
  playbook.prompts.push({ text: "", retries: 1, enabled: true });
  renderPrompts();
});

addVarBtn.addEventListener("click", () => {
  const newVarName = `var_${Object.keys(playbook.vars).length + 1}`;
  playbook.vars[newVarName] = [""];
  renderVars();
});

// Button Events
loadBtn.addEventListener("click", loadPlaybook);
saveBtn.addEventListener("click", savePlaybook);
startBtn.addEventListener("click", startGenerator);
stopBtn.addEventListener("click", stopGenerator);
clearLogsBtn.addEventListener("click", clearLogs);

// Load on page load
window.addEventListener("DOMContentLoaded", () => {
  loadPlaybook();
  checkGeneratorStatus();
  loadRecentLogs();
  connectToLogStream();

  // Check status periodically
  setInterval(checkGeneratorStatus, 5000);
});
