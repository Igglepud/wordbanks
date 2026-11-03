// Shuffle array function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Initialize variables
const wordListDiv = document.getElementById('wordList');
const toggleBtn = document.getElementById('toggleBtn');
const endTestBtn = document.getElementById('endTestBtn');
const timerDisplay = document.getElementById('timer');
const cheatingOverlay = document.getElementById('cheatingOverlay');
const confirmModal = document.getElementById('confirmModal');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// Create Web Audio API siren sound
let audioContext = null;
let sirenOscillator = null;
let sirenGain = null;
let sirenLFO = null;
let sirenRunning = false;

function startSirenSound() {
    if (sirenRunning) return;
    sirenRunning = true;
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for main siren tone
    sirenOscillator = audioContext.createOscillator();
    sirenOscillator.type = 'sine';
    
    // Create LFO (Low Frequency Oscillator) to modulate the frequency
    sirenLFO = audioContext.createOscillator();
    sirenLFO.type = 'sine';
    sirenLFO.frequency.value = 2; // 2 Hz = up and down twice per second
    
    // Create gain node for LFO to control modulation depth
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 300; // Frequency modulation depth (Hz)
    
    // Create main gain for volume control
    sirenGain = audioContext.createGain();
    sirenGain.gain.value = 0.4;
    
    // Connect LFO to modulate oscillator frequency
    sirenLFO.connect(lfoGain);
    lfoGain.connect(sirenOscillator.frequency);
    
    // Set base frequency (will oscillate around this)
    sirenOscillator.frequency.value = 600;
    
    // Connect oscillator through gain to speakers
    sirenOscillator.connect(sirenGain);
    sirenGain.connect(audioContext.destination);
    
    // Start both oscillators
    sirenOscillator.start();
    sirenLFO.start();
}

