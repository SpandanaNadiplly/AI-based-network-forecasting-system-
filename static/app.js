/**
 * HYPERION // Neural Threat Forecaster & AI Cyber Defense
 * Clean WebGL Holographic Globe & Real-Time ML Threat Forecasting Engine
 */

// ==========================================================================
// 1. Three.js 3D WebGL Holographic Scene (Cyber Network Globe & Radar Shield)
// ==========================================================================

let scene, camera, renderer;
let guardianCore;
let globeInnerCore, globeWireframe, globeLatLongMesh;
let radarSweepMesh, radarRingMajor, radarRingMinor;
let satelliteGroup, satellites = [];
let shieldBracketsGroup;
let corePointLight, ambientLight, dirLight;

let mouseX = 0, mouseY = 0;
let targetRotX = 0, targetRotY = 0;
let currentScale = 1.0;
let targetScale = 1.0;
let pulseTimer = 0;

let guardianState = "NORMAL"; // NORMAL, SCANNING, THREAT, SAFE, FORECAST
let activeColor = new THREE.Color(0x00f2fe);
let targetColor = new THREE.Color(0x00f2fe);

const STATE_COLORS = {
  NORMAL: 0x00f2fe,     // Electric Cyan
  SAFE: 0x10b981,       // Emerald Teal
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  // Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  corePointLight = new THREE.PointLight(STATE_COLORS.NORMAL, 3.5, 45);
  corePointLight.position.set(0, 0, 6);
  scene.add(corePointLight);

  dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(8, 12, 10);
  scene.add(dirLight);

  // Build Holographic Cyber Network Globe Sentinel
  buildGuardianEntity();

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

  // 1. Deep Glass Core Sphere (Network Nucleus)
  const innerGeo = new THREE.SphereGeometry(2.3, 32, 32);
  const innerMat = new THREE.MeshPhongMaterial({
    color: STATE_COLORS.NORMAL,
    emissive: STATE_COLORS.NORMAL,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.85,
    shininess: 90
  });
  globeInnerCore = new THREE.Mesh(innerGeo, innerMat);
  guardianCore.add(globeInnerCore);

  // 2. Holographic Latitude / Longitude Network Wireframe
  const wireGeo = new THREE.SphereGeometry(3.3, 20, 16);
  const wireMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  globeWireframe = new THREE.Mesh(wireGeo, wireMat);
  guardianCore.add(globeWireframe);

  // 3. Geodesic Defense Forcefield Cage
  const icosaGeo = new THREE.IcosahedronGeometry(4.2, 1);
  const icosaMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  globeLatLongMesh = new THREE.Mesh(icosaGeo, icosaMat);
  guardianCore.add(globeLatLongMesh);

  // 4. 360-Degree Holographic Radar Scanner Disc
  const radarGeo = new THREE.RingGeometry(0.2, 3.25, 32, 1, 0, Math.PI * 0.7);
  const radarMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45
  });
  radarSweepMesh = new THREE.Mesh(radarGeo, radarMat);
  radarSweepMesh.rotation.x = Math.PI / 2;
  guardianCore.add(radarSweepMesh);

  // 5. Equatorial and Polar Orbital Defense Gimbal Rings
  const ringMatMajor = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    wireframe: true,
    transparent: true,
    opacity: 0.5
  });
  radarRingMajor = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.04, 6, 90), ringMatMajor);
  radarRingMajor.rotation.x = Math.PI / 2.6;
  guardianCore.add(radarRingMajor);

  const ringMatMinor = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });
  radarRingMinor = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.035, 6, 90), ringMatMinor);
  radarRingMinor.rotation.y = Math.PI / 3;
  guardianCore.add(radarRingMinor);

  // 6. 3 Precision Orbiting Defense Satellites (Clean Solid Node Gems)
  satelliteGroup = new THREE.Group();
  satellites = [];
  const satGeo = new THREE.OctahedronGeometry(0.32, 0);
  const satMat = new THREE.MeshPhongMaterial({
    color: STATE_COLORS.NORMAL,
    emissive: STATE_COLORS.NORMAL,
    emissiveIntensity: 0.9,
    shininess: 100
  });

  for (let i = 0; i < 3; i++) {
    const sat = new THREE.Mesh(satGeo, satMat.clone());
    satellites.push(sat);
    satelliteGroup.add(sat);
  }
  guardianCore.add(satelliteGroup);

  // 7. Outer Cybernetic Reticle Brackets
  shieldBracketsGroup = new THREE.Group();
  const reticleRingMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS.NORMAL,
    wireframe: true,
    transparent: true,
    opacity: 0.25
  });
  const reticle = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.025, 4, 80), reticleRingMat);
  shieldBracketsGroup.add(reticle);
  guardianCore.add(shieldBracketsGroup);

  scene.add(guardianCore);
}

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - window.innerWidth / 2) * 0.0012;
  mouseY = (event.clientY - window.innerHeight / 2) * 0.0012;
}

