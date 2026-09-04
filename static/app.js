/**
 * AEGIS·NET AI - Autonomous SOC & Predictive Threat Forecaster
 * Enterprise Frontend Controller & Real-Time Intelligence Engine
 */

// State Management
let currentTab = "live-radar";
let liveSimActive = false;
let liveSimTimer = null;
let streamSpeedMs = 1200;
let audioAlertsEnabled = true;

let totalFlows = 0;
let safeFlows = 0;
let threatFlows = 0;

let classCounts = {
  Normal: 0,
  DoS: 0,
  PortScan: 0,
  BruteForce: 0
};

let streamHistory = [];
let forecastHistory = [];
let currentModalData = null;

// Presets for Simulator
const SIM_PRESETS = {
  normal: {
    name: "Normal Web Traffic",
    packet_rate: 14.5,
    connections_to_same_host: 3,
    unique_dst_ports: 2,
    failed_logins: 0,
    src_bytes: 1820,
    dst_bytes: 1250,
    duration: 35.2,
    dst_port: 443,
    protocol_type: "tcp"
  },
  dos: {
    name: "DoS Traffic Flood",
    packet_rate: 620.0,
    connections_to_same_host: 380,
    unique_dst_ports: 1,
    failed_logins: 0,
    src_bytes: 68,
    dst_bytes: 20,
    duration: 2.1,
    dst_port: 80,
    protocol_type: "tcp"
  },
  portscan: {
    name: "Port Scan Reconnaissance",
    packet_rate: 75.0,
    connections_to_same_host: 2,
    unique_dst_ports: 35,
    failed_logins: 0,
    src_bytes: 32,
    dst_bytes: 8,
    duration: 0.4,
    dst_port: 1433,
    protocol_type: "tcp"
  },
  bruteforce: {
    name: "Password Brute Force Attack",
    packet_rate: 22.0,
    connections_to_same_host: 45,
    unique_dst_ports: 1,
    failed_logins: 9,
    src_bytes: 340,
    dst_bytes: 110,
    duration: 8.5,
    dst_port: 22,
    protocol_type: "tcp"
  }
};

let activePresetKey = "normal";

// Chart.js Instances
let chartThroughput = null;
let chartAttackDist = null;
let chartForecastHorizon = null;
let chartFeatureImp = null;

// Audio Synthesizer (Web Audio API)
let audioCtx = null;
function playThreatSound(type = "threat") {
  if (!audioAlertsEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "threat") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    }
  } catch (e) {
    // Ignore audio permission restrictions
  }
}

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initClock();
  initCharts();
  loadMetadataAndFeatures();
  selectPreset("normal");
  checkSystemHealth();
});

// Real-Time UTC SOC Clock
function initClock() {
  const clockEl = document.getElementById("socClock");
  setInterval(() => {
    const now = new Date();
    const timeStr = now.toISOString().substring(11, 19) + " UTC";
    if (clockEl) clockEl.innerText = timeStr;
  }, 1000);
}

// Toggle Audio Alerts
function toggleAudioAlerts() {
  audioAlertsEnabled = !audioAlertsEnabled;
  const icon = document.getElementById("audioIcon");
  if (icon) {
    icon.className = audioAlertsEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
  }
  showToast(audioAlertsEnabled ? "Audio threat alerts enabled" : "Audio threat alerts muted", "info");
}

// Switch Tabs
function switchTab(tabId) {
  currentTab = tabId;
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => tab.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add("active");

  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    const isActive = btn.getAttribute("onclick").includes(`'${tabId}'`);
    btn.classList.toggle("active", isActive);
  });

  // Resize charts on view switch
  setTimeout(() => {
    if (tabId === "live-radar" && chartThroughput) chartThroughput.resize();
    if (tabId === "predictive-forecast" && chartForecastHorizon) chartForecastHorizon.resize();
    if (tabId === "model-intel" && chartFeatureImp) chartFeatureImp.resize();
  }, 100);
}