function stopSirenSound() {
    if (!sirenRunning) return;
    sirenRunning = false;
    
    if (sirenOscillator) {
        sirenOscillator.stop();
        sirenOscillator = null;
    }
    if (sirenLFO) {
        sirenLFO.stop();
        sirenLFO = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

// Cheating detection variables
let isCheating = false;
let devtoolsOpen = false;

// Check for reset parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const TIMER_KEY = 'timerEndTime_lafamilia';
const TIMER_ACTIVE_KEY = 'timerActive_lafamilia';
const CHEATING_KEY = 'cheatingDetected_lafamilia';
const TEST_ENDED_KEY = 'testEnded_lafamilia';

if (urlParams.get('reset') === 'true') {
    localStorage.clear();
    window.location.href = window.location.pathname; // Reload without the parameter
    throw new Error('Reset complete'); // Stop execution
}

let isRevealed = false;
let timerInterval = null;
let isLocked = false;
let isShowingConfirmation = false;

// Check if test was ended in previous session
if (localStorage.getItem(TEST_ENDED_KEY) === 'true') {
    // Show test ended state immediately
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Test Ended';
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
    timerDisplay.textContent = '0:00';
    timerDisplay.parentElement.style.display = 'none';
    throw new Error('Test already ended'); // Stop execution
}

// Check if cheating was detected in previous session
if (localStorage.getItem(CHEATING_KEY) === 'true') {
    isCheating = true;
    // Trigger alarm immediately on page load
    setTimeout(() => {
        cheatingOverlay.classList.remove('hidden');
        cheatingOverlay.textContent = '⚠️ CHEATING DETECTED ⚠️';
        startSirenSound();
        document.body.style.pointerEvents = 'none';
    }, 100);
}

// Trigger cheating alarm
function triggerCheatingAlarm() {
    if (isCheating) return; // Already triggered
    isCheating = true;
    
    // Store in localStorage so it persists across refreshes
    allowLocalStorageChange = true;
    localStorage.setItem(CHEATING_KEY, 'true');
    allowLocalStorageChange = false;
    
    // Show red flashing overlay
    cheatingOverlay.classList.remove('hidden');
    cheatingOverlay.textContent = '⚠️ CHEATING DETECTED ⚠️';
    
    // Play siren sound
    startSirenSound();
    
    // Make it permanent - can't be dismissed
    document.body.style.pointerEvents = 'none';
}

// Detect devtools opening
function detectDevTools() {
    // More sophisticated detection using debugger statement timing
    const start = performance.now();
    debugger; // This will pause if devtools are open
    const end = performance.now();
    
    // If debugger statement took more than 100ms, devtools are likely open
    if (end - start > 100) {
        if (!devtoolsOpen && isLocked) {
            devtoolsOpen = true;
            handleViolation('devtools_open');
            triggerCheatingAlarm();
        }
    } else {
        devtoolsOpen = false;
    }
}

// Flag to allow legitimate localStorage operations by the app
let allowLocalStorageChange = false;

// Monitor localStorage tampering
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;
const originalClear = localStorage.clear;

localStorage.setItem = function(key, value) {
    if (isLocked && !allowLocalStorageChange && (key === TIMER_KEY || key === TIMER_ACTIVE_KEY)) {
        triggerCheatingAlarm();
        handleViolation('localStorage_tampering');
    }
    return originalSetItem.apply(this, arguments);
};

localStorage.removeItem = function(key) {
    if (isLocked && !allowLocalStorageChange && (key === TIMER_KEY || key === TIMER_ACTIVE_KEY)) {
        triggerCheatingAlarm();
        handleViolation('localStorage_tampering');
    }
    return originalRemoveItem.apply(this, arguments);
};

localStorage.clear = function() {
    if (isLocked && !allowLocalStorageChange) {
        triggerCheatingAlarm();
        handleViolation('localStorage_clear');
    }
    return originalClear.apply(this, arguments);
};

// Devtools detection disabled - too many false positives
// Only rely on keyboard shortcuts and explicit violations

// Use shared timer across all tabs
function getSharedTimerState() {
    const endTime = localStorage.getItem(TIMER_KEY);
    const isActive = localStorage.getItem(TIMER_ACTIVE_KEY) === 'true';
    
    if (endTime && isActive) {
        const remaining = Math.max(0, Math.floor((parseInt(endTime) - Date.now()) / 1000));
        return { remaining, active: true };
    }
    return { remaining: 120, active: false };
}

const timerState = getSharedTimerState();
let remainingTime = timerState.remaining;
let wasTimerActive = timerState.active;

// If cheating was detected, end the timer and trigger alarm
if (localStorage.getItem(CHEATING_KEY) === 'true') {
    allowLocalStorageChange = true;
    localStorage.setItem(TIMER_ACTIVE_KEY, 'false');
    allowLocalStorageChange = false;
    remainingTime = 0;
    wasTimerActive = false;
}

// If timer was active, this is a refresh during session - end it and trigger alarm
if (wasTimerActive && remainingTime > 0) {
    triggerCheatingAlarm();
    allowLocalStorageChange = true;
    localStorage.setItem(TIMER_ACTIVE_KEY, 'false');
    allowLocalStorageChange = false;
    remainingTime = 0;
    wasTimerActive = false;
}

// Randomize and display words
const shuffledWords = shuffleArray(words);
shuffledWords.forEach(word => {
    const wordElement = document.createElement('div');
    wordElement.className = 'word-item';
    wordElement.textContent = word;
    
    // Add click event to toggle strikethrough
    wordElement.addEventListener('click', () => {
        wordElement.classList.toggle('strikethrough');
    });
    
    wordListDiv.appendChild(wordElement);
});

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Start timer
function startTimer() {
    if (timerInterval) return; // Already running
    
    // Set shared end time across all tabs
    allowLocalStorageChange = true;
    const endTime = Date.now() + (remainingTime * 1000);
    localStorage.setItem(TIMER_KEY, endTime.toString());
    localStorage.setItem(TIMER_ACTIVE_KEY, 'true');
    allowLocalStorageChange = false;
    
    timerInterval = setInterval(() => {
        const state = getSharedTimerState();
        remainingTime = state.remaining;
        
        if (remainingTime > 0) {
            updateTimerDisplay();
        } else {
            handleTimeUp();
        }
    }, 1000);
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Handle time up
function handleTimeUp() {
    stopTimer();
    allowLocalStorageChange = true;
    localStorage.setItem(TIMER_ACTIVE_KEY, 'false');
    allowLocalStorageChange = false;
    wordListDiv.classList.add('hidden');
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Time Up';
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
    timerDisplay.parentElement.style.display = 'none';
    isRevealed = false;
    exitLockMode();
}

// Lock mode functions
function enterLockMode() {
    isLocked = true;
    document.body.classList.add('locked');
    
    // Request fullscreen
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('Fullscreen request failed:', err);
        });
    }
}

function exitLockMode() {
    isLocked = false;
    document.body.classList.remove('locked');
    
    // Exit fullscreen if still in it
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
            console.log('Exit fullscreen failed:', err);
        });
    }
}

// Violation handler - strict mode ends session
function handleViolation(reason) {
    if (!isLocked || isShowingConfirmation) return;
    console.log('Lock violation:', reason);
    triggerCheatingAlarm();
    handleTimeUp();
}

// Detect tab switching
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isLocked && !isShowingConfirmation) {
        handleViolation('tab_switch');
    }
});

// Detect fullscreen exit
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isLocked && !isShowingConfirmation) {
        handleViolation('fullscreen_exit');
    }
});

// Block right-click
document.addEventListener('contextmenu', (e) => {
    if (isLocked) {
        e.preventDefault();
    }
});

