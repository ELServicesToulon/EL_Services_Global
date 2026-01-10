/**
 * @file Dashboard_Server.js
 * @description Serveur API léger pour le Dashboard SuperAdmin.
 * Il expose l'état des agents, les logs et les conseils de l'Adjoint.
 * Documentation API disponible sur /api-docs
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ChiefAdvisor = require('./Agents_Modules/Chief_Advisor_Agent');

// Swagger UI
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

// --- SWAGGER API DOCS ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Antigravity Dashboard API'
}));


// --- DATA CACHE ---
let advisorTipCache = {
    content: "Analyse du système en cours...",
    timestamp: 0
};

// --- ROUTES ---

// 1. État global des agents (Mocké pour la démo + lecture logs réels)
app.get('/api/agents', (req, res) => {
    // Liste des agents définis
    const agents = [
        { id: 'sentinel', name: 'Sentinel Core', role: 'Orchestrateur', status: 'running' },
        { id: 'network', name: 'Network Overseer', role: 'Surveillance', status: 'running' },
        { id: 'security', name: 'Security Agent', role: 'Cybersécurité', status: 'running' },
        { id: 'advisor', name: 'Chief Advisor', role: 'Stratégie', status: 'idle' },
        { id: 'secretary', name: 'Secretary Agent', role: 'Administratif', status: 'idle' },
        { id: 'marketing', name: 'Marketing Agent', role: 'Design & UI/UX', status: 'idle' },
        { id: 'watchdog', name: 'Watchdog Agent', role: 'Veille & Deep Research', status: 'active' },
        { id: 'frontend', name: 'Frontend Agent', role: 'React UI/UX', status: 'active' },
        { id: 'backend', name: 'Backend Agent', role: 'API & DB', status: 'active' },
        { id: 'qa', name: 'QA Agent', role: 'Testing & Validation', status: 'active' },
        { id: 'ghost', name: 'Ghost Shopper', role: 'Tests User', status: 'stopped' }
    ];

    // Enrichir avec les derniers logs si dispos
    // (Simplification : on renvoie le statut théorique pour l'instant)
    res.json(agents);
});

// 2. Conseil de l'Adjoint (Cache 1h)
app.get('/api/advisor/tip', async (req, res) => {
    const now = Date.now();
    // Refresh si cache > 1h
    if (now - advisorTipCache.timestamp > 3600000) {
        try {
            const advice = await ChiefAdvisor.askGemini("Donne-moi un conseil stratégique court (1 phrase) pour l'administrateur système aujourd'hui.");
            advisorTipCache = { content: advice, timestamp: now };
        } catch (e) {
            advisorTipCache = { content: "Impossible de contacter l'Advisor pour le moment.", timestamp: now };
        }
    }
    res.json({ tip: advisorTipCache.content });
});

// 3. Événements majeurs (Lecture rapport anomalies)
app.get('/api/events', (req, res) => {
    const logPath = path.join(__dirname, 'rapport_anomalies.txt');
    let events = [];
    if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').slice(-5).reverse(); // 5 derniers
        events = lines.map((line, i) => ({ id: i, text: line }));
    }
    res.json(events);
});

// 4. Action: Redémarrer un agent
app.post('/api/control/:agentId', (req, res) => {
    const { agentId } = req.params;
    const { action } = req.body;
    
    console.log(`Commande reçue : ${action} sur ${agentId}`);
    
    // Simulation d'action
    setTimeout(() => {
        res.json({ success: true, message: `Commande ${action} envoyée à ${agentId}` });
    }, 1000);
});

// 5. Interface de Chat Direct (Pour automatisation Android/External)
app.post('/api/chat', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    console.log(`📝 [API/CHAT] Prompt reçu: "${prompt}"`);
    
    try {
        // On utilise directement le ChiefAdvisor pour traiter la demande
        const response = await ChiefAdvisor.consult(prompt);
        res.json({ success: true, response: response, timestamp: Date.now() });
    } catch (e) {
        console.error('❌ [API/CHAT] Erreur:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. Dell Heartbeat (Remote Monitoring)
let dellStatus = {};
app.post('/api/heartbeat', (req, res) => {
    const { hostname, user, uptime, disk_free_gb, memory_gb, last_sync, timestamp } = req.body;
    
    console.log(`💓 [HEARTBEAT] Dell (${hostname}) checked in at ${timestamp}`);
    
    dellStatus = {
        hostname,
        user,
        uptime,
        disk_free_gb,
        memory_gb,
        last_sync,
        last_seen: timestamp
    };
    
    res.json({ success: true, message: 'Heartbeat received' });
});

app.get('/api/heartbeat', (req, res) => {
    res.json(dellStatus);
});

// Lancement du serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ Dashboard API Server running on port ${PORT}`);
    console.log(`📡 Accessible via http://YOUR_VPS_IP:${PORT}/api/chat`);
});
