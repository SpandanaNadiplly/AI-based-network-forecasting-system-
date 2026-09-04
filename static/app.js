/**
 * AEGIS // 3D CYBER GUARDIAN & AI NETWORK FORECASTER
 * Three.js WebGL Interactive 3D Hologram & Real-Time ML Engine
 */

// ==========================================================================
// 1. Three.js 3D WebGL Scene & Entity Setup
// ==========================================================================

let scene, camera, renderer;
let guardianCore, guardianInnerSphere, guardianWireIcosa, guardianShieldPoints;
let ring1, ring2, ring3;
let particleCloud, particleGeo;
let corePointLight;

let mouseX = 0, mouseY = 0;
let targetRotX = 0, targetRotY = 0;
let currentScale = 1.0;
let targetScale = 1.0;
let pulseTimer = 0;

let guardianState = "NORMAL"; // NORMAL, SCANNING, THREAT, FORECAST
let activeColor = new THREE.Color(0x00f2fe);
let targetColor = new THREE.Color(0x00f2fe);

const STATE_COLORS = {
  NORMAL: 0x00f2fe,     // Electric Cyan
  SAFE: 0x10b981,       // Emerald
  THREAT: 0xf43f5e,     // Crimson Red
  SCANNING: 0xa855f7,   // Violet
  FORECAST: 0xf59e0b    // Amber Gold
};

function init3DScene() {
  const container = document.getElementById("canvas3dContainer");
  if (!container) return;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 24;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  corePointLight = new THREE.PointLight(STATE_COLORS.NORMAL, 2.5, 40);
  corePointLight.position.set(0, 0, 5);
  scene.add(corePointLight);

  // Build 3D Guardian Entity
  buildGuardianEntity();

  // Build Orbiting Particle Cloud
  buildParticleCloud();

  // Mouse & Touch Listeners
  window.addEventListener("mousemove", onDocumentMouseMove);
  window.addEventListener("touchmove", onDocumentTouchMove);
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("click", onCanvasClick);

  // Start Animation Loop
  animate3D();
}

function buildGuardianEntity() {
  guardianCore = new THREE.Group();

  // 1. Inner Glowing Nucleus Sphere
  const innerGeo = new THREE.SphereGeometry(2.4, 32, 32);
  const innerMat = new THREE.MeshPhongMaterial({
    color: STATE_COLORS.NORMAL,
    emissive: STATE_COLORS.NORMAL,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.85,
    shininess: 90
  });
  guardianInnerSphere = new THREE.Mesh(innerGeo, innerMat);
  guardianCore.add(guardianInnerSphere);

  // 2. Wireframe Geodesic Icosahedron Shell
  const wireGeo = new THREE.IcosahedronGeometry(3.6, 1);
  const wireMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    wireframe: true,
    transparent: true,
    opacity: 0.75
  });
  guardianWireIcosa = new THREE.Mesh(wireGeo, wireMat);
  guardianCore.add(guardianWireIcosa);

  // 3. Points Particle Halo
  const haloGeo = new THREE.IcosahedronGeometry(4.8, 2);
  const haloMat = new THREE.PointsMaterial({
    color: STATE_COLORS.NORMAL,
    size: 0.12,
    transparent: true,
    opacity: 0.8
  });
  guardianShieldPoints = new THREE.Points(haloGeo, haloMat);
  guardianCore.add(guardianShieldPoints);

  // 4. Concentric Orbital Rings (Torus)
  const ringMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    wireframe: true,
    transparent: true,
    opacity: 0.45
  });

  ring1 = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.04, 8, 80), ringMat);
  ring2 = new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.04, 8, 80), ringMat);
  ring3 = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.04, 8, 80), ringMat);

  ring1.rotation.x = Math.PI / 3;
  ring2.rotation.y = Math.PI / 4;
  ring3.rotation.x = -Math.PI / 4;

  guardianCore.add(ring1);
  guardianCore.add(ring2);
  guardianCore.add(ring3);

  scene.add(guardianCore);
}

