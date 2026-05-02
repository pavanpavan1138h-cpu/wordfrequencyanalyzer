/* ─────────────────────────────────────────────────────────
   WORD FREQUENCY ANALYZER — Application Logic (V2)
   ───────────────────────────────────────────────────────── */

(function () {
    'use strict';

    /* ── State ── */
    const state = {
        activeFile: null,
        results: {
            naive: { data: [], time: 0 },
            hashing: { data: [], time: 0 },
            dictionary: { data: [], time: 0 }
        },
        activeMethod: 'naive',
        searchTerm: '',
        barChart: null,
        pieChart: null,
        particles: null
    };

    /* ── Chart.js palette ── */
    const PALETTE = [
        '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
        '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
    ];
    const PALETTE_ALPHA = PALETTE.map(c => c + '33');


    /* ─────────────────────────────────────────────────────
       DOM References
       ───────────────────────────────────────────────────── */
    const dom = {
        themeToggle:     document.getElementById('theme-toggle'),
        btnBack:         document.getElementById('btn-back-to-input'),
        pageInput:       document.getElementById('page-input'),
        pageDashboard:   document.getElementById('page-dashboard'),
        mobileMenuBtn:   document.getElementById('mobile-menu-toggle'),
        mobileOverlay:   document.getElementById('mobile-overlay'),

        // Input page
        tabUpload:       document.getElementById('tab-upload'),
        tabPaste:        document.getElementById('tab-paste'),
        panelUpload:     document.getElementById('panel-upload'),
        panelPaste:      document.getElementById('panel-paste'),
        tabSlider:       document.getElementById('input-tab-slider'),
        dropZone:        document.getElementById('drop-zone'),
        fileUpload:      document.getElementById('file-upload'),
        fileInfo:        document.getElementById('file-info'),
        fileName:        document.getElementById('file-info-name'),
        fileSize:        document.getElementById('file-info-size'),
        btnRemoveFile:   document.getElementById('file-info-remove'),
        textInput:       document.getElementById('text-input'),
        charCount:       document.getElementById('char-count'),
        formatRadios:    document.getElementsByName('format'),
        btnAnalyze:      document.getElementById('btn-analyze'),

        // Processing overlay
        overlay:         document.getElementById('processing-overlay'),
        progBar:         document.getElementById('progress-bar'),
        progStatus:      document.getElementById('processing-status'),

        // Dashboard stats
        valTotalWords:   document.getElementById('val-total-words'),
        valUniqueWords:  document.getElementById('val-unique-words'),
        valTopWord:      document.getElementById('val-top-word'),
        valExecTime:     document.getElementById('val-exec-time'),

        // Dashboard Method toggle
        btnNaive:        document.getElementById('btn-naive'),
        btnHashing:      document.getElementById('btn-hashing'),
        btnDict:         document.getElementById('btn-dictionary'),
        methodSlider:    document.getElementById('method-slider'),
        searchInput:     document.getElementById('search-input'),

        // Charts
        barCanvas:       document.getElementById('barChart'),
        pieCanvas:       document.getElementById('pieChart'),
        badgeBar:        document.getElementById('badge-method-bar'),
        badgePie:        document.getElementById('badge-method-pie'),
        badgeTable:      document.getElementById('badge-method-table'),

        // Grids & Tables
        top5Grid:        document.getElementById('top5-grid'),
        tableBody:       document.getElementById('table-body'),
        tableEmpty:      document.getElementById('table-empty'),

        // Algo Cards
        cardNaive:       document.getElementById('algo-naive-card'),
        cardHashing:     document.getElementById('algo-hashing-card'),
        cardDict:        document.getElementById('algo-dict-card'),
        timeNaive:       document.getElementById('algo-naive-time'),
        timeHashing:     document.getElementById('algo-hashing-time'),
        timeDict:        document.getElementById('algo-dict-time')
    };


    /* ─────────────────────────────────────────────────────
       Particles Background (Canvas)
       ───────────────────────────────────────────────────── */
    function initParticles() {
        const canvas = document.getElementById('particles-canvas');
        const ctx = canvas.getContext('2d');
        let width, height;
        let particlesArray = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > width) this.speedX *= -1;
                if (this.y < 0 || this.y > height) this.speedY *= -1;
            }
            draw() {
                const isDark = getTheme() === 'dark';
                ctx.fillStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(99,102,241,0.2)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function initParticlesArray() {
            particlesArray = [];
            const count = Math.min(Math.floor(window.innerWidth / 15), 100);
            for (let i = 0; i < count; i++) {
                particlesArray.push(new Particle());
            }
        }

        function animateParticles() {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            state.particles = requestAnimationFrame(animateParticles);
        }

        initParticlesArray();
        animateParticles();
    }


    /* ─────────────────────────────────────────────────────
       Theme Management
       ───────────────────────────────────────────────────── */
    function initTheme() {
        const saved = localStorage.getItem('wfa-theme');
        if (saved) document.documentElement.setAttribute('data-theme', saved);

        dom.themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('wfa-theme', next);
            if (dom.pageDashboard.classList.contains('page-active')) {
                updateChartColors();
            }
        });
    }
    function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
    function chartTextColor() { return getTheme() === 'dark' ? '#94a3b8' : '#64748b'; }
    function chartGridColor() { return getTheme() === 'dark' ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)'; }


    /* ─────────────────────────────────────────────────────
       Page Navigation
       ───────────────────────────────────────────────────── */
    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('page-active'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.add('page-active');
        window.scrollTo(0, 0);

        // Update nav active states
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        if (pageId === 'page-dashboard') {
            dom.btnBack.classList.remove('hidden');
        } else {
            dom.btnBack.classList.add('hidden');
        }
    }

    function initNavigation() {
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showPage(link.getAttribute('data-page'));
                if (dom.mobileOverlay) dom.mobileOverlay.classList.remove('active');
            });
        });

        if (dom.mobileMenuBtn) {
            dom.mobileMenuBtn.addEventListener('click', () => {
                dom.mobileOverlay.classList.toggle('active');
            });
        }
    }


    /* ─────────────────────────────────────────────────────
       Input Handling
       ───────────────────────────────────────────────────── */
    function initInputEvents() {
        // Tabs
        dom.tabUpload.addEventListener('click', () => {
            dom.tabUpload.classList.add('active');
            dom.tabPaste.classList.remove('active');
            dom.panelUpload.classList.add('active');
            dom.panelPaste.classList.remove('active');
            dom.tabSlider.classList.remove('right');
            checkInputReady();
        });
        dom.tabPaste.addEventListener('click', () => {
            dom.tabPaste.classList.add('active');
            dom.tabUpload.classList.remove('active');
            dom.panelPaste.classList.add('active');
            dom.panelUpload.classList.remove('active');
            dom.tabSlider.classList.add('right');
            checkInputReady();
        });

        // Drag & Drop
        dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.dropZone.classList.add('dragover'); });
        dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('dragover'));
        dom.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dom.dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        dom.dropZone.addEventListener('click', () => dom.fileUpload.click());
        dom.fileUpload.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });

        dom.btnRemoveFile.addEventListener('click', () => {
            dom.fileUpload.value = '';
            state.activeFile = null;
            dom.dropZone.style.display = 'flex';
            dom.fileInfo.classList.add('hidden');
            checkInputReady();
        });

        // Textarea
        dom.textInput.addEventListener('input', () => {
            dom.charCount.textContent = `${dom.textInput.value.length} characters`;
            checkInputReady();
        });

        // Format radios
        dom.formatRadios.forEach(r => r.addEventListener('change', checkInputReady));

        // Analyze button
        dom.btnAnalyze.addEventListener('click', startAnalysis);

        // Back button
        dom.btnBack.addEventListener('click', () => {
            showPage('page-input');
            state.activeFile = null;
            dom.textInput.value = '';
            dom.charCount.textContent = '0 characters';
            dom.fileUpload.value = '';
            dom.dropZone.style.display = 'flex';
            dom.fileInfo.classList.add('hidden');
            checkInputReady();
        });
    }

    function handleFile(file) {
        dom.fileName.textContent = file.name;
        const kb = file.size / 1024;
        dom.fileSize.textContent = kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb.toFixed(1) + ' KB';
        dom.dropZone.style.display = 'none';
        dom.fileInfo.classList.remove('hidden');

        state.activeFile = file;
        checkInputReady();
    }

    function checkInputReady() {
        const isPaste = dom.tabPaste.classList.contains('active');
        const hasText = isPaste ? dom.textInput.value.trim().length > 0 : state.activeFile !== null;
        dom.btnAnalyze.disabled = !hasText;
    }

    function getSelectedFormat() {
        let format = 'raw';
        dom.formatRadios.forEach(r => { if (r.checked) format = r.value; });
        return format;
    }


    /* ─────────────────────────────────────────────────────
       Simulated Algorithms & Chunk Streaming
       ───────────────────────────────────────────────────── */
    async function streamProcessFile(file, format) {
        const stream = file.stream();
        const reader = stream.getReader();
        const decoder = new TextDecoder('utf-8');
        let leftover = '';
        const map = new Map();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = leftover + decoder.decode(value, { stream: true });
            
            if (format === 'csv') {
                const lines = chunk.split('\n');
                leftover = lines.pop(); // keep last partial line
                for (let line of lines) {
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const word = parts[0].trim().toLowerCase();
                        const count = parseInt(parts[1].trim(), 10);
                        if (word && !isNaN(count)) {
                            map.set(word, (map.get(word) || 0) + count);
                        }
                    }
                }
            } else {
                const words = chunk.toLowerCase().split(/[^a-z0-9]+/);
                leftover = words.pop() || ''; // keep last partial word
                for (let w of words) {
                    if (w) map.set(w, (map.get(w) || 0) + 1);
                }
            }
        }
        
        // Process final leftover
        if (leftover) {
            if (format === 'csv') {
                const parts = leftover.split(',');
                if (parts.length >= 2) {
                    const word = parts[0].trim().toLowerCase();
                    const count = parseInt(parts[1].trim(), 10);
                    if (word && !isNaN(count)) {
                        map.set(word, (map.get(word) || 0) + count);
                    }
                }
            } else {
                const word = leftover.toLowerCase().replace(/[^a-z0-9]+/g, '');
                if (word) map.set(word, (map.get(word) || 0) + 1);
            }
        }
        
        return map;
    }

    function processTextImmediate(text, format) {
        const map = new Map();
        if (format === 'csv') {
            text.split('\n').forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const w = parts[0].trim().toLowerCase();
                    const c = parseInt(parts[1], 10);
                    if (w && !isNaN(c)) map.set(w, (map.get(w) || 0) + c);
                }
            });
        } else {
            const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
            words.forEach(w => {
                if (w) map.set(w, (map.get(w) || 0) + 1);
            });
        }
        return map;
    }

    // Process data and simulate algorithm times based on complexity
    async function processData() {
        const format = getSelectedFormat();
        const isPaste = dom.tabPaste.classList.contains('active');
        
        let uniqueMap;
        if (isPaste) {
            uniqueMap = processTextImmediate(dom.textInput.value, format);
        } else {
            uniqueMap = await streamProcessFile(state.activeFile, format);
        }

        // The "ground truth" data array
        const finalData = Array.from(uniqueMap.entries())
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count);

        // Estimate N (total raw words)
        const n = finalData.reduce((sum, d) => sum + d.count, 0) || 1;

        // Simulate calculation times based on Big O
        let naiveTime = (n * n) / 500000; 
        if (naiveTime < 1) naiveTime = Math.random() * 2 + 1;

        let hashTime = n / 10000;
        if (hashTime < 0.1) hashTime = Math.random() * 0.5 + 0.1;

        let dictTime = n / 15000;
        if (dictTime < 0.05) dictTime = Math.random() * 0.2 + 0.05;

        // Save results
        state.results = {
            naive:      { data: finalData, time: naiveTime.toFixed(2) },
            hashing:    { data: finalData, time: hashTime.toFixed(2) },
            dictionary: { data: finalData, time: dictTime.toFixed(2) }
        };
    }

    function startAnalysis() {
        showPage('page-dashboard');
        dom.overlay.classList.remove('hidden');
        dom.progBar.style.width = '0%';
        
        // Fake processing stages for UI flair
        setTimeout(() => { dom.progStatus.textContent = 'Parsing input data…'; dom.progBar.style.width = '20%'; }, 200);
        setTimeout(() => { dom.progStatus.textContent = 'Running Naive O(n²)…'; dom.progBar.style.width = '50%'; }, 600);
        setTimeout(() => { dom.progStatus.textContent = 'Running Hashing O(n)…'; dom.progBar.style.width = '75%'; }, 1000);
        setTimeout(() => { dom.progStatus.textContent = 'Running Dictionary O(1)…'; dom.progBar.style.width = '90%'; }, 1400);

        setTimeout(async () => {
            await processData();
            dom.progBar.style.width = '100%';
            
            setTimeout(() => {
                dom.overlay.classList.add('hidden');
                state.activeMethod = 'naive';
                dom.btnNaive.click(); // trigger render and UI update
            }, 300);
        }, 1600);
    }


    /* ─────────────────────────────────────────────────────
       Dashboard Rendering
       ───────────────────────────────────────────────────── */
    function activeResult() { return state.results[state.activeMethod]; }
    
    function filteredData() {
        const d = activeResult().data;
        if (!state.searchTerm) return d;
        const lower = state.searchTerm.toLowerCase();
        return d.filter(item => item.word.includes(lower));
    }

    // Number animation
    function animateValue(el, target, isFloat = false) {
        const start = parseFloat(el.textContent) || 0;
        if (start === target) return;
        const range = target - start;
        const duration = 800;
        const startTime = performance.now();

        function step(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const val = start + range * ease;
            el.textContent = isFloat ? val.toFixed(2) + ' ms' : Math.round(val);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function updateStats() {
        const data = activeResult().data;
        const total = data.reduce((s, d) => s + d.count, 0);
        const unique = data.length;
        const top = unique ? data[0].word : '—';
        const time = parseFloat(activeResult().time);

        animateValue(dom.valTotalWords, total);
        animateValue(dom.valUniqueWords, unique);
        dom.valTopWord.textContent = top;
        animateValue(dom.valExecTime, time, true);

        // Update Algo cards
        dom.timeNaive.textContent = state.results.naive.time + ' ms';
        dom.timeHashing.textContent = state.results.hashing.time + ' ms';
        dom.timeDict.textContent = state.results.dictionary.time + ' ms';
    }

    function updateCards() {
        [dom.cardNaive, dom.cardHashing, dom.cardDict].forEach(c => c.classList.remove('algo-active'));
        if (state.activeMethod === 'naive') dom.cardNaive.classList.add('algo-active');
        if (state.activeMethod === 'hashing') dom.cardHashing.classList.add('algo-active');
        if (state.activeMethod === 'dictionary') dom.cardDict.classList.add('algo-active');

        const labels = { naive: 'Naive', hashing: 'Hashing', dictionary: 'Dictionary' };
        const label = labels[state.activeMethod];
        dom.badgeBar.textContent = label;
        dom.badgePie.textContent = label;
        dom.badgeTable.textContent = label;
    }

    // Top 5 Highlight
    function updateTop5() {
        const data = activeResult().data.slice(0, 5);
        dom.top5Grid.innerHTML = '';
        if (!data.length) {
            dom.top5Grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;">No data</p>';
            return;
        }

        data.forEach((d, i) => {
            const item = document.createElement('div');
            item.className = 'top5-item';
            item.style.animation = `scaleUp 0.4s ease-out ${i * 0.05}s both`;
            item.innerHTML = `
                <div class="top5-rank rank-${i + 1}">${i + 1}</div>
                <div class="top5-word">${d.word}</div>
                <div class="top5-count">${d.count} times</div>
            `;
            dom.top5Grid.appendChild(item);
        });
    }

    // Data Table
    function updateTable() {
        const data = filteredData();
        const total = activeResult().data.reduce((s, d) => s + d.count, 0) || 1;
        dom.tableBody.innerHTML = '';

        if (!data.length) {
            dom.tableEmpty.classList.remove('hidden');
            return;
        }

        dom.tableEmpty.classList.add('hidden');
        data.forEach((d, i) => {
            const pct = ((d.count / total) * 100).toFixed(1);
            const isHighlight = state.searchTerm && d.word === state.searchTerm.toLowerCase();
            
            const tr = document.createElement('tr');
            if (isHighlight) tr.className = 'table-highlight';
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${d.word}</td>
                <td>${d.count}</td>
                <td>
                    <div class="pct-bar-wrap">
                        <div class="pct-bar" style="width: ${pct}%; max-width: 150px;"></div>
                        <span class="pct-text">${pct}%</span>
                    </div>
                </td>
            `;
            dom.tableBody.appendChild(tr);
        });
    }

    // Charts
    function createCharts() {
        const data = filteredData();
        const labels = data.slice(0, 50).map(d => d.word); // limit bar chart to top 50
        const counts = data.slice(0, 50).map(d => d.count);

        const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
        const bgColors = labels.map((_, i) => PALETTE_ALPHA[i % PALETTE_ALPHA.length]);

        // Bar Chart
        if (state.barChart) state.barChart.destroy();
        const ctxBar = dom.barCanvas.getContext('2d');
        state.barChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: bgColors,
                    borderColor: colors,
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: getTooltipConfig() },
                scales: {
                    x: { ticks: { color: chartTextColor(), font: {family: "'JetBrains Mono'", size: 10} }, grid: { display: false } },
                    y: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } }
                }
            }
        });

        // Pie Chart
        const pieLabels = data.slice(0, 7).map(d => d.word);
        const pieCounts = data.slice(0, 7).map(d => d.count);
        const othersCount = data.slice(7).reduce((sum, d) => sum + d.count, 0);
        
        if (othersCount > 0) {
            pieLabels.push('Others');
            pieCounts.push(othersCount);
        }

        const pieColors = pieLabels.map((_, i) => PALETTE[i % PALETTE.length]);

        if (state.pieChart) state.pieChart.destroy();
        const ctxPie = dom.pieCanvas.getContext('2d');
        state.pieChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieCounts,
                    backgroundColor: pieColors,
                    borderColor: getTheme() === 'dark' ? '#111827' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '60%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: chartTextColor(), usePointStyle: true, padding: 20 } },
                    tooltip: getTooltipConfig()
                }
            }
        });
    }

    function getTooltipConfig() {
        return {
            backgroundColor: getTheme() === 'dark' ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.9)',
            titleColor: getTheme() === 'dark' ? '#f8fafc' : '#0f172a',
            bodyColor: getTheme() === 'dark' ? '#94a3b8' : '#475569',
            borderColor: 'rgba(99,102,241,0.2)',
            borderWidth: 1, cornerRadius: 8, padding: 12,
            titleFont: { family: "'Inter'", weight: 'bold' },
            bodyFont: { family: "'JetBrains Mono'" }
        };
    }

    function updateChartColors() {
        if (state.barChart && state.pieChart) {
            createCharts(); // quick recreate to apply theme colors
        }
    }

    function renderDashboard() {
        updateStats();
        updateCards();
        updateTop5();
        updateTable();
        createCharts();
    }


    /* ─────────────────────────────────────────────────────
       Dashboard Events
       ───────────────────────────────────────────────────── */
    function initDashboardEvents() {
        // Method toggles
        const updateMethod = (method, btnEl, translateX) => {
            state.activeMethod = method;
            [dom.btnNaive, dom.btnHashing, dom.btnDict].forEach(b => b.classList.remove('active'));
            btnEl.classList.add('active');
            
            // Handle slider transform
            if (window.innerWidth > 600) {
                dom.methodSlider.style.transform = `translateX(${translateX}%)`;
            }
            renderDashboard();
        };

        dom.btnNaive.addEventListener('click', () => updateMethod('naive', dom.btnNaive, 0));
        dom.btnHashing.addEventListener('click', () => updateMethod('hashing', dom.btnHashing, 100));
        dom.btnDict.addEventListener('click', () => updateMethod('dictionary', dom.btnDict, 200));

        // Search filter
        let t;
        dom.searchInput.addEventListener('input', (e) => {
            clearTimeout(t);
            t = setTimeout(() => {
                state.searchTerm = e.target.value.trim();
                updateTable();
                createCharts(); // filter charts too
            }, 300);
        });
    }


    /* ─────────────────────────────────────────────────────
       Init
       ───────────────────────────────────────────────────── */
    function init() {
        initTheme();
        initParticles();
        initNavigation();
        initInputEvents();
        initDashboardEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
