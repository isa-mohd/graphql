import { signinWithBasicAuth, getToken, clearToken, decodeJwtClaims } from './auth.js';
import { graphqlRequest, QUERIES } from './graphql.js';
import { renderXpTimeline, renderPassFailDonut, renderSkillsChart } from './charts.js';
import { formatNumber, formatDate, formatXP } from './utils.js';

const API = {
    signin: 'https://learn.reboot01.com/api/auth/signin',
    graphql: 'https://learn.reboot01.com/api/graphql-engine/v1/graphql',
};

let globalData = {
    transactions: [],
    results: [],
    allProjects: []
};

// DOM Elements
const el = {
    loginPage: document.getElementById('loginPage'),
    profilePage: document.getElementById('profilePage'),
    loginForm: document.getElementById('loginForm'),
    loginBtn: document.getElementById('loginBtn'),
    loginError: document.getElementById('loginError'),
    identifier: document.getElementById('identifier'),
    password: document.getElementById('password'),
    logoutBtn: document.getElementById('logoutBtn'),
    welcomeUser: document.getElementById('welcomeUser'),
    
    // Video elements
    loginVideo: document.getElementById('loginVideo'),
    loginFailVideo: document.getElementById('loginFailVideo'),
    profileVideo: document.getElementById('profileVideo'),
    
    // Audio elements
    bgMusic: document.getElementById('bgMusic'),
    failSound: document.getElementById('failSound'),
    
    // Stats
    totalXp: document.getElementById('totalXp'),
    projectsDone: document.getElementById('projectsDone'),
    auditRatioValue: document.getElementById('auditRatioValue'),
    
    // User info
    userAvatar: document.getElementById('userAvatar'),
    userLogin: document.getElementById('userLogin'),
    userId: document.getElementById('userId'),
    userCampus: document.getElementById('userCampus'),
    userEmail: document.getElementById('userEmail'),
    userCreatedAt: document.getElementById('userCreatedAt'),
    
    // Audit stats
    auditsUp: document.getElementById('auditsUp'),
    auditsDown: document.getElementById('auditsDown'),
    auditBarUp: document.getElementById('auditBarUp'),
    auditBarDown: document.getElementById('auditBarDown'),
    passRate: document.getElementById('passRate'),
    
    // Charts
    xpTimelineChart: document.getElementById('xpTimelineChart'),
    xpTimelineMeta: document.getElementById('xpTimelineMeta'),
    passFailDonut: document.getElementById('passFailDonut'),
    donutMeta: document.getElementById('donutMeta'),
    skillsChart: document.getElementById('skillsChart'),
    skillsMeta: document.getElementById('skillsMeta'),
    
    // Projects
    recentProjectsList: document.getElementById('recentProjectsList'),
    
    // New elements
    showAllProjectsBtn: document.getElementById('showAllProjectsBtn'),
    projectsModal: document.getElementById('projectsModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    allProjectsList: document.getElementById('allProjectsList'),
    
    // Loading and 404
    profileLoading: document.getElementById('profileLoading'),
    notFoundPage: document.getElementById('notFoundPage'),
    backHomeBtn: document.getElementById('backHomeBtn'),
};

function playLoginVideo() {
    el.loginVideo.hidden = false;
    el.loginFailVideo.hidden = true;
    el.loginVideo.loop = true;
    el.loginVideo.play().catch(err => console.log('Login video autoplay prevented:', err));
    
    playBackgroundMusic();
}

function playBackgroundMusic() {
    if (el.bgMusic) {
        el.bgMusic.volume = 1; 
        
        const playPromise = el.bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.log('Autoplay prevented, enabling on first interaction');
                const startMusic = () => {
                    if (el.bgMusic.paused && !el.loginPage.hidden) {
                        el.bgMusic.play().catch(e => console.log('Play failed:', e));
                    }
                    document.removeEventListener('click', startMusic);
                    document.removeEventListener('keydown', startMusic);
                };
                document.addEventListener('click', startMusic, { once: true });
                document.addEventListener('keydown', startMusic, { once: true });
            });
        }
    }
}

function playLoginFailVideo() {
    el.loginVideo.hidden = true;
    el.loginFailVideo.hidden = false;
    el.loginFailVideo.currentTime = 0;
    el.loginFailVideo.play().catch(err => console.log('Fail video autoplay prevented:', err));
    
    // Play fail sound
    el.failSound.currentTime = 0;
    el.failSound.play().catch(err => console.log('Fail sound autoplay prevented:', err));
    
    // When fail video ends, switch back to login video
    el.loginFailVideo.onended = () => {
        playLoginVideo();
    };
}