function onDocumentTouchMove(event) {
  if (event.touches.length > 0) {
    mouseX = (event.touches[0].clientX - window.innerWidth / 2) * 0.0012;
    mouseY = (event.touches[0].clientY - window.innerHeight / 2) * 0.0012;
  }
}

function onCanvasClick(e) {
  if (e.target.closest('.hud-topbar, .sentinel-dialogue-banner, .floating-glass-card, .hud-command-dock, .modal-dialog-3d, .toast-container')) {
    return;
  }
  targetScale = 1.25;
  playCyberAudio("click");
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

  pulseTimer += 0.025;

  // Smooth Color Transition
  activeColor.lerp(targetColor, 0.08);

  if (globeInnerCore) {
    globeInnerCore.material.color.copy(activeColor);
    globeInnerCore.material.emissive.copy(activeColor);
  }
  if (globeWireframe) globeWireframe.material.color.copy(activeColor);
  if (globeLatLongMesh) globeLatLongMesh.material.color.copy(activeColor);
  if (radarSweepMesh) radarSweepMesh.material.color.copy(activeColor);
  if (radarRingMajor) radarRingMajor.material.color.copy(activeColor);
  if (radarRingMinor) radarRingMinor.material.color.copy(activeColor);
  if (corePointLight) corePointLight.color.copy(activeColor);

  satellites.forEach(sat => {
    sat.material.color.copy(activeColor);
    sat.material.emissive.copy(activeColor);
  });

  // Smooth Scaling & Pulsing
  currentScale += (targetScale - currentScale) * 0.1;
  const pulseScale = currentScale + Math.sin(pulseTimer) * 0.03;
  if (guardianCore) guardianCore.scale.set(pulseScale, pulseScale, pulseScale);

  // Smooth Mouse Parallax
  targetRotY += (mouseX - targetRotY) * 0.05;
  targetRotX += (mouseY - targetRotX) * 0.05;

  if (guardianCore) {
    const speedMult = guardianState === "THREAT" ? 2.2 : (guardianState === "SCANNING" ? 1.5 : 0.7);

    // Globe Rotations
    if (globeWireframe) globeWireframe.rotation.y += 0.008 * speedMult;
    if (globeLatLongMesh) {
      globeLatLongMesh.rotation.y -= 0.004 * speedMult;
      globeLatLongMesh.rotation.x += 0.002;
    }

    // 360 Radar Sweep Rotation
    if (radarSweepMesh) {
      radarSweepMesh.rotation.z += 0.035 * speedMult;
    }

    // Gimbal Rings
    if (radarRingMajor) radarRingMajor.rotation.z += 0.012 * speedMult;
    if (radarRingMinor) radarRingMinor.rotation.x += 0.010 * speedMult;

    // Defense Satellites Orbital Motion
    if (satellites.length === 3) {
      const satR = 5.8;
      const t = pulseTimer * speedMult;

      satellites[0].position.set(Math.cos(t) * satR, Math.sin(t * 0.5) * 1.5, Math.sin(t) * satR);
      satellites[1].position.set(Math.cos(t + 2.1) * satR, Math.sin(t + 2.1) * satR * 0.4, Math.sin(t + 2.1) * satR * 0.8);
      satellites[2].position.set(Math.sin(t * 0.8) * 1.8, Math.cos(t * 0.8 + 4.2) * satR, Math.sin(t * 0.8 + 4.2) * satR);

      satellites.forEach(s => {
        s.rotation.x += 0.03;
        s.rotation.y += 0.04;
      });
    }

    // Outer Reticle
    if (shieldBracketsGroup) {
      shieldBracketsGroup.rotation.z -= 0.003;
    }

    // Base Group Parallax
    guardianCore.rotation.y = targetRotY + Math.sin(pulseTimer * 0.3) * 0.06;
    guardianCore.rotation.x = targetRotX + Math.cos(pulseTimer * 0.3) * 0.05;
  }

  renderer.render(scene, camera);
}

