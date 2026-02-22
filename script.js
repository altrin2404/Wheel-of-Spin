const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const psTableBody = document.getElementById('psTableBody');
const memberCountEl = document.getElementById('memberCount');
const maxParticipantsEl = document.getElementById('maxParticipants');
const spinHistoryEl = document.getElementById('spinHistory');
const winOverlay = document.getElementById('winOverlay');
const winTitle = document.getElementById('winTitle');
const winMessage = document.getElementById('winMessage');
const closeOverlayBtn = document.getElementById('closeOverlay');
const resetBtn = document.getElementById('resetBtn');

const yearSelectOverlay = document.getElementById('yearSelectOverlay');
const selectYear3Btn = document.getElementById('selectYear3Btn');
const selectYear4Btn = document.getElementById('selectYear4Btn');
const showYear3Btn = document.getElementById('showYear3Btn');
const showYear4Btn = document.getElementById('showYear4Btn');
const mainTitle = document.getElementById('mainTitle');

let currentYear = '3rd'; // Default
const CONFIG = {
    '3rd': { total: 14, title: 'Wheel of Spin - 3rd Year' },
    '4th': { total: 12, title: 'Wheel of Spin - 4th Year' }
};

const MAX_PER_PS = 3;

let PS_OPTIONS = [
    { label: 'PS 1', color: '#f87171', count: 0 },
    { label: 'PS 2', color: '#fbbf24', count: 0 },
    { label: 'PS 3', color: '#34d399', count: 0 },
    { label: 'PS 4', color: '#60a5fa', count: 0 },
    { label: 'PS 5', color: '#a78bfa', count: 0 }
];

let currentMembers = 0;
let isSpinning = false;
let rotation = 0;
let history = [];

// Persistence Logic
function getStorageKey() {
    return `wheelState_${currentYear}`;
}

function saveState() {
    const state = {
        options: PS_OPTIONS,
        currentMembers,
        history
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
        const state = JSON.parse(saved);
        PS_OPTIONS = state.options;
        currentMembers = state.currentMembers;
        history = state.history;
    } else {
        // Reset to defaults for this year
        PS_OPTIONS.forEach(opt => opt.count = 0);
        currentMembers = 0;
        history = [];
    }
}

function switchYear(year) {
    currentYear = year;

    // Update UI Tabs
    showYear3Btn.classList.toggle('active', year === '3rd');
    showYear4Btn.classList.toggle('active', year === '4th');

    // Update Titles and Limits
    mainTitle.textContent = CONFIG[year].title;
    maxParticipantsEl.textContent = CONFIG[year].total;

    // Load Data
    loadState();

    // Refresh View
    rotation = 0;
    updateStats();
    drawWheel();
    updateHistory();

    // Check if finished
    checkCompletion();
}

function checkCompletion() {
    const totalLimit = CONFIG[currentYear].total;
    if (currentMembers >= totalLimit) {
        spinBtn.disabled = true;
        spinBtn.textContent = "FINISHED";
    } else {
        spinBtn.disabled = false;
        spinBtn.textContent = "SPIN";
    }
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
    checkCompletion();
}

// Draw the Wheel
function drawWheel() {
    const availablePS = PS_OPTIONS.filter(ps => ps.count < MAX_PER_PS);
    const numSegments = availablePS.length;

    if (numSegments === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

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
    const totalLimit = CONFIG[currentYear].total;
    if (isSpinning || currentMembers >= totalLimit) return;

    const availablePS = PS_OPTIONS.filter(ps => ps.count < MAX_PER_PS);
    if (availablePS.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;

    const winnerIndex = Math.floor(Math.random() * availablePS.length);
    const winner = availablePS[winnerIndex];

    const numSegments = availablePS.length;
    const segmentAngle = (2 * Math.PI) / numSegments;
    const randomWithinSegment = (0.2 + Math.random() * 0.6) * segmentAngle;
    const angleToTarget = (winnerIndex * segmentAngle) + randomWithinSegment;

    let targetRotationOffset = (1.5 * Math.PI - angleToTarget) % (2 * Math.PI);
    if (targetRotationOffset < 0) targetRotationOffset += 2 * Math.PI;

    const spinDuration = 4000;
    const startRotation = rotation;
    const extraFullSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    const targetRotation = startRotation + extraFullSpins + targetRotationOffset;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 5);
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

    history.unshift({ ps: winner.label, color: winner.color, time: new Date().toLocaleTimeString() });
    updateHistory();
    updateStats();
    drawWheel();
    saveState();

    winMessage.innerHTML = `You have been assigned<br><span class="win-ps-badge" style="background-color: ${winner.color}">${winner.label}</span>`;
    winOverlay.classList.remove('hidden');
}

function updateHistory() {
    spinHistoryEl.innerHTML = history.slice(0, 10).map((item, idx) => `
        <li class="history-item">
            <span>Entry #${history.length - idx}</span>
            <span class="history-badge" style="background-color: ${item.color}">${item.ps}</span>
        </li>
    `).join('');
}

// Event Listeners
spinBtn.addEventListener('click', spin);
closeOverlayBtn.addEventListener('click', () => {
    winOverlay.classList.add('hidden');
    checkCompletion();
});

resetBtn.addEventListener('click', () => {
    if (confirm(`Are you sure you want to reset all data for ${currentYear} Year?`)) {
        localStorage.removeItem(getStorageKey());
        location.reload();
    }
});

// Year selection logic
selectYear3Btn.addEventListener('click', () => {
    yearSelectOverlay.classList.add('hidden');
    switchYear('3rd');
});

selectYear4Btn.addEventListener('click', () => {
    yearSelectOverlay.classList.add('hidden');
    switchYear('4th');
});

showYear3Btn.addEventListener('click', () => switchYear('3rd'));
showYear4Btn.addEventListener('click', () => switchYear('4th'));

// Initial state
// Check if a year was already active in this session (optional, but starts with overlay)
window.onload = () => {
    // Show overlay always on fresh load for clean selection
    yearSelectOverlay.classList.remove('hidden');
};
