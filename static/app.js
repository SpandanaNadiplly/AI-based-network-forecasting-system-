/**
 * Network AI Guard - Simple & Clean Frontend Logic
 */

let currentScenario = "normal";
let liveSimActive = false;
let liveSimTimer = null;
let totalChecked = 0;
let safeChecked = 0;
let threatsChecked = 0;

const SCENARIOS = {
  normal: {
    title: "Normal Web Browsing",
    flow: {
      duration: 35.2,
      src_bytes: 1820.0,
      dst_bytes: 1250.0,
      packet_rate: 14.5,
      connections_to_same_host: 3,
      unique_dst_ports: 2,
      failed_logins: 0,
      dst_port: 443,
      protocol_type: "tcp"
    },
    meaning: "Standard internet traffic (e.g. visiting secure HTTPS websites). Packet flow rates, byte ratios, and connection behaviors are completely normal.",
    action: "No action required. Everything is running smoothly and safely."
  },
  dos: {
    title: "DoS Traffic Flood",
    flow: {
      duration: 2.1,
      src_bytes: 68.0,
      dst_bytes: 20.0,
      packet_rate: 620.0,
      connections_to_same_host: 380,
      unique_dst_ports: 1,
      failed_logins: 0,
      dst_port: 80,
      protocol_type: "tcp"
    },
    meaning: "An attacker is flooding your web server with 620+ packets per second across 380 rapid connections to exhaust server memory and bring the service down.",
    action: "CRITICAL: Activate DoS rate-limiting, enable SYN flood protection cookies, and temporarily block high-frequency source IP addresses."
  },
  portscan: {
    title: "Port Scan Reconnaissance",
    flow: {
      duration: 0.4,
      src_bytes: 32.0,
      dst_bytes: 8.0,
      packet_rate: 75.0,
      connections_to_same_host: 2,
      unique_dst_ports: 35,
      failed_logins: 0,
      dst_port: 1433,
      protocol_type: "tcp"
    },
    meaning: "A remote scanner (like Nmap) is probing 35+ unique network ports in under a second to discover unpatched or exposed backend database services.",
    action: "HIGH: Add firewall drop rules for the scanning IP address, close unused open ports, and restrict database port 1433 to internal IPs only."
  },
  bruteforce: {
    title: "Password Brute Force",
    flow: {
      duration: 8.5,
      src_bytes: 340.0,
      dst_bytes: 110.0,
      packet_rate: 22.0,
      connections_to_same_host: 45,
      unique_dst_ports: 1,
      failed_logins: 9,
      dst_port: 22,
      protocol_type: "tcp"
    },
    meaning: "An unauthorized bot is attempting repeated SSH/FTP logins with 9+ rapid authentication failures to guess administrator passwords.",
    action: "CRITICAL: Trigger automatic account lockout, enforce fail2ban / IP banning for repeat failed logins, and switch to SSH key-only authentication."
  }
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  selectScenario("normal");
});

// Scenario Selector
function selectScenario(key) {
  currentScenario = key;

  // Update button active state
  const keys = ["normal", "dos", "portscan", "bruteforce"];
  keys.forEach(k => {
    const btn = document.getElementById(`btn${capitalize(k)}`);
    if (btn) btn.classList.toggle("active", k === key);
  });

  analyzeCurrentScenario();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Analyze Scenario via API
async function analyzeCurrentScenario() {
  const scenario = SCENARIOS[currentScenario];
  if (!scenario) return;

  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenario.flow)
    });
    const data = await res.json();
    renderResult(data, scenario);
  } catch (err) {
    console.error("Prediction failed:", err);
  }
}

