const R = 8.314462618; // J·mol⁻¹·K⁻¹
const K_B = 1.380649e-23; // J·K⁻¹
const N_A = 6.02214076e23; // mol⁻¹

const gasData = {
  He: { label: "Helium", molarMassKgPerMol: 0.0040026, color: "#9c27b0" },
  N2: { label: "Nitrogen", molarMassKgPerMol: 0.0280134, color: "#2667ff" },
  O2: { label: "Oxygen", molarMassKgPerMol: 0.031998, color: "#ef6c00" },
  CO2: { label: "Carbon dioxide", molarMassKgPerMol: 0.0440095, color: "#009688" },
};

const nSlider = document.getElementById("nSlider");
const vSlider = document.getElementById("vSlider");
const tSlider = document.getElementById("tSlider");
const gasSelect = document.getElementById("gasSelect");

const nValue = document.getElementById("nValue");
const vValue = document.getElementById("vValue");
const tValue = document.getElementById("tValue");
const pressureValue = document.getElementById("pressureValue");
const meanSpeedValue = document.getElementById("meanSpeedValue");
const vpValue = document.getElementById("vpValue");
const vrmsValue = document.getElementById("vrmsValue");

const particleCanvas = document.getElementById("particleCanvas");
const particleCtx = particleCanvas.getContext("2d");
const distributionCanvas = document.getElementById("distributionCanvas");
const distributionCtx = distributionCanvas.getContext("2d");

const particles = Array.from({ length: 42 }, () => {
  const theta = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * particleCanvas.width,
    y: Math.random() * particleCanvas.height,
    vx: Math.cos(theta),
    vy: Math.sin(theta),
    r: 3 + Math.random() * 2,
  };
});

function maxwellBoltzmannSpeedPDF(v, mParticle, temperature) {
  const factor = 4 * Math.PI * Math.pow(mParticle / (2 * Math.PI * K_B * temperature), 1.5);
  return factor * v * v * Math.exp((-mParticle * v * v) / (2 * K_B * temperature));
}

let currentMeanSpeed = 500;
let currentColor = "#2667ff";

function updateSimulation() {
  const n = Number(nSlider.value);
  const volumeL = Number(vSlider.value);
  const T = Number(tSlider.value);
  const gas = gasData[gasSelect.value];

  const volumeM3 = volumeL / 1000;
  const pressurePa = (n * R * T) / volumeM3;
  const pressureAtm = pressurePa / 101325;

  const M = gas.molarMassKgPerMol;
  const meanSpeed = Math.sqrt((8 * R * T) / (Math.PI * M));
  const vp = Math.sqrt((2 * R * T) / M);
  const vrms = Math.sqrt((3 * R * T) / M);

  nValue.textContent = n.toFixed(1);
  vValue.textContent = `${volumeL.toFixed(1)} L`;
  tValue.textContent = `${T.toFixed(0)} K`;
  pressureValue.textContent = `${pressureAtm.toFixed(2)} atm (${(pressurePa / 1000).toFixed(1)} kPa)`;
  meanSpeedValue.textContent = `${meanSpeed.toFixed(0)} m/s`;
  vpValue.textContent = `${vp.toFixed(0)} m/s`;
  vrmsValue.textContent = `${vrms.toFixed(0)} m/s`;

  currentMeanSpeed = meanSpeed;
  currentColor = gas.color;
  drawDistribution(T, M, gas.color, vp, vrms);
}

function drawDistribution(T, molarMass, color, vp, vrms) {
  const ctx = distributionCtx;
  const w = distributionCanvas.width;
  const h = distributionCanvas.height;
  const padding = 38;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, w, h);

  const mParticle = molarMass / N_A;
  const vmax = Math.max(1800, vrms * 2.2);
  const samples = 240;

  const curve = [];
  let yMax = 0;
  for (let i = 0; i <= samples; i += 1) {
    const v = (i / samples) * vmax;
    const y = maxwellBoltzmannSpeedPDF(v, mParticle, T);
    curve.push({ v, y });
    yMax = Math.max(yMax, y);
  }

  ctx.strokeStyle = "#8ea6cc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(padding, padding);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  curve.forEach((point, index) => {
    const x = padding + (point.v / vmax) * (w - 2 * padding);
    const y = h - padding - (point.y / yMax) * (h - 2 * padding);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  drawVerticalMarker(vp, vmax, "vₚ", "#e53935");
  drawVerticalMarker(vrms, vmax, "vᵣₘₛ", "#5e35b1");

  ctx.fillStyle = "#1c2f4d";
  ctx.font = "13px sans-serif";
  ctx.fillText("Speed (m/s)", w / 2 - 30, h - 8);
  ctx.save();
  ctx.translate(14, h / 2 + 22);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Relative probability density", 0, 0);
  ctx.restore();

  function drawVerticalMarker(v, localVMax, label, markerColor) {
    const x = padding + (v / localVMax) * (w - 2 * padding);
    ctx.strokeStyle = markerColor;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(x, h - padding);
    ctx.lineTo(x, padding + 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = markerColor;
    ctx.fillText(label, x + 4, padding + 15);
  }
}

let lastFrame = performance.now();
function animateParticles() {
  const scale = Math.max(0.4, Math.min(currentMeanSpeed / 450, 3.2));

  const now = performance.now();
  const dt = Math.min(40, now - lastFrame) / 16.6;
  lastFrame = now;

  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particleCtx.fillStyle = "#fbfdff";
  particleCtx.fillRect(0, 0, particleCanvas.width, particleCanvas.height);

  particleCtx.strokeStyle = "#dce6f9";
  particleCtx.strokeRect(0.5, 0.5, particleCanvas.width - 1, particleCanvas.height - 1);

  particleCtx.fillStyle = currentColor;
  particles.forEach((p) => {
    p.x += p.vx * scale * dt;
    p.y += p.vy * scale * dt;

    if (p.x < p.r || p.x > particleCanvas.width - p.r) p.vx *= -1;
    if (p.y < p.r || p.y > particleCanvas.height - p.r) p.vy *= -1;

    p.x = Math.min(Math.max(p.r, p.x), particleCanvas.width - p.r);
    p.y = Math.min(Math.max(p.r, p.y), particleCanvas.height - p.r);

    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particleCtx.fill();
  });

  requestAnimationFrame(animateParticles);
}

[nSlider, vSlider, tSlider, gasSelect].forEach((el) => {
  el.addEventListener("input", updateSimulation);
});

updateSimulation();
animateParticles();