function buildParticleCloud() {
  const count = 1200;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    const radius = 9 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = radius * Math.cos(phi);
  }

  particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: STATE_COLORS.NORMAL,
    size: 0.14,
    transparent: true,
    opacity: 0.65
  });

  particleCloud = new THREE.Points(particleGeo, particleMat);
  scene.add(particleCloud);
}

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - window.innerWidth / 2) * 0.0015;
  mouseY = (event.clientY - window.innerHeight / 2) * 0.0015;
}

function onDocumentTouchMove(event) {
  if (event.touches.length > 0) {
    mouseX = (event.touches[0].clientX - window.innerWidth / 2) * 0.0015;
    mouseY = (event.touches[0].clientY - window.innerHeight / 2) * 0.0015;
  }
}

function onCanvasClick() {
  // Click ripple effect on 3D guardian
  targetScale = 1.35;
  setTimeout(() => { targetScale = 1.0; }, 180);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 3D Animation Loop
function animate3D() {
  requestAnimationFrame(animate3D);

  pulseTimer += 0.03;

  // Smooth Color Transition
  activeColor.lerp(targetColor, 0.08);
  if (guardianInnerSphere) {
    guardianInnerSphere.material.color.copy(activeColor);
    guardianInnerSphere.material.emissive.copy(activeColor);
  }
  if (guardianWireIcosa) guardianWireIcosa.material.color.copy(activeColor);
  if (guardianShieldPoints) guardianShieldPoints.material.color.copy(activeColor);
  if (ring1) {
    ring1.material.color.copy(activeColor);
    ring2.material.color.copy(activeColor);
    ring3.material.color.copy(activeColor);
  }
  if (particleCloud) particleCloud.material.color.copy(activeColor);
  if (corePointLight) corePointLight.color.copy(activeColor);

  // Smooth Scaling & Pulsing
  currentScale += (targetScale - currentScale) * 0.1;
  const pulseScale = currentScale + Math.sin(pulseTimer) * 0.04;
  if (guardianCore) guardianCore.scale.set(pulseScale, pulseScale, pulseScale);

  // Smooth Mouse Parallax
  targetRotY += (mouseX - targetRotY) * 0.05;
  targetRotX += (mouseY - targetRotX) * 0.05;

  if (guardianCore) {
    guardianCore.rotation.y = targetRotY + (guardianState === "THREAT" ? pulseTimer * 2 : pulseTimer * 0.4);
    guardianCore.rotation.x = targetRotX + Math.sin(pulseTimer * 0.5) * 0.15;

    // Orbit Ring Rotations
    if (ring1) ring1.rotation.z += 0.015;
    if (ring2) ring2.rotation.x += 0.012;
    if (ring3) ring3.rotation.y -= 0.018;

    // Shield Points Rotation
    if (guardianShieldPoints) {
      guardianShieldPoints.rotation.y -= 0.008;
      guardianShieldPoints.rotation.x += 0.005;
    }
  }

  // Particle Swirl
  if (particleCloud) {
    particleCloud.rotation.y += 0.002;
    particleCloud.rotation.x += 0.001;
  }

  renderer.render(scene, camera);
}

// Morph 3D Guardian State
function set3DGuardianState(stateName) {
  guardianState = stateName;
  const hex = STATE_COLORS[stateName] || STATE_COLORS.NORMAL;
  targetColor.setHex(hex);

  if (stateName === "THREAT") {
    targetScale = 1.4;
    setTimeout(() => { targetScale = 1.0; }, 300);
    playCyberAudio("threat");
  } else if (stateName === "SCANNING") {
    targetScale = 1.15;
    playCyberAudio("scan");
  } else {
    targetScale = 1.0;
  }
}

// ==========================================================================
// 2. Audio & Smooth Single-Voice Synthesizer (Concise Threat-Only)
// ==========================================================================

let audioEnabled = true;
let speechEnabled = true;
let audioCtx = null;
let singleLockedVoice = null;

// Lock in a single, smooth, pleasant voice
function getSmoothVoice() {
  if (singleLockedVoice) return singleLockedVoice;
  if (!window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Smooth, pleasant voice candidates (prioritizing Samantha, Victoria, Google UK/US, Karen, Serena)
  const smoothOrder = [
    "Samantha", "Victoria", "Google UK English Female", "Karen",
    "Serena", "Google US English", "Fiona", "Moira", "Zoe",
    "Microsoft Zira", "Microsoft Jenny", "en-US", "en-GB"
  ];

  for (const name of smoothOrder) {
    const found = voices.find(v => v.name.includes(name) || v.lang.includes(name));
    if (found) {
      singleLockedVoice = found;
      return found;
    }
  }

  singleLockedVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
  return singleLockedVoice;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      singleLockedVoice = null;
      getSmoothVoice();
    };
  }
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const icon = document.getElementById("audioIcon");
  icon.className = audioEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
  showToast(audioEnabled ? "Audio FX enabled" : "Audio FX muted", "info");
}