// ==========================================================================
// Chart.js Setup
// ==========================================================================
function initCharts() {
  // 1. Live Throughput Line Chart
  const ctxThroughput = document.getElementById("liveThroughputChart");
  if (ctxThroughput) {
    chartThroughput = new Chart(ctxThroughput, {
      type: "line",
      data: {
        labels: Array(15).fill(""),
        datasets: [
          {
            label: "Safe Ingress Flows",
            data: Array(15).fill(0),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 2
          },
          {
            label: "Threats Blocked",
            data: Array(15).fill(0),
            borderColor: "#f43f5e",
            backgroundColor: "rgba(244, 63, 94, 0.15)",
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#64748b" } },
          y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#64748b", stepSize: 1 }, beginAtZero: true }
        },
        plugins: {
          legend: { labels: { color: "#94a3b8", font: { family: "Inter", size: 11 } } }
        }
      }
    });
  }

  // 2. Attack Distribution Doughnut Chart
  const ctxDist = document.getElementById("attackDistChart");
  if (ctxDist) {
    chartAttackDist = new Chart(ctxDist, {
      type: "doughnut",
      data: {
        labels: ["Normal", "DoS", "PortScan", "BruteForce"],
        datasets: [{
          data: [1, 0, 0, 0],
          backgroundColor: ["#10b981", "#f43f5e", "#f59e0b", "#a855f7"],
          borderColor: "#070a13",
          borderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // 3. Forecast Horizon Line Chart
  const ctxForecast = document.getElementById("forecastHorizonChart");
  if (ctxForecast) {
    chartForecastHorizon = new Chart(ctxForecast, {
      type: "line",
      data: {
        labels: ["T-9", "T-8", "T-7", "T-6", "T-5", "T-4", "T-3", "T-2", "T-1", "NOW", "T+1 (Forecast)"],
        datasets: [
          {
            label: "Historical Anomaly Risk (%)",
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null],
            borderColor: "#00f2fe",
            backgroundColor: "rgba(0, 242, 254, 0.1)",
            borderWidth: 2.5,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#00f2fe"
          },
          {
            label: "AI Projected Horizon Risk (%)",
            data: [null, null, null, null, null, null, null, null, null, 0, 0],
            borderColor: "#f59e0b",
            borderDash: [5, 5],
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: "#f59e0b"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#64748b" } },
          y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#64748b" }, min: 0, max: 100 }
        },
        plugins: {
          legend: { labels: { color: "#94a3b8", font: { family: "Inter", size: 11 } } }
        }
      }
    });
  }

  // 4. Feature Importance Horizontal Bar Chart
  const ctxFeat = document.getElementById("featureImportanceChart");
  if (ctxFeat) {
    chartFeatureImp = new Chart(ctxFeat, {
      type: "bar",
      indexAxis: "y",
      data: {
        labels: [],
        datasets: [{
          label: "Gini Feature Importance",
          data: [],
          backgroundColor: "rgba(0, 242, 254, 0.75)",
          borderColor: "#00f2fe",
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#64748b" }, beginAtZero: true },
          y: { grid: { display: false }, ticks: { color: "#94a3b8", font: { family: "JetBrains Mono", size: 10 } } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// ==========================================================================
// System Health & Metadata
// ==========================================================================
async function checkSystemHealth() {
  try {
    const t0 = performance.now();
    const res = await fetch("/health");
    const t1 = performance.now();
    const latency = Math.max(0.8, (t1 - t0)).toFixed(1);

    const latEl = document.getElementById("navLatency");
    if (latEl) latEl.innerText = `~${latency} ms`;
  } catch (err) {
    console.error("Health check error:", err);
  }
}

async function loadMetadataAndFeatures() {
  try {
    const res = await fetch("/metadata");
    const data = await res.json();

    if (data.top_features && chartFeatureImp) {
      const topFeatures = data.top_features.slice(0, 8);
      chartFeatureImp.data.labels = topFeatures.map(f => f.feature);
      chartFeatureImp.data.datasets[0].data = topFeatures.map(f => f.importance);
      chartFeatureImp.update();
    }
  } catch (err) {
    console.error("Failed to load metadata:", err);
  }
}

// ==========================================================================
// TAB 1: Live Stream Simulator
// ==========================================================================
function toggleLiveSim() {
  const btn = document.getElementById("btnToggleLiveStream");
  const icon = document.getElementById("btnLiveIcon");
  const text = document.getElementById("btnLiveText");

  liveSimActive = !liveSimActive;

  if (liveSimActive) {
    btn.classList.add("active");
    icon.className = "fa-solid fa-pause";
    text.innerText = "Pause Stream";
    liveSimTimer = setInterval(processLiveTelemetryTick, streamSpeedMs);
    showToast("Ingress live packet stream initiated", "info");
  } else {
    btn.classList.remove("active");
    icon.className = "fa-solid fa-play";
    text.innerText = "Start Live Traffic";
    clearInterval(liveSimTimer);
    showToast("Live packet stream paused", "info");
  }
}

function changeStreamSpeed() {
  const select = document.getElementById("streamSpeed");
  streamSpeedMs = parseInt(select.value, 10);
  if (liveSimActive) {
    clearInterval(liveSimTimer);
    liveSimTimer = setInterval(processLiveTelemetryTick, streamSpeedMs);
  }
}

async function processLiveTelemetryTick() {
  try {
    const sampleRes = await fetch("/stream-sample");
    const flow = await sampleRes.json();

    const predRes = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow)
    });
    const result = await predRes.json();

    handleFlowResult(flow, result);
  } catch (err) {
    console.error("Live tick error:", err);
  }
}

// Inject immediate attack burst
async function injectRandomAttack() {
  const attackTypes = ["dos", "portscan", "bruteforce"];
  const chosenType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
  const preset = SIM_PRESETS[chosenType];

  try {
    const predRes = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset)
    });
    const result = await predRes.json();

    handleFlowResult(preset, result);
    showToast(`🚨 INJECTED ATTACK BURST: ${chosenType.toUpperCase()} intercepted!`, "danger");
  } catch (err) {
    console.error("Injection failed:", err);
  }
}

// Core processing of a flow result
function handleFlowResult(flow, result) {
  totalFlows++;
  const isThreat = result.is_attack;
  const label = result.predicted_label;

  if (isThreat) {
    threatFlows++;
    playThreatSound("threat");
  } else {
    safeFlows++;
  }

  classCounts[label] = (classCounts[label] || 0) + 1;

  // Update KPI Ribbon
  document.getElementById("kpiTotalFlows").innerText = totalFlows.toLocaleString();
  document.getElementById("kpiSafeFlows").innerText = safeFlows.toLocaleString();
  document.getElementById("kpiThreatsCount").innerText = threatFlows.toLocaleString();

  const safeRate = ((safeFlows / totalFlows) * 100).toFixed(1);
  const threatRate = ((threatFlows / totalFlows) * 100).toFixed(1);
  document.getElementById("kpiSafeRate").innerText = `${safeRate}%`;
  document.getElementById("kpiThreatRate").innerText = `${threatRate}%`;

  // Update Global DEFCON
  const defconEl = document.getElementById("navDefcon");
  if (defconEl) {
    if (result.risk_level === "CRITICAL" || result.risk_level === "HIGH") {
      defconEl.className = "pill-value badge-defcon severe";
      defconEl.innerText = `DEFCON 1 • ${result.risk_level} THREAT`;
    } else if (result.risk_level === "MEDIUM") {
      defconEl.className = "pill-value badge-defcon elevated";
      defconEl.innerText = "DEFCON 3 • ELEVATED";
    } else {
      defconEl.className = "pill-value badge-defcon";
      defconEl.innerText = "DEFCON 4 • NORMAL";
    }
  }

  // Update Forecast KPI
  if (result.forecast) {
    updateForecastDisplay(result.forecast);
  }

  // Update Charts
  updateLiveCharts(isThreat, label);

  // Add to stream table
  addStreamRow(flow, result);
}

function updateForecastDisplay(forecast) {
  const scoreEl = document.getElementById("kpiForecastScore");
  const pillEl = document.getElementById("kpiForecastPill");
  const reasonEl = document.getElementById("kpiForecastReason");

  const score = forecast.forecast_risk_score || 0;
  const level = (forecast.forecast_risk_level || "LOW").toUpperCase();
  const levelClass = level.toLowerCase();

  if (scoreEl) scoreEl.innerText = `${score.toFixed(0)}%`;
  if (pillEl) {
    pillEl.className = `kpi-badge forecast-badge-pill ${levelClass}`;
    pillEl.innerText = `${level} RISK`;
  }
  if (reasonEl) reasonEl.innerText = forecast.forecast_reason || "Observing traffic flow trend...";

  // Forecast Tab Elements
  const fcScore = document.getElementById("fcScoreVal");
  const fcBadge = document.getElementById("fcLevelBadge");
  const fcConf = document.getElementById("fcConfidenceVal");
  const fcReason = document.getElementById("fcRationaleText");
  const fcEarly = document.getElementById("fcEarlyWarning");

  if (fcScore) fcScore.innerText = `${score.toFixed(0)}%`;
  if (fcBadge) {
    fcBadge.innerText = `${level} THREAT HORIZON`;
    fcBadge.style.color = level === "LOW" ? "var(--emerald-safe)" : "var(--rose-danger)";
  }
  if (fcConf) {
    const conf = Math.round((forecast.forecast_confidence || 0.85) * 100);
    fcConf.innerText = `${conf}%`;
  }
  if (fcReason) fcReason.innerText = forecast.forecast_reason || "AI model evaluating continuous network behavior.";

  if (fcEarly) {
    if (level === "CRITICAL" || level === "HIGH") {
      fcEarly.className = "early-warning-alert" ;
      fcEarly.style.background = "rgba(244, 63, 94, 0.1)";
      fcEarly.style.borderColor = "rgba(244, 63, 94, 0.4)";
      fcEarly.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation text-rose"></i>
        <div>
          <strong class="text-rose">Predictive Threat Spike Alert:</strong>
          <span>High probability of volumetric assault or unauthorized port probing in the upcoming window. Automated rate-limiting is recommended.</span>
        </div>
      `;
    } else {
      fcEarly.style.background = "rgba(16, 185, 129, 0.08)";
      fcEarly.style.borderColor = "rgba(16, 185, 129, 0.3)";
      fcEarly.innerHTML = `
        <i class="fa-solid fa-circle-check text-emerald"></i>
        <div>
          <strong class="text-emerald">Predictive Horizon Clean:</strong>
          <span>All predictive indicators project stable network throughput without impending volumetric spikes or reconnaissance surges.</span>
        </div>
      `;
    }
  }

  // Update Forecast Horizon Chart
  if (chartForecastHorizon) {
    forecastHistory.push(score);
    if (forecastHistory.length > 10) forecastHistory.shift();

    const histData = [...forecastHistory];
    while (histData.length < 10) histData.unshift(0);

    chartForecastHorizon.data.datasets[0].data = [...histData, null];
    chartForecastHorizon.data.datasets[1].data = [...Array(9).fill(null), histData[histData.length - 1], score];
    chartForecastHorizon.update("none");
  }
}

function updateLiveCharts(isThreat, label) {
  // Update Throughput
  if (chartThroughput) {
    const safeData = chartThroughput.data.datasets[0].data;
    const threatData = chartThroughput.data.datasets[1].data;

    safeData.shift();
    safeData.push(isThreat ? 0 : 1);

    threatData.shift();
    threatData.push(isThreat ? 1 : 0);

    chartThroughput.update("none");
  }

  // Update Doughnut
  if (chartAttackDist) {
    chartAttackDist.data.datasets[0].data = [
      classCounts.Normal || 0,
      classCounts.DoS || 0,
      classCounts.PortScan || 0,
      classCounts.BruteForce || 0
    ];
    chartAttackDist.update("none");

    document.getElementById("legNormal").innerText = classCounts.Normal || 0;
    document.getElementById("legDos").innerText = classCounts.DoS || 0;
    document.getElementById("legPortscan").innerText = classCounts.PortScan || 0;
    document.getElementById("legBruteforce").innerText = classCounts.BruteForce || 0;
  }
}

function addStreamRow(flow, result) {
  const tbody = document.getElementById("streamTableBody");
  const emptyRow = document.getElementById("streamEmptyRow");
  if (emptyRow) emptyRow.remove();

  const isThreat = result.is_attack;
  const time = new Date().toISOString().substring(11, 19);
  const flowIndex = streamHistory.length;

  streamHistory.unshift({ flow, result, time });
  if (streamHistory.length > 50) streamHistory.pop();

  const tr = document.createElement("tr");
  tr.className = isThreat ? "threat-row" : "";
  tr.dataset.label = result.predicted_label;
  tr.dataset.isThreat = isThreat ? "true" : "false";

  const byteRatio = ((flow.src_bytes || 0) / Math.max(1, flow.dst_bytes || 1)).toFixed(2);
  const tagClass = result.predicted_label.toLowerCase();

  tr.innerHTML = `
    <td>${time}</td>
    <td><span class="text-cyan">${(flow.protocol_type || "tcp").toUpperCase()}</span></td>
    <td><strong>Port ${flow.dst_port || 80}</strong></td>
    <td>${(flow.duration || 0).toFixed(1)}s</td>
    <td>${(flow.packet_rate || 0).toFixed(1)}/s</td>
    <td>${byteRatio}</td>
    <td><span class="table-tag ${tagClass}">${result.predicted_label}</span></td>
    <td><strong style="color:${isThreat ? 'var(--rose-danger)' : 'var(--emerald-safe)'}">${result.risk_score.toFixed(0)}%</strong></td>
    <td><span class="table-tag ${isThreat ? 'threat' : 'safe'}">${isThreat ? 'BLOCKED' : 'ALLOWED'}</span></td>
    <td>
      <button class="btn-inspect-row" onclick="inspectStreamIndex(0)">
        <i class="fa-solid fa-magnifying-glass"></i> Inspect
      </button>
    </td>
  `;

  tbody.insertBefore(tr, tbody.firstChild);

  if (tbody.children.length > 30) {
    tbody.removeChild(tbody.lastChild);
  }
}

function inspectStreamIndex(idx) {
  if (streamHistory[idx]) {
    openPacketModal(streamHistory[idx].flow, streamHistory[idx].result);
  }
}

function filterStreamTable() {
  const searchVal = document.getElementById("streamSearch").value.toLowerCase();
  const filterVal = document.getElementById("streamFilter").value;
  const rows = document.querySelectorAll("#streamTableBody tr:not(.empty-row)");

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    const label = row.dataset.label;
    const isThreat = row.dataset.isThreat === "true";

    let matchesFilter = true;
    if (filterVal === "THREATS_ONLY" && !isThreat) matchesFilter = false;
    if (filterVal === "SAFE_ONLY" && isThreat) matchesFilter = false;
    if (filterVal === "DoS" && label !== "DoS") matchesFilter = false;
    if (filterVal === "PortScan" && label !== "PortScan") matchesFilter = false;
    if (filterVal === "BruteForce" && label !== "BruteForce") matchesFilter = false;

    const matchesSearch = text.includes(searchVal);
    row.style.display = matchesFilter && matchesSearch ? "" : "none";
  });
}

// ==========================================================================
// TAB 2: ATTACK SIMULATOR & TUNING LAB
// ==========================================================================
function selectPreset(presetKey) {
  activePresetKey = presetKey;
  const preset = SIM_PRESETS[presetKey];
  if (!preset) return;

  // Update preset button active states
  ["normal", "dos", "portscan", "bruteforce"].forEach(k => {
    const btn = document.getElementById(`presetBtn-${k}`);
    if (btn) btn.classList.toggle("active", k === presetKey);
  });

  // Populate sliders
  document.getElementById("slidePacketRate").value = preset.packet_rate;
  document.getElementById("slideConns").value = preset.connections_to_same_host;
  document.getElementById("slidePorts").value = preset.unique_dst_ports;
  document.getElementById("slideFailedLogins").value = preset.failed_logins;
  document.getElementById("slideSrcBytes").value = preset.src_bytes;
  document.getElementById("slideDstBytes").value = preset.dst_bytes;
  document.getElementById("slideDuration").value = preset.duration;
  document.getElementById("selectDstPort").value = preset.dst_port;

  updateSliderDisplayValues();
  recalculateSimulator();
}

function resetSimulatorDefaults() {
  selectPreset("normal");
  showToast("Simulator reset to normal traffic baseline", "info");
}

function updateSliderDisplayValues() {
  document.getElementById("valPacketRate").innerText = document.getElementById("slidePacketRate").value;
  document.getElementById("valConns").innerText = document.getElementById("slideConns").value;
  document.getElementById("valPorts").innerText = document.getElementById("slidePorts").value;
  document.getElementById("valFailedLogins").innerText = document.getElementById("slideFailedLogins").value;
  document.getElementById("valSrcBytes").innerText = document.getElementById("slideSrcBytes").value;
  document.getElementById("valDstBytes").innerText = document.getElementById("slideDstBytes").value;
  document.getElementById("valDuration").innerText = document.getElementById("slideDuration").value;
  
  const portSelect = document.getElementById("selectDstPort");
  document.getElementById("valDstPort").innerText = portSelect.options[portSelect.selectedIndex].text;
}

let sliderDebounceTimer = null;
function onSliderChange() {
  updateSliderDisplayValues();
  clearTimeout(sliderDebounceTimer);
  sliderDebounceTimer = setTimeout(recalculateSimulator, 80);
}

function getSimulatorCurrentFlow() {
  return {
    packet_rate: parseFloat(document.getElementById("slidePacketRate").value),
    connections_to_same_host: parseInt(document.getElementById("slideConns").value, 10),
    unique_dst_ports: parseInt(document.getElementById("slidePorts").value, 10),
    failed_logins: parseInt(document.getElementById("slideFailedLogins").value, 10),
    src_bytes: parseFloat(document.getElementById("slideSrcBytes").value),
    dst_bytes: parseFloat(document.getElementById("slideDstBytes").value),
    duration: parseFloat(document.getElementById("slideDuration").value),
    dst_port: parseInt(document.getElementById("selectDstPort").value, 10),
    protocol_type: "tcp"
  };
}

async function recalculateSimulator() {
  const flow = getSimulatorCurrentFlow();
  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow)
    });
    const result = await res.json();
    renderSimulatorVerdict(flow, result);
  } catch (err) {
    console.error("Simulator recalculation failed:", err);
  }
}

function renderSimulatorVerdict(flow, result) {
  const isThreat = result.is_attack;
  const label = result.predicted_label;
  const level = (result.risk_level || "LOW").toUpperCase();

  // Verdict Banner
  const badgeEl = document.getElementById("simRiskBadge");
  const bannerEl = document.getElementById("simVerdictBanner");
  const iconEl = document.getElementById("simVerdictIcon");
  const titleEl = document.getElementById("simVerdictTitle");
  const descEl = document.getElementById("simVerdictDesc");
  const scoreNum = document.getElementById("simRiskScore");
  const confTag = document.getElementById("simConfidenceTag");

  badgeEl.className = `risk-badge-status ${level.toLowerCase()}`;
  badgeEl.innerText = `${level} RISK LEVEL`;

  if (isThreat) {
    iconEl.className = "verdict-icon-wrap danger";
    iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    titleEl.className = "verdict-title danger";
    titleEl.innerText = `ATTACK IDENTIFIED: ${label.toUpperCase()}`;
    scoreNum.style.color = "var(--rose-danger)";

    if (label === "DoS") {
      descEl.innerText = `Volumetric flood detected: ${flow.packet_rate} pkts/sec across ${flow.connections_to_same_host} rapid host connections.`;
    } else if (label === "PortScan") {
      descEl.innerText = `Reconnaissance scanning signature: ${flow.unique_dst_ports} unique ports probed within ${flow.duration}s.`;
    } else if (label === "BruteForce") {
      descEl.innerText = `Authentication brute-force: ${flow.failed_logins} consecutive authentication failures targeting port ${flow.dst_port}.`;
    }
  } else {
    iconEl.className = "verdict-icon-wrap";
    iconEl.innerHTML = '<i class="fa-solid fa-shield-check"></i>';
    titleEl.className = "verdict-title";
    titleEl.innerText = "NORMAL NETWORK TRAFFIC";
    scoreNum.style.color = "var(--emerald-safe)";
    descEl.innerText = "Flow telemetry conforms to standard enterprise baseline patterns. Zero security anomalies identified.";
  }

  scoreNum.innerText = `${result.risk_score.toFixed(0)}%`;
  confTag.innerText = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;

  // Probability Bars
  const probs = result.probabilities || {};
  const pNorm = ((probs.Normal || 0) * 100).toFixed(1);
  const pDos = ((probs.DoS || 0) * 100).toFixed(1);
  const pScan = ((probs.PortScan || 0) * 100).toFixed(1);
  const pBrute = ((probs.BruteForce || 0) * 100).toFixed(1);

  document.getElementById("probNormalVal").innerText = `${pNorm}%`;
  document.getElementById("probNormalBar").style.width = `${pNorm}%`;

  document.getElementById("probDosVal").innerText = `${pDos}%`;
  document.getElementById("probDosBar").style.width = `${pDos}%`;

  document.getElementById("probPortscanVal").innerText = `${pScan}%`;
  document.getElementById("probPortscanBar").style.width = `${pScan}%`;

  document.getElementById("probBruteforceVal").innerText = `${pBrute}%`;
  document.getElementById("probBruteforceBar").style.width = `${pBrute}%`;

  // Playbook Recommendations
  const pbText = document.getElementById("simPlaybookText");
  if (isThreat) {
    if (label === "DoS") {
      pbText.innerHTML = `<strong>Active DoS Mitigation:</strong> Apply SYN-cookies, enact IP rate-limiting, and trigger scrubbing center diversion.`;
    } else if (label === "PortScan") {
      pbText.innerHTML = `<strong>Recon Defense Playbook:</strong> Quarantine scanning subnet, drop ICMP/SYN port probes, and restrict Port ${flow.dst_port}.`;
    } else if (label === "BruteForce") {
      pbText.innerHTML = `<strong>Credential Protection:</strong> Trigger account lockout, deploy fail2ban iptables ban, and require hardware MFA.`;
    }
  } else {
    pbText.innerText = "Traffic conforms to standard parameters. Keep standard automated monitoring active.";
  }
}

function applyPlaybookMitigation(actionType) {
  const actionNames = {
    block_ip: "Firewall Rule Deployed: Quarantined Ingress IP",
    rate_limit: "Rate-Limiter Activated: Capped at 50 pkts/sec",
    close_port: "Port Guard Active: Restricted Destination Port"
  };
  showToast(actionNames[actionType] || "Mitigation action executed", "success");
}

// ==========================================================================
// TAB 4: BATCH FORENSICS & CSV
// ==========================================================================
async function loadSampleTestBatch() {
  showToast("Loading test dataset flows...", "info");
  try {
    const res = await fetch("/dataset-summary");
    const summary = await res.json();
    const flows = summary.sample_test_flows || [];

    if (flows.length === 0) {
      showToast("No test flows available in dataset cache", "danger");
      return;
    }

    const batchRes = await fetch("/predict_batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flows: flows })
    });
    const batchData = await batchRes.json();
    renderBatchResults(batchData.results);
  } catch (err) {
    console.error("Batch load error:", err);
    showToast("Batch evaluation failed", "danger");
  }
}

function handleCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const csvText = e.target.result;
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) return;

      const headers = lines[0].split(",").map(h => h.trim());
      const flows = [];

      for (let i = 1; i < Math.min(lines.length, 250); i++) {
        const parts = lines[i].split(",");
        if (parts.length >= headers.length) {
          const row = {};
          headers.forEach((h, idx) => {
            const val = parts[idx].trim();
            row[h] = isNaN(Number(val)) ? val : Number(val);
          });
          flows.push(row);
        }
      }

      showToast(`Uploaded ${flows.length} records. Analyzing with AI...`, "info");
      const batchRes = await fetch("/predict_batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flows: flows })
      });
      const batchData = await batchRes.json();
      renderBatchResults(batchData.results);
    } catch (err) {
      console.error("CSV parse error:", err);
      showToast("Failed to parse CSV file", "danger");
    }
  };
  reader.readAsText(file);
}

function renderBatchResults(results) {
  if (!results || results.length === 0) return;

  let threatCount = 0;
  let dosCount = 0;
  let portscanCount = 0;
  let bruteCount = 0;
  let totalRisk = 0;

  const tbody = document.getElementById("batchTableBody");
  tbody.innerHTML = "";

  results.forEach((r, idx) => {
    if (r.is_attack) threatCount++;
    if (r.predicted_label === "DoS") dosCount++;
    if (r.predicted_label === "PortScan") portscanCount++;
    if (r.predicted_label === "BruteForce") bruteCount++;
    totalRisk += (r.risk_score || 0);

    const tr = document.createElement("tr");
    tr.className = r.is_attack ? "threat-row" : "";
    const tagClass = r.predicted_label.toLowerCase();

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${(r.duration || 0).toFixed(1)}s</td>
      <td>${(r.src_bytes || 0).toFixed(0)}B</td>
      <td>${(r.dst_bytes || 0).toFixed(0)}B</td>
      <td>${(r.packet_rate || 0).toFixed(1)}</td>
      <td>${r.connections_to_same_host || 1}</td>
      <td>${r.unique_dst_ports || 1}</td>
      <td>${r.failed_logins || 0}</td>
      <td><span class="table-tag ${tagClass}">${r.predicted_label}</span></td>
      <td>${((r.confidence || 1) * 100).toFixed(1)}%</td>
      <td><strong style="color:${r.is_attack ? 'var(--rose-danger)' : 'var(--emerald-safe)'}">${(r.risk_level || 'LOW')}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  // Update Batch Stats Row
  document.getElementById("batchMetricsRow").style.display = "grid";
  document.getElementById("batchTotalCount").innerText = results.length;
  document.getElementById("batchThreatCount").innerText = threatCount;
  document.getElementById("batchDosCount").innerText = dosCount;
  document.getElementById("batchPortscanCount").innerText = portscanCount;
  document.getElementById("batchBruteforceCount").innerText = bruteCount;
  document.getElementById("batchAvgRisk").innerText = `${(totalRisk / results.length).toFixed(0)}%`;

  showToast(`Batch forensic completed: ${threatCount} threats isolated`, threatCount > 0 ? "danger" : "success");
}

// ==========================================================================
// Modal Deep Packet Inspector
// ==========================================================================
function openPacketModal(flow, result) {
  currentModalData = { flow, result };
  const modal = document.getElementById("packetModal");
  const body = document.getElementById("modalPacketBody");

  const isThreat = result.is_attack;
  const tagClass = result.predicted_label.toLowerCase();

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:0.75rem 1rem; border-radius:8px; border:1px solid var(--border-subtle);">
      <div>
        <div style="font-size:0.7rem; color:var(--text-muted);">AI PREDICTED VERDICT</div>
        <div style="font-size:1.2rem; font-weight:800; color:${isThreat ? 'var(--rose-danger)' : 'var(--emerald-safe)'};">${result.predicted_label}</div>
      </div>
      <div>
        <span class="table-tag ${tagClass}">${result.risk_level} RISK (${result.risk_score.toFixed(0)}%)</span>
      </div>
    </div>

    <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Ingress Flow Feature Vector (16 Features):</div>
    <div class="modal-field-grid">
      <div class="modal-field"><span class="modal-field-name">duration</span><span class="modal-field-val">${flow.duration || 0}s</span></div>
      <div class="modal-field"><span class="modal-field-name">src_bytes</span><span class="modal-field-val">${flow.src_bytes || 0} B</span></div>
      <div class="modal-field"><span class="modal-field-name">dst_bytes</span><span class="modal-field-val">${flow.dst_bytes || 0} B</span></div>
      <div class="modal-field"><span class="modal-field-name">packet_rate</span><span class="modal-field-val">${flow.packet_rate || 0} /s</span></div>
      <div class="modal-field"><span class="modal-field-name">conns_to_host</span><span class="modal-field-val">${flow.connections_to_same_host || 1}</span></div>
      <div class="modal-field"><span class="modal-field-name">unique_ports</span><span class="modal-field-val">${flow.unique_dst_ports || 1}</span></div>
      <div class="modal-field"><span class="modal-field-name">failed_logins</span><span class="modal-field-val">${flow.failed_logins || 0}</span></div>
      <div class="modal-field"><span class="modal-field-name">dst_port</span><span class="modal-field-val">${flow.dst_port || 80}</span></div>
    </div>

    <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Raw JSON Payload:</div>
    <pre class="modal-code-block">${JSON.stringify({ flow, prediction: result }, null, 2)}</pre>
  `;

  modal.classList.add("open");
}

function closePacketModal(e) {
  if (!e || e.target.id === "packetModal" || e.target.classList.contains("modal-close-btn") || e.target.tagName === "BUTTON") {
    const modal = document.getElementById("packetModal");
    if (modal) modal.classList.remove("open");
  }
}

function copyModalJson() {
  if (!currentModalData) return;
  navigator.clipboard.writeText(JSON.stringify(currentModalData, null, 2));
  showToast("Raw flow telemetry JSON copied to clipboard!", "success");
}

// Quick Export Incident Report
function triggerQuickMitigationExport() {
  const auditReport = {
    system: "AegisNet Autonomous SOC & Predictive Threat Platform",
    timestamp: new Date().toISOString(),
    stats: {
      total_flows: totalFlows,
      safe_flows: safeFlows,
      threats_intercepted: threatFlows,
      threat_distribution: classCounts
    },
    recent_incidents: streamHistory.filter(s => s.result.is_attack).slice(0, 15)
  };

  const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AegisNet_Threat_Audit_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Threat incident audit report downloaded", "success");
}

// ==========================================================================
// Toast Helper
// ==========================================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `soc-toast ${type}`;

  let icon = "fa-circle-info text-cyan";
  if (type === "danger") icon = "fa-triangle-exclamation text-rose";
  if (type === "success") icon = "fa-circle-check text-emerald";

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