function stopLoginAudio() {
    if (el.bgMusic) {
        el.bgMusic.pause();
        el.bgMusic.currentTime = 0;
    }
}

function stopProfileVideo() {
    if (el.profileVideo) {
        el.profileVideo.pause();
        el.profileVideo.currentTime = 0;
    }
}

function playProfileVideo() {
    if (el.profileVideo) {
        el.profileVideo.volume = 0.4; // Set volume to 40%
        const playPromise = el.profileVideo.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.log('Profile video autoplay prevented, waiting for interaction');
                // Add interaction listeners to start video
                const startVideo = () => {
                    if (el.profileVideo && el.profileVideo.paused && !el.profilePage.hidden) {
                        el.profileVideo.play().catch(e => console.log('Video play failed:', e));
                    }
                };
                document.addEventListener('click', startVideo, { once: true });
                document.addEventListener('keydown', startVideo, { once: true });
                document.addEventListener('mousemove', startVideo, { once: true });
                document.addEventListener('touchstart', startVideo, { once: true });
            });
        }
    }
}

function showError(message) {
    el.loginError.textContent = message;
    el.loginError.hidden = false;
    playLoginFailVideo();
}

function hideError() {
    el.loginError.hidden = true;
}

function setLoading(isLoading) {
    const btnText = el.loginBtn.querySelector('.btn-text');
    const btnLoader = el.loginBtn.querySelector('.btn-loader');
    
    el.loginBtn.disabled = isLoading;
    btnText.hidden = isLoading;
    btnLoader.hidden = !isLoading;
}

function showLogin() {
    console.log('showLogin() called');
    el.loginPage.hidden = false;
    el.profilePage.hidden = true;
    el.notFoundPage.hidden = true;
    stopProfileVideo();
    playLoginVideo();
    console.log('loginPage.hidden:', el.loginPage.hidden, 'profilePage.hidden:', el.profilePage.hidden);
}

function showProfile() {
    console.log('showProfile() called');
    el.loginPage.hidden = true;
    el.profilePage.hidden = false;
    el.notFoundPage.hidden = true;
    console.log('loginPage.hidden:', el.loginPage.hidden, 'profilePage.hidden:', el.profilePage.hidden);
    stopLoginAudio();
    playProfileVideo();
}

function show404() {
    el.loginPage.hidden = true;
    el.profilePage.hidden = true;
    el.notFoundPage.hidden = false;
    stopLoginAudio();
    stopProfileVideo();
}

function showProfileLoading() {
    if (el.profileLoading) {
        el.profileLoading.hidden = false;
    }
}

function hideProfileLoading() {
    if (el.profileLoading) {
        el.profileLoading.hidden = true;
    }
}

function computeAuditRatio(transactions) {
    const up = transactions.filter(t => t.type === 'up').reduce((sum, t) => sum + (t.amount || 0), 0);
    const down = transactions.filter(t => t.type === 'down').reduce((sum, t) => sum + (t.amount || 0), 0);
    return { up, down, ratio: down > 0 ? (up / down).toFixed(2) : up > 0 ? '∞' : '0' };
}

function computePassFail(progressData) {
    let pass = 0, fail = 0;
    for (const p of progressData) {
        if (typeof p.grade !== 'number') continue;
        if (p.grade >= 1) pass++;
        else fail++;
    }
    return { pass, fail, rate: pass + fail > 0 ? ((pass / (pass + fail)) * 100).toFixed(1) : 0 };
}

function buildXpTimelineData(xpTransactions) {
    // XP transactions are already filtered by query for bh-module excluding piscine-js
    const dataPoints = [];
    let cumulativeXP = 0;
    
    xpTransactions.forEach(t => {
        cumulativeXP += t.amount;
        dataPoints.push({
            date: new Date(t.createdAt),
            xp: cumulativeXP
        });
    });
    
    return dataPoints;
}

function extractProjectName(path) {
    if (!path) return '';
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
}