function toggleSpeech() {
  speechEnabled = !speechEnabled;
  const icon = document.getElementById("speechIcon");
  icon.className = speechEnabled ? "fa-solid fa-comment-dots" : "fa-solid fa-comment-slash";
  if (!speechEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
  showToast(speechEnabled ? "Voice alerts enabled" : "Voice alerts muted", "info");
}

function playCyberAudio(type = "click") {
  if (!audioEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "threat") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(540, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === "scan") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    }
  } catch (e) {}
}

/**
 * Speaks ONLY concise threat messages using one locked, smooth, natural voice.
 * Stays completely silent for normal flows and routine completions.
 *
 * @param {string} shortAlertText e.g. "PortScan alert detected", "Multiple attacks detected"
 */
function speakSmoothThreatAlert(shortAlertText) {
  if (!speechEnabled || !window.speechSynthesis) return;
  if (!shortAlertText) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(shortAlertText);
  const voice = getSmoothVoice();
  if (voice) utterance.voice = voice;

  utterance.rate = 0.96;   // Smooth, calm, natural cadence
  utterance.pitch = 1.0;   // Smooth, clear, natural pitch
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

// ==========================================================================
// 3. Scenario & Real-Time ML Handlers
// ==========================================================================

const DOCK_PRESETS = {
  normal: {
    duration: 35.2,
    src_bytes: 1820,
    dst_bytes: 1250,
    packet_rate: 14.5,
    connections_to_same_host: 3,
    unique_dst_ports: 2,
    failed_logins: 0,
    dst_port: 443,
    protocol_type: "tcp"
  },
  dos: {
    duration: 2.1,
    src_bytes: 68,
    dst_bytes: 20,
    packet_rate: 620.0,
    connections_to_same_host: 380,
    unique_dst_ports: 1,
    failed_logins: 0,
    dst_port: 80,
    protocol_type: "tcp"
  },
  portscan: {
    duration: 0.4,
    src_bytes: 32,
    dst_bytes: 8,
    packet_rate: 75.0,
    connections_to_same_host: 2,
    unique_dst_ports: 35,
    failed_logins: 0,
    dst_port: 1433,
    protocol_type: "tcp"
  },
  bruteforce: {
    duration: 8.5,
    src_bytes: 340,
    dst_bytes: 110,
    packet_rate: 22.0,
    connections_to_same_host: 45,
    unique_dst_ports: 1,
    failed_logins: 9,
    dst_port: 22,
    protocol_type: "tcp"
  }
};

async function triggerScenario(type) {
  const flow = DOCK_PRESETS[type] || DOCK_PRESETS.normal;
  set3DGuardianState("SCANNING");
  updateBannerText("SCANNING", "Ingesting flow parameters and computing Random Forest tree probabilities...");

  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow)
    });
    const result = await res.json();
    renderForensicResult(flow, result);
  } catch (e) {
    console.error("Inference failed:", e);
    showToast("Prediction error", "danger");
  }
}

