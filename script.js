const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const psTableBody = document.getElementById('psTableBody');
const memberCountEl = document.getElementById('memberCount');
const spinHistoryEl = document.getElementById('spinHistory');
const winOverlay = document.getElementById('winOverlay');
const winTitle = document.getElementById('winTitle');
const winMessage = document.getElementById('winMessage');
const closeOverlayBtn = document.getElementById('closeOverlay');

const resetBtn = document.getElementById('resetBtn');

let PS_OPTIONS = [
    { label: 'PS 1', color: '#f87171', count: 0 },
    { label: 'PS 2', color: '#fbbf24', count: 0 },
    { label: 'PS 3', color: '#34d399', count: 0 },
    { label: 'PS 4', color: '#60a5fa', count: 0 },
    { label: 'PS 5', color: '#a78bfa', count: 0 }
];

const MAX_PER_PS = 6;
const TOTAL_MEMBERS = 28;
let currentMembers = 0;
let isSpinning = false;
let rotation = 0;
let history = [];

// Persistence Logic
function saveState() {
    const state = {
        options: PS_OPTIONS,
        currentMembers,
        history
    };
    localStorage.setItem('wheelState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('wheelState');
    if (saved) {
        const state = JSON.parse(saved);
        PS_OPTIONS = state.options;
        currentMembers = state.currentMembers;
        history = state.history;
        return true;
    }
    return false;
}

// Initialize Stats
function updateStats() {
    psTableBody.innerHTML = '';
    PS_OPTIONS.forEach(ps => {
        const isFull = ps.count >= MAX_PER_PS;
        const row = document.createElement('tr');
        row.className = `stats-row ${isFull ? 'full' : ''}`;
        row.style.setProperty('--ps-color', ps.color);

        row.innerHTML = `
            <td>
                <div class="ps-name-cell">
                    <span class="ps-color-dot"></span>
                    ${ps.label}
                </div>
            </td>
            <td class="ps-count-cell">${ps.count} / ${MAX_PER_PS}</td>
            <td>
                <span class="status-badge ${isFull ? 'status-full' : 'status-available'}">
                    ${isFull ? 'Full' : 'Available'}
                </span>
            </td>
        `;
        psTableBody.appendChild(row);
    });
    memberCountEl.textContent = currentMembers;

    if (currentMembers >= TOTAL_MEMBERS) {
        spinBtn.disabled = true;
        spinBtn.textContent = "FINISHED";
    }
}

// Draw the Wheel
function drawWheel() {
    const availablePS = PS_OPTIONS.filter(ps => ps.count < MAX_PER_PS);
    const numSegments = availablePS.length;
    const segmentAngle = (2 * Math.PI) / numSegments;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    availablePS.forEach((ps, i) => {
        const startAngle = i * segmentAngle + rotation;
        const endAngle = startAngle + segmentAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.fillStyle = ps.color;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Outfit';
        ctx.fillText(ps.label, radius - 30, 10);
        ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
}

function spin() {
    if (isSpinning || currentMembers >= TOTAL_MEMBERS) return;

    const availablePS = PS_OPTIONS.filter(ps => ps.count < MAX_PER_PS);
    if (availablePS.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;

    // 1. Pick winner BEFORE spinning to guarantee randomness
    const winnerIndex = Math.floor(Math.random() * availablePS.length);
    const winner = availablePS[winnerIndex];

    // 2. Calculate target rotation
    const numSegments = availablePS.length;
    const segmentAngle = (2 * Math.PI) / numSegments;

    // Position of winner segment on the wheel starts at winnerIndex * segmentAngle
    // We want this segment to stop at the pointer (top, which is 1.5 * PI)
    // Formula: (segment_center_angle + rotation) % 2PI = 1.5 * PI
    const randomWithinSegment = (0.2 + Math.random() * 0.6) * segmentAngle;
    const angleToTarget = (winnerIndex * segmentAngle) + randomWithinSegment;

    let targetRotationOffset = (1.5 * Math.PI - angleToTarget) % (2 * Math.PI);
    if (targetRotationOffset < 0) targetRotationOffset += 2 * Math.PI;

    const spinDuration = 4000; // Slightly longer for better feel
    const startRotation = rotation;
    const extraFullSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    const targetRotation = startRotation + extraFullSpins + targetRotationOffset;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);

        // Easing out curve
        const easeOut = 1 - Math.pow(1 - progress, 5); // Smoother ease out
        rotation = startRotation + (targetRotation - startRotation) * easeOut;

        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            finalizeSpin(winner);
        }
    }

    requestAnimationFrame(animate);
}

function finalizeSpin(winner) {
    isSpinning = false;

    winner.count++;
    currentMembers++;

    // Add to history
    history.unshift({ ps: winner.label, color: winner.color, time: new Date().toLocaleTimeString() });
    updateHistory();
    updateStats();
    drawWheel();
    saveState(); // Persist state

    // Show result
    winMessage.innerHTML = `You have been assigned<br><span class="win-ps-badge" style="background-color: ${winner.color}">${winner.label}</span>`;
    winOverlay.classList.remove('hidden');
}

function updateHistory() {
    spinHistoryEl.innerHTML = history.slice(0, 10).map(item => `
        <li class="history-item">
            <span>Member #${currentMembers - history.indexOf(item)}</span>
            <span class="history-badge" style="background-color: ${item.color}">${item.ps}</span>
        </li>
    `).join('');
}

spinBtn.addEventListener('click', spin);
closeOverlayBtn.addEventListener('click', () => {
    winOverlay.classList.add('hidden');
    if (currentMembers < TOTAL_MEMBERS) {
        spinBtn.disabled = false;
    }
});

resetBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
        localStorage.removeItem('wheelState');
        location.reload();
    }
});

// Helper for verification
window.testLogic = function (iterations = 28) {
    console.log(`Starting test for ${iterations} spins...`);
    for (let i = 0; i < iterations; i++) {
        const availablePS = PS_OPTIONS.filter(ps => ps.count < MAX_PER_PS);
        if (availablePS.length === 0) {
            console.log("No more PS available!");
            break;
        }
        const winnerIndex = Math.floor(Math.random() * availablePS.length);
        const winner = availablePS[winnerIndex];
        winner.count++;
        currentMembers++;
        console.log(`Spin ${i + 1}: Assigned ${winner.label}. Total for ${winner.label}: ${winner.count}`);
    }
    updateStats();
    drawWheel();
    console.log("Test complete. Final Stats:", PS_OPTIONS.map(p => `${p.label}: ${p.count}`).join(', '));
};

// Initial Setup
loadState();
updateStats();
drawWheel();
updateHistory();