function extractSkills(transactions) {
    const skillMap = {};
    
    for (const t of transactions) {
        if (t.type && t.type.startsWith('skill_')) {
            const skillName = t.type.replace('skill_', '').replace(/_/g, ' ');
            if (!skillMap[skillName] || t.amount > skillMap[skillName]) {
                skillMap[skillName] = t.amount;
            }
        }
    }
    
    return Object.entries(skillMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
}

function updatePassFailChart(progressData) {
    const passFail = computePassFail(progressData);
    renderPassFailDonut(el.passFailDonut, passFail.pass, passFail.fail);
    el.donutMeta.textContent = `Projects · Pass: ${passFail.pass} · Fail: ${passFail.fail}`;
}

function renderRecentProjects(transactions) {
    const xpTx = transactions
        .filter(t => t.type === 'xp' && t.amount > 0)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    if (xpTx.length === 0) {
        el.recentProjectsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No projects found</p>';
        return;
    }
    
    el.recentProjectsList.innerHTML = xpTx.map(t => `
        <div class="project-item">
            <div class="project-info">
                <span class="project-name">${t.object?.name || extractProjectName(t.path)}</span>
                <span class="project-date">${formatDate(t.createdAt)}</span>
            </div>
            <div class="project-xp">
                <span class="project-xp-value">+${formatXP(t.amount)} XP</span>
                <span class="project-status pass">✓</span>
            </div>
        </div>
    `).join('');
}

function renderAllProjects(progressData) {
    if (progressData.length === 0) {
        el.allProjectsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">No projects found</p>';
        return;
    }
    
    el.allProjectsList.innerHTML = progressData.map(p => {
        const isPassed = p.grade >= 1;
        const statusClass = isPassed ? 'pass' : 'fail';
        const statusSymbol = isPassed ? '✓' : '✗';
        
        return `
            <div class="project-item">
                <div class="project-info">
                    <span class="project-name">${p.object?.name || 'Project'}</span>
                    <span class="project-date">${formatDate(p.createdAt)}</span>
                </div>
                <div class="project-xp">
                    <span class="project-xp-value">${p.grade < 1 ? "Fail" : "Pass"}</span>
                    <span class="project-status ${statusClass}">${statusSymbol}</span>
                </div>
            </div>
        `;
    }).join('');
}

function openProjectsModal() {
    renderAllProjects(globalData.allProjects);
    el.projectsModal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeProjectsModal() {
    el.projectsModal.hidden = true;
    document.body.style.overflow = '';
}

async function loadProfile() {
    console.log('loadProfile called');
    const token = getToken();
    if (!token) {
        console.log('No token found, showing login');
        showLogin();
        return;
    }
    
    console.log('Token found, decoding claims...');
    const claims = decodeJwtClaims(token);
    console.log('JWT claims:', claims);
    const userId = claims?.userId;
    
    if (!userId) {
        console.log('No userId in claims, showing login');
        showLogin();
        return;
    }
    
    console.log('User ID:', userId);
    showProfile();
    showProfileLoading(); // Show loading overlay
    
    try {
        // Execute all queries in parallel for better performance
        console.log('Loading user data with separate queries...');
        const [
            userData,
            xpTotalData,
            projectsCountData,
            xpTransactionsData,
            transactionsData,
            resultsData,
            auditsData,
            allProjectsData
        ] = await Promise.all([
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.user,
                variables: { userId }
            }),
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.xpTotal,
                variables: { userId }
            }),
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.projectsCount,
                variables: { userId }
            }),
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.xpTransactions,
                variables: { userId }
            }),
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.transactions,
                variables: { userId }
            }),
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.results,
                variables: { userId }
            }),
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.audits,
                variables: { userId }
            }),
            graphqlRequest({
                url: API.graphql,
                token,
                query: QUERIES.allProjects,
                variables: { userId }
            })
        ]);
        
        const user = userData?.user?.[0];
        const transactions = transactionsData?.transaction || [];
        const results = resultsData?.result || [];
        const audits = auditsData?.audit || [];
        const xpTransactions = xpTransactionsData?.transaction || [];
        const progressData = projectsCountData?.progress || [];
        const allProjects = allProjectsData?.progress || [];
        
        // Get aggregated values from GraphQL
        const totalXpFromQuery = xpTotalData?.xp_total?.aggregate?.sum?.amount || 0;
        
        // Count passed and failed projects
        const projectStats = computePassFail(progressData);
        
        // User info
        if (user) {
            const initial = (user.login || '?')[0].toUpperCase() +(user.login || '?')[1]?.toUpperCase() || '';
            el.userAvatar.textContent = initial;
            el.userLogin.textContent = user.login || '—';
            el.userId.textContent = userId;
            el.userCampus.textContent = user.campus || '—';
            el.userEmail.textContent = user.attrs?.email || user.email || '—';
            el.userCreatedAt.textContent = formatDate(user.createdAt);
            el.welcomeUser.textContent = `Welcome, ${user.login || 'User'}`;
        }
        
        // XP Stats (from aggregated query - only bh-module, excluding piscine-js)
        el.totalXp.textContent = formatXP(totalXpFromQuery);
        
        // Projects done (count of completed projects)
        el.projectsDone.textContent = progressData.length;
        
        // Store data globally
        globalData.transactions = transactions;
        globalData.results = results;
        globalData.allProjects = allProjects;
        
        // Audit ratio
        const audit = computeAuditRatio(transactions);
        el.auditRatioValue.textContent = audit.ratio;
        el.auditsUp.textContent = formatXP(audit.up);
        el.auditsDown.textContent = formatXP(audit.down);
        
        const total = audit.up + audit.down;
        if (total > 0) {
            el.auditBarUp.style.width = `${(audit.up / total) * 100}%`;
            el.auditBarDown.style.width = `${(audit.down / total) * 100}%`;
        }
        
        // Pass/Fail rate
        el.passRate.textContent = `${projectStats.rate}%`;
        
        // Charts
        const xpTimelineData = buildXpTimelineData(xpTransactions);
        renderXpTimeline(el.xpTimelineChart, xpTimelineData);
        el.xpTimelineMeta.textContent = `${xpTransactions.length} XP transactions (bh-module)`;
        
        // Pass/fail chart using progress data
        updatePassFailChart(progressData);
        
        const skills = extractSkills(transactions);
        renderSkillsChart(el.skillsChart, skills);
        el.skillsMeta.textContent = skills.length > 0 ? `${skills.length} skills tracked` : 'No skill data available';
        
        // Recent projects
        renderRecentProjects(transactions);
        
        // Hide loading overlay
        hideProfileLoading();
        
        // Ensure profile video is playing
        setTimeout(() => playProfileVideo(), 100);
        
    } catch (error) {
        console.error('Failed to load profile:', error);
        hideProfileLoading();
        showError(error.message || 'Failed to load profile data');
    }
}