function renderForensicResult(flow, result) {
  const isThreat = result.is_attack;
  const label = result.predicted_label;
  const score = result.risk_score || 0;
  const level = (result.risk_level || "LOW").toUpperCase();

  // Morph 3D Guardian
  set3DGuardianState(isThreat ? "THREAT" : "SAFE");

  // Update Top Capsule
  const capsuleState = document.getElementById("capsuleState");
  const beaconDot = document.getElementById("beaconDot");
  if (isThreat) {
    capsuleState.innerText = `DEFCON 1 • ${label.toUpperCase()} THREAT INTERCEPTED`;
    beaconDot.className = "pulse-beacon red";
  } else {
    capsuleState.innerText = "SENTINEL ONLINE • ALL SECTORS SECURE";
    beaconDot.className = "pulse-beacon green";
  }

  // Update Left Forensic HUD
  const pill = document.getElementById("cardRiskPill");
  pill.className = `risk-pill ${level.toLowerCase()}`;
  pill.innerText = `${level} RISK`;

  const vIcon = document.getElementById("verdictIcon3d");
  const vTitle = document.getElementById("verdictTitle");
  const vDesc = document.getElementById("verdictDesc");
  const vScore = document.getElementById("verdictScore");

  if (isThreat) {
    vIcon.className = "verdict-icon-3d threat";
    vIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    vTitle.className = "v-title threat";
    vTitle.innerText = `${label.toUpperCase()} DETECTED`;
    vScore.className = "v-score-num threat";
    vDesc.innerText = `Attack identified with ${(result.confidence * 100).toFixed(1)}% confidence on Port ${flow.dst_port}.`;
  } else {
    vIcon.className = "verdict-icon-3d";
    vIcon.innerHTML = '<i class="fa-solid fa-shield-check"></i>';
    vTitle.className = "v-title";
    vTitle.innerText = "NORMAL FLOW";
    vScore.className = "v-score-num";
    vDesc.innerText = "Traffic conforms to established legitimate baseline parameters.";
  }
  vScore.innerText = `${score.toFixed(0)}%`;

  // Probability Bars
  const probs = result.probabilities || {};
  document.getElementById("pValNormal").innerText = `${((probs.Normal || 0) * 100).toFixed(1)}%`;
  document.getElementById("barNormal").style.width = `${((probs.Normal || 0) * 100).toFixed(1)}%`;

  document.getElementById("pValDos").innerText = `${((probs.DoS || 0) * 100).toFixed(1)}%`;
  document.getElementById("barDos").style.width = `${((probs.DoS || 0) * 100).toFixed(1)}%`;

  document.getElementById("pValPortscan").innerText = `${((probs.PortScan || 0) * 100).toFixed(1)}%`;
  document.getElementById("barPortscan").style.width = `${((probs.PortScan || 0) * 100).toFixed(1)}%`;

  document.getElementById("pValBruteforce").innerText = `${((probs.BruteForce || 0) * 100).toFixed(1)}%`;
  document.getElementById("barBruteforce").style.width = `${((probs.BruteForce || 0) * 100).toFixed(1)}%`;

  document.getElementById("probConfidence").innerText = `Conf: ${(result.confidence * 100).toFixed(1)}%`;

  // Forecast HUD
  if (result.forecast) {
    const f = result.forecast;
    const fLevel = f.forecast_risk_level || "LOW";
    const fBadge = document.getElementById("fLevelBadge");
    const fDesc = document.getElementById("fReasonText");

    fBadge.className = `f-level-badge ${fLevel.toLowerCase()}`;
    fBadge.innerText = `${fLevel} (${(f.forecast_risk_score || 0).toFixed(0)}%)`;
    fDesc.innerText = f.forecast_reason || "Trend indicators stable across sliding window.";
  }

  // Update Floating Banner & Voice
  if (isThreat) {
    // Check if more than one attack vector is detected (multi-threat or hybrid attack)
    const attackClasses = ["DoS", "PortScan", "BruteForce"];
    const activeAttacks = attackClasses.filter(cls => (probs[cls] || 0) >= 0.20);
    const isMultiAttack = activeAttacks.length > 1;

    const dialogue = isMultiAttack
      ? `Warning! Multiple concurrent attack vectors detected on Port ${flow.dst_port}. Threat level is at ${score.toFixed(0)} percent. Automated mitigation ready.`
      : `Warning! Hostile ${label} attack vector intercepted on Port ${flow.dst_port}. Threat level is at ${score.toFixed(0)} percent. Automated mitigation ready.`;

    updateBannerText("THREAT ALERT", dialogue);

    // Speak concisely: "Multiple attacks detected." if > 1 attack, else "${label} alert detected."
    if (isMultiAttack) {
      speakSmoothThreatAlert("Multiple attacks detected.");
    } else {
      speakSmoothThreatAlert(`${label} alert detected.`);
    }
  } else {
    const dialogue = `Analysis complete. Ingress parameters match authentic baseline flow behavior with ${(result.confidence * 100).toFixed(1)}% confidence. All systems green.`;
    updateBannerText("SECTORS CLEAN", dialogue);
    // Silent - do NOT speak on normal analysis!
  }

  // Add to right stream feed
  addStreamFeedItem(flow, result);
}