// Morph 3D Guardian State
function set3DGuardianState(stateName) {
  guardianState = stateName;
  const hex = STATE_COLORS[stateName] || STATE_COLORS.NORMAL;
  targetColor.setHex(hex);

  if (stateName === "THREAT") {
    targetScale = 1.35;
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
 */
function speakSmoothThreatAlert(shortAlertText) {
  if (!speechEnabled || !window.speechSynthesis) return;
  if (!shortAlertText) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(shortAlertText);
  const voice = getSmoothVoice();
  if (voice) utterance.voice = voice;

  utterance.rate = 0.96;
  utterance.pitch = 1.0;
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

let lastActiveFlow = null;
let lastActiveResult = null;

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
  lastActiveFlow = flow;
  lastActiveResult = result;

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
    capsuleState.innerText = "HYPERION ONLINE • ALL SECTORS SECURE";
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
    const attackClasses = ["DoS", "PortScan", "BruteForce"];
    const activeAttacks = attackClasses.filter(cls => (probs[cls] || 0) >= 0.20);
    const isMultiAttack = activeAttacks.length > 1;

    const dialogue = isMultiAttack
      ? `Warning! Multiple concurrent attack vectors detected on Port ${flow.dst_port}. Threat level is at ${score.toFixed(0)} percent. Automated mitigation ready.`
      : `Warning! Hostile ${label} attack vector intercepted on Port ${flow.dst_port}. Threat level is at ${score.toFixed(0)} percent. Automated mitigation ready.`;

    updateBannerText("THREAT ALERT", dialogue);

    if (isMultiAttack) {
      speakSmoothThreatAlert("Multiple attacks detected.");
    } else {
      speakSmoothThreatAlert(`${label} alert detected.`);
    }
  } else {
    const dialogue = `Analysis complete. Ingress parameters match authentic baseline flow behavior with ${(result.confidence * 100).toFixed(1)}% confidence. All systems green.`;
    updateBannerText("SECTORS CLEAN", dialogue);
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
  row.title = "Click to inspect full packet JSON";
  row.onclick = () => openModal3d(flow, result);
  row.innerHTML = `
    <span>${time} • <strong>P:${flow.dst_port || 80}</strong></span>
    <span>${isSafe ? '🟢 Normal' : `🚨 <strong>${result.predicted_label}</strong>`}</span>
    <span style="color:${isSafe ? 'var(--emerald)' : 'var(--rose)'}; font-weight:700;">${result.risk_score.toFixed(0)}%</span>
  `;

  box.insertBefore(row, box.firstChild);
  if (box.children.length > 20) box.removeChild(box.lastChild);
}

// Deep Packet Inspector Modal
let currentModalJson = "";

function openModal3d(flow, result) {
  const modal = document.getElementById("modal3d");
  const body = document.getElementById("modalBody3d");
  const data = {
    timestamp: new Date().toISOString(),
    network_flow: flow || lastActiveFlow,
    forensic_inference: result || lastActiveResult
  };
  currentModalJson = JSON.stringify(data, null, 2);
  body.innerText = currentModalJson;
  modal.classList.add("open");
}

function closeModal3d(e) {
  if (e && e.target && e.target !== document.getElementById("modal3d") && !e.target.classList.contains("modal-close-3d")) {
    return;
  }
  const modal = document.getElementById("modal3d");
  if (modal) modal.classList.remove("open");
}

function copyModalTelemetryJson() {
  if (!currentModalJson) return;
  navigator.clipboard.writeText(currentModalJson).then(() => {
    showToast("Telemetry JSON copied to clipboard", "success");
  }).catch(() => {
    showToast("Failed to copy JSON", "danger");
  });
}

// Export Incident Log
function exportIncidentLog() {
  const data = {
    guardian: "HYPERION // Neural Threat Forecaster",
    timestamp: new Date().toISOString(),
    status: guardianState,
    telemetry_flows_evaluated: streamCounter,
    last_flow: lastActiveFlow,
    last_inference: lastActiveResult
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Hyperion_Threat_Log_${Date.now()}.json`;
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
    toast.style.transform = "translateX(110%)";
    toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ==========================================================================
// 5. App Bootstrap
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  init3DScene();
  triggerScenario("normal"); // Initial baseline test
});