// Event Listeners
el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    
    const identifier = el.identifier.value.trim();
    const password = el.password.value;
    
    if (!identifier || !password) {
        showError('Please enter your credentials');
        return;
    }
    
    setLoading(true);
    console.log('Attempting sign in...');
    
    try {
        const token = await signinWithBasicAuth({
            url: API.signin,
            identifier,
            password
        });
        console.log('Sign in successful, token received');
        console.log('Token preview:', token?.substring(0, 50) + '...');
        
        await loadProfile();
        console.log('Profile loaded successfully');
    } catch (error) {
        console.error('Sign in error:', error);
        showError(error.message || 'Sign in failed');
    } finally {
        setLoading(false);
    }
});

el.logoutBtn.addEventListener('click', () => {
    clearToken();
    stopProfileVideo();
    showLogin();
    el.identifier.value = '';
    el.password.value = '';
    playLoginVideo();
});

// Show all projects modal
el.showAllProjectsBtn.addEventListener('click', openProjectsModal);
el.closeModalBtn.addEventListener('click', closeProjectsModal);
el.projectsModal.querySelector('.modal-overlay').addEventListener('click', closeProjectsModal);

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.projectsModal.hidden) {
        closeProjectsModal();
    }
});

// Initialize - Start music first for immediate playback
// Try multiple times to ensure music starts
const tryPlayMusic = () => {
    if (el.bgMusic && el.bgMusic.paused) {
        el.bgMusic.volume = 0.5;
        el.bgMusic.play().catch(() => {});
    }
};

// Immediate attempt
tryPlayMusic();

// Retry on various early events
window.addEventListener('load', tryPlayMusic);
document.addEventListener('DOMContentLoaded', tryPlayMusic);

// Fallback: catch any user interaction
const startMusicOnInteraction = () => {
    if (el.bgMusic && el.bgMusic.paused && !el.loginPage.hidden) {
        el.bgMusic.play().catch(() => {});
    }
};
document.addEventListener('mousemove', startMusicOnInteraction, { once: true });
document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
document.addEventListener('click', startMusicOnInteraction, { once: true });
document.addEventListener('keydown', startMusicOnInteraction, { once: true });

playLoginVideo();

// URL validation for 404 handling
function checkURL() {
    const path = window.location.pathname;
    const validPaths = ['/', '/index.html'];
    
    // Check if path is valid (root or index.html)
    const isValidPath = validPaths.some(validPath => path === validPath || path.endsWith(validPath));
    
    if (!isValidPath) {
        show404();
        return false;
    }
    return true;
}

// Back to home button handler
if (el.backHomeBtn) {
    el.backHomeBtn.addEventListener('click', () => {
        window.history.pushState({}, '', '/');
        el.notFoundPage.hidden = true;
        if (getToken()) {
            loadProfile();
        } else {
            showLogin();
            playLoginVideo();
        }
    });
}

// Check URL on load
if (checkURL()) {
    // Check for existing token on load
    if (getToken()) {
        loadProfile();
    } else {
        showLogin();
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    if (checkURL()) {
        if (getToken()) {
            loadProfile();
        } else {
            showLogin();
            playLoginVideo();
        }
    }
});