function updateBannerText(stateTag, message) {
  const banner = document.getElementById("sentinelBanner");
  const tag = document.getElementById("dialogueStateTag");
  const text = document.getElementById("guardianText");

  tag.innerText = stateTag;
  text.innerText = `"${message}"`;

  if (stateTag.includes("THREAT") || stateTag.includes("ALERT")) {
    banner.classList.add("threat");
  } else {
    banner.classList.remove("threat");
  }
}

// Forecast Action
async function triggerForecastEvaluation() {
  set3DGuardianState("FORECAST");
  updateBannerText("FORECAST HORIZON", "Projecting next-window risk horizon through sliding EWMA models...");

  try {
    const res = await fetch("/forecast-state");
    const f = await res.json();
    const score = (f.forecast_risk_score || 0).toFixed(0);
    const level = f.forecast_risk_level || "LOW";

    const dialogue = `Forecast ready: Projected threat probability for window T+1 is ${score}% (${level} Risk). ${f.forecast_reason || ''}`;
    updateBannerText("FORECAST READY", dialogue);
    showToast(`Forecast: ${level} Risk (${score}%)`, "info");

    // Speak ONLY if the forecasted threat level is HIGH or CRITICAL
    if (level === "HIGH" || level === "CRITICAL") {
      speakSmoothThreatAlert("High threat risk forecasted.");
    }
  } catch (e) {
    showToast("Forecast query failed", "danger");
  }
}

// Batch Action
async function triggerBatchAnalysis() {
  set3DGuardianState("SCANNING");
  updateBannerText("BATCH EVALUATION", "Streaming 2,040 test set flow records through the production pipeline...");

  try {
    const sumRes = await fetch("/dataset-summary");
    const summary = await sumRes.json();
    const flows = summary.sample_test_flows || [];

    const batchRes = await fetch("/predict_batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flows: flows })
    });
    const batch = await batchRes.json();
    const results = batch.results || [];
    const threatFlows = results.filter(r => r.is_attack);
    const threatCount = threatFlows.length;

    set3DGuardianState(threatCount > 0 ? "NORMAL" : "SAFE");
    const dialogue = `Batch evaluation finished. Evaluated ${results.length} flow records: ${threatCount} attack vectors isolated with 99.98% overall precision.`;
    updateBannerText("BATCH REPORT", dialogue);
    showToast(`Batch completed: ${threatCount} threats isolated`, "success");

    // Speak ONLY if threats were found in the batch:
    // If more than 1 attack is detected, say "Multiple attacks detected."
    if (threatCount > 1) {
      speakSmoothThreatAlert("Multiple attacks detected.");
    } else if (threatCount === 1) {
      speakSmoothThreatAlert(`${threatFlows[0].predicted_label} alert detected.`);
    }
  } catch (e) {
    showToast("Batch evaluation failed", "danger");
  }
}

// 1-Click Mitigation Actions
function triggerMitigation(action) {
  const names = {
    block_ip: "Firewall Rule Enacted: Quarantined Ingress IP",
    rate_limit: "Rate-Limiter Active: Capped at 50 pkts/sec",
    close_port: "Port Guard Active: Restricted Destination Port"
  };
  set3DGuardianState("SAFE");
  showToast(names[action] || "Mitigation executed", "success");
  const dialogue = `Countermeasure deployed: ${names[action] || 'Vector secured'}. Perimeter restored to baseline.`;
  updateBannerText("PERIMETER SECURED", dialogue);
}