// Render Result Box
function renderResult(data, scenario) {
  const heroIcon = document.getElementById("heroIcon");
  const heroTitle = document.getElementById("heroTitle");
  const heroSub = document.getElementById("heroSub");
  const riskNum = document.getElementById("riskNum");
  const dangerTag = document.getElementById("dangerTag");
  const explMeaning = document.getElementById("explMeaning");
  const explAction = document.getElementById("explAction");
  const techContent = document.getElementById("techContent");

  const isSafe = data.predicted_label === "Normal";

  if (isSafe) {
    heroIcon.innerText = "✅";
    heroTitle.innerText = "SAFE: Normal Traffic";
    heroTitle.style.color = "var(--safe-green)";
    heroSub.innerText = `Confidence: ${(data.confidence * 100).toFixed(0)}% • No Anomaly Detected`;
    dangerTag.className = "danger-tag low";
    dangerTag.innerText = "LOW RISK (SAFE)";
  } else {
    heroIcon.innerText = "🚨";
    heroTitle.innerText = `ATTACK DETECTED: ${data.predicted_label}`;
    heroTitle.style.color = "var(--danger-red)";
    heroSub.innerText = `Confidence: ${(data.confidence * 100).toFixed(0)}% • Attack Probability: ${(data.attack_probability * 100).toFixed(0)}%`;
    dangerTag.className = `danger-tag ${data.risk_level.toLowerCase()}`;
    dangerTag.innerText = `${data.risk_level} THREAT`;
  }

  riskNum.innerText = `${data.risk_score.toFixed(0)}%`;
  riskNum.style.color = isSafe ? "var(--safe-green)" : "var(--danger-red)";

  explMeaning.innerText = scenario.meaning;
  explAction.innerText = scenario.action;

  // Technical Breakdown
  techContent.innerHTML = `
<b>Flow Data:</b>
Duration: ${scenario.flow.duration}s | Outbound: ${scenario.flow.src_bytes}B | Inbound: ${scenario.flow.dst_bytes}B | Packet Rate: ${scenario.flow.packet_rate}/s
Dest Port: ${scenario.flow.dst_port} | Conns to Host: ${scenario.flow.connections_to_same_host} | Failed Logins: ${scenario.flow.failed_logins}

<b>AI Probability Distribution:</b>
• Normal:      ${((data.probabilities.Normal || 0) * 100).toFixed(1)}%
• DoS:         ${((data.probabilities.DoS || 0) * 100).toFixed(1)}%
• PortScan:    ${((data.probabilities.PortScan || 0) * 100).toFixed(1)}%
• BruteForce:  ${((data.probabilities.BruteForce || 0) * 100).toFixed(1)}%
  `;
}

// Live Stream Simulator
function toggleLiveSim() {
  const btn = document.getElementById("btnToggleLive");
  liveSimActive = !liveSimActive;

  if (liveSimActive) {
    btn.innerText = "⏸ Pause Live Traffic";
    btn.classList.add("active");
    liveSimTimer = setInterval(processLivePacket, 1200);
  } else {
    btn.innerText = "▶ Start Live Traffic";
    btn.classList.remove("active");
    clearInterval(liveSimTimer);
  }
}

async function processLivePacket() {
  try {
    const res = await fetch("/stream-sample");
    const flow = await res.json();

    const predRes = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow)
    });
    const result = await predRes.json();

    totalChecked++;
    if (result.is_attack) {
      threatsChecked++;
    } else {
      safeChecked++;
    }

    document.getElementById("liveTotalCount").innerText = totalChecked;
    document.getElementById("liveSafeCount").innerText = safeChecked;
    document.getElementById("liveThreatCount").innerText = threatsChecked;

    addFeedRow(flow, result);
  } catch (err) {
    console.error("Live packet error:", err);
  }
}

function addFeedRow(flow, result) {
  const feed = document.getElementById("liveFeed");
  const empty = feed.querySelector(".feed-empty");
  if (empty) empty.remove();

  const isSafe = !result.is_attack;
  const time = new Date().toLocaleTimeString();

  const row = document.createElement("div");
  row.className = `feed-row ${isSafe ? 'safe' : 'danger'}`;
  row.innerHTML = `
    <span>${time} • <strong>${(flow.protocol_type || "tcp").toUpperCase()} Port ${flow.dst_port || 80}</strong></span>
    <span>${isSafe ? '🟢 Normal Behavior' : `🚨 <strong>${result.predicted_label}</strong> (${result.risk_score.toFixed(0)}% Threat)`}</span>
    <span class="feed-tag ${isSafe ? 'safe' : 'danger'}">${isSafe ? 'PASSED' : 'BLOCKED'}</span>
  `;

  feed.insertBefore(row, feed.firstChild);

  if (feed.children.length > 20) {
    feed.removeChild(feed.lastChild);
  }
}
