// --- REDRIVERR LAB // MEGA STATION CORE ENGINE ---

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. PARTICLE ENGINE (MEGA STATION EDITION)
    const canvas = document.getElementById('lab-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 180 };

    function initCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', initCanvas);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 0.8;
            this.speedY = (Math.random() - 0.5) * 0.8;
            this.color = 'rgba(255, 51, 51, 0.6)';
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
            if (this.y > canvas.height || this.y < 0) this.speedY *= -1;

            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius) {
                const force = (mouse.radius - distance) / mouse.radius;
                this.x += dx * force * 0.05;
                this.y += dy * force * 0.05;
            }
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function handleParticles() {
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    ctx.strokeStyle = `rgba(255, 51, 51, ${0.15 - distance/800})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        handleParticles();
        requestAnimationFrame(animate);
    }

    initCanvas();
    for (let i = 0; i < 120; i++) particles.push(new Particle());
    animate();

    // 2. MOUSE TILT EFFECT
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotateX = (y - rect.height/2) / 15;
            const rotateY = (rect.width/2 - x) / 15;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)`;
        });
    });

    // 3. INTERACTIVE TERMINAL ENGINE
    const terminalBody = document.getElementById('terminal-body');
    const terminalForm = document.getElementById('terminal-form');
    const terminalInput = document.getElementById('terminal-input');
    const terminalWindow = document.getElementById('terminal-window');
    const closeBtn = document.getElementById('close-terminal-btn');
    const closeDot = document.getElementById('close-terminal');
    const openBtn = document.getElementById('open-terminal');

    // Toggle Logic
    const closeTerminal = () => {
        terminalWindow.classList.add('hidden');
        openBtn.classList.add('visible');
    };

    closeBtn.addEventListener('click', closeTerminal);
    closeDot.addEventListener('click', closeTerminal);

    openBtn.addEventListener('click', () => {
        terminalWindow.classList.remove('hidden');
        openBtn.classList.remove('visible');
        setTimeout(() => terminalInput.focus(), 100);
    });

    const commands = {
        'help': 'Commands: [about, whoami, shadownet, status, social, clear, help]',
        'about': 'REDRIVERR LAB: A high-fidelity command station for tactical intelligence & infrastructure design.',
        'whoami': 'Identity: Mert Kizilirmak // Lead Architect // RedRiveRR',
        'shadownet': 'SHADOWNET: Deployment Active. Status: 100% Stable. Address: shadownet.redriverlab.me',
        'status': 'OS: RedRiveRR_OS v1.0.5 | Uptime: 99.98% | CPU: Nominal | Shield: Active',
        'social': 'GitHub: @RedRiveRR | LinkedIn: /in/mert-kizilirmak | Discord: redriver',
        'clear': 'CLEAR'
    };

    function appendOutput(text, type = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        if (type === 'command') entry.style.color = '#ff3333';
        if (type === 'error') entry.style.color = '#ff9900';
        if (type === 'sys') entry.style.color = '#00fff9';
        
        entry.textContent = type === 'command' ? `> ${text}` : `[${type.toUpperCase()}] ${text}`;
        terminalBody.appendChild(entry);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    terminalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = terminalInput.value.toLowerCase().trim();
        if (!input) return;

        appendOutput(input, 'command');
        terminalInput.value = '';

        if (commands[input]) {
            if (commands[input] === 'CLEAR') {
                terminalBody.innerHTML = '';
            } else {
                setTimeout(() => appendOutput(commands[input], 'info'), 150);
            }
        } else {
            setTimeout(() => appendOutput(`Command not found: '${input}'. Type 'help' for tactical support.`, 'error'), 150);
        }
    });

    // Auto-focus terminal on click
    terminalWindow.addEventListener('click', () => terminalInput.focus());

    // 4. DYNAMIC STATS
    const entitiesStat = document.getElementById('stat-entities');
    const uptimeStat = document.getElementById('stat-uptime');
    let entities = 1402;

    setInterval(() => {
        entities += Math.floor(Math.random() * 4);
        entitiesStat.textContent = entities.toLocaleString();
        
        if (Math.random() > 0.95) {
            appendOutput("Intercepting encrypted vessel telemetry...", "sys");
        }
    }, 4000);

    // 5. BOOT MESSAGE
    console.log("%cREDRIVERR LAB // MEGA STATION INITIALIZED", "color: #ff3333; font-size: 30px; font-weight: 900;");
});