// Block keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!isLocked) return;
    
    // Block devtools shortcuts
    if (
        e.key === 'F12' || // DevTools
        (e.ctrlKey && e.shiftKey && e.key === 'I') || // DevTools
        (e.ctrlKey && e.shiftKey && e.key === 'J') || // Console
        (e.ctrlKey && e.shiftKey && e.key === 'C') || // Inspect
        (e.ctrlKey && e.key === 'U') // View source
    ) {
        e.preventDefault();
        triggerCheatingAlarm();
        handleViolation('devtools_shortcut');
        return;
    }
    
    // Block common tab/window shortcuts
    if (
        e.key === 'F11' || // Fullscreen toggle
        (e.ctrlKey && e.key === 't') || // New tab
        (e.ctrlKey && e.key === 'w') || // Close tab
        (e.ctrlKey && e.key === 'n') || // New window
        (e.ctrlKey && e.shiftKey && e.key === 'n') || // New incognito
        (e.altKey && e.key === 'Tab') || // Alt-Tab
        (e.altKey && e.key === 'F4') || // Close window
        e.key === 'Escape' // Escape key
    ) {
        e.preventDefault();
        handleViolation('keyboard_shortcut');
    }
});

// End test function - safe exit
function endTest() {
    // Don't exit lock mode - stay in fullscreen
    isLocked = false; // Disable security checks but stay fullscreen
    
    // Stop timer
    stopTimer();
    
    // Ensure words stay hidden
    wordListDiv.classList.add('hidden');
    
    // Clear timer state safely and mark test as ended
    allowLocalStorageChange = true;
    localStorage.setItem(TIMER_ACTIVE_KEY, 'false');
    localStorage.removeItem(TIMER_KEY);
    localStorage.setItem(TEST_ENDED_KEY, 'true');
    allowLocalStorageChange = false;
    
    // Set timer to 0
    remainingTime = 0;
    updateTimerDisplay();
    
    // Update UI - disable both buttons
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Test Ended';
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
    endTestBtn.classList.add('hidden');
    timerDisplay.parentElement.style.display = 'none';
    isRevealed = false;
}

// End test button
endTestBtn.addEventListener('click', () => {
    isShowingConfirmation = true;
    // Run the same logic as Hide button
    wordListDiv.classList.add('hidden');
    toggleBtn.textContent = 'Reveal';
    endTestBtn.classList.add('hidden');
    timerDisplay.parentElement.style.display = 'none';
    stopTimer();
    isRevealed = false;
    
    confirmModal.classList.remove('hidden');
});

confirmYes.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    isShowingConfirmation = false;
    endTest();
});

confirmNo.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    // Don't show words again - let them click Reveal if they want
    setTimeout(() => {
        isShowingConfirmation = false;
    }, 100);
});

// Toggle reveal/hide
toggleBtn.addEventListener('click', () => {
    isRevealed = !isRevealed;
    
    if (isRevealed) {
        wordListDiv.classList.remove('hidden');
        toggleBtn.textContent = 'Hide';
        endTestBtn.classList.remove('hidden');
        timerDisplay.parentElement.style.display = 'block';
        enterLockMode();
        startTimer();
    } else {
        wordListDiv.classList.add('hidden');
        toggleBtn.textContent = 'Reveal';
        endTestBtn.classList.add('hidden');
        timerDisplay.parentElement.style.display = 'none';
        stopTimer();
    }
});

// Initialize timer display
if (remainingTime > 0) {
    updateTimerDisplay();
    timerDisplay.parentElement.style.display = 'none';
    
    // If timer was active in another tab, sync this tab
    if (wasTimerActive) {
        wordListDiv.classList.remove('hidden');
        toggleBtn.textContent = 'Hide';
        timerDisplay.parentElement.style.display = 'block';
        isRevealed = true;
        enterLockMode();
        startTimer();
    }
} else {
    handleTimeUp();
}

// Sync timer across tabs
window.addEventListener('storage', (e) => {
    if (e.key === TIMER_ACTIVE_KEY || e.key === TIMER_KEY) {
        const state = getSharedTimerState();
        remainingTime = state.remaining;
        
        if (state.active && !timerInterval) {
            // Timer started in another tab
            wordListDiv.classList.remove('hidden');
            toggleBtn.textContent = 'Hide';
            timerDisplay.parentElement.style.display = 'block';
            isRevealed = true;
            enterLockMode();
            startTimer();
        } else if (!state.active && timerInterval) {
            // Timer stopped in another tab
            handleTimeUp();
        }
    }
});

// Stop timer when page is closed/refreshed
window.addEventListener('beforeunload', (e) => {
    if (isLocked) {
        // Prevent refresh/close during lock mode
        e.preventDefault();
        e.returnValue = '';
        handleViolation('refresh_attempt');
        return '';
    }
    stopTimer();
});