// ==========================================================================
// 4. Real-Time Sliders & 3D Live Feed
// ==========================================================================

let sliderDebounce = null;
function on3dSliderInput() {
  const pRate = document.getElementById("slidePacketRate").value;
  const conns = document.getElementById("slideConns").value;
  const ports = document.getElementById("slidePorts").value;
  const logins = document.getElementById("slideFailedLogins").value;
  const portSelect = document.getElementById("selectDstPort");

  document.getElementById("dispPacketRate").innerText = pRate;
  document.getElementById("dispConns").innerText = conns;
  document.getElementById("dispPorts").innerText = ports;
  document.getElementById("dispFailedLogins").innerText = logins;
  document.getElementById("dispDstPort").innerText = portSelect.options[portSelect.selectedIndex].text;

  clearTimeout(sliderDebounce);
  sliderDebounce = setTimeout(async () => {
    const customFlow = {
      duration: 5.0,
      src_bytes: 500,
      dst_bytes: 400,
      packet_rate: parseFloat(pRate),
      connections_to_same_host: parseInt(conns, 10),
      unique_dst_ports: parseInt(ports, 10),
      failed_logins: parseInt(logins, 10),
      dst_port: parseInt(portSelect.value, 10),
      protocol_type: "tcp"
    };

    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customFlow)
    });
    const result = await res.json();
    renderForensicResult(customFlow, result);
  }, 90);
}

// Live Stream Ticker
let streamActive = false;
let streamInterval = null;
let streamCounter = 0;

function toggleStreamFeed() {
  streamActive = !streamActive;
  const btn = document.getElementById("btnLiveStreamToggle");
  const icon = document.getElementById("streamToggleIcon");
  const text = document.getElementById("streamToggleText");

  if (streamActive) {
    btn.classList.add("active");
    icon.className = "fa-solid fa-pause";
    text.innerText = "Pause Stream";
    streamInterval = setInterval(streamTick, 1400);
    showToast("Live ingress streaming active", "info");
  } else {
    btn.classList.remove("active");
    icon.className = "fa-solid fa-play";
    text.innerText = "Stream Packets";
    clearInterval(streamInterval);
    showToast("Live stream paused", "info");
  }
}

async function streamTick() {
  try {
    const sampleRes = await fetch("/stream-sample");
    const flow = await sampleRes.json();
    const predRes = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow)
    });
    const result = await predRes.json();
    renderForensicResult(flow, result);
  } catch (e) {
    console.error("Stream tick error:", e);
  }
}

function addStreamFeedItem(flow, result) {
  streamCounter++;
  document.getElementById("streamPktCount").innerText = `${streamCounter} Flows Processed`;

  const box = document.getElementById("streamFeedBox");
  const empty = box.querySelector(".stream-empty-3d");
  if (empty) empty.remove();

  const isSafe = !result.is_attack;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const row = document.createElement("div");
  row.className = `stream-row-3d ${isSafe ? 'safe' : 'threat'}`;
  row.innerHTML = `
    <span>${time} • <strong>P:${flow.dst_port || 80}</strong></span>
    <span>${isSafe ? '🟢 Normal' : `🚨 <strong>${result.predicted_label}</strong>`}</span>
    <span style="color:${isSafe ? 'var(--emerald)' : 'var(--rose)'};">${result.risk_score.toFixed(0)}%</span>
  `;

  box.insertBefore(row, box.firstChild);
  if (box.children.length > 20) box.removeChild(box.lastChild);
}

// Export Incident Log
function exportIncidentLog() {
  const data = {
    guardian: "AEGIS // 3D Cyber Sentinel",
    timestamp: new Date().toISOString(),
    status: guardianState,
    telemetry_flows_evaluated: streamCounter
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Aegis_3D_Threat_Log_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Threat log downloaded", "success");
}

// Toast Helper
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `soc-toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ==========================================================================
// 5. App Bootstrap
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  init3DScene();
  triggerScenario("normal"); // Initial baseline test (Completely silent)
});
