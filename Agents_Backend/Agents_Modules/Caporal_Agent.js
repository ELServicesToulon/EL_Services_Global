/**
 * Caporal Agent - Dell Command Relay
 * 
 * This agent runs on the Dell, polls the VPS for commands,
 * and executes them locally using Gemini 3 Pro Preview intelligence.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axiosModule = require('./node_modules/axios');
const axios = axiosModule.default || axiosModule;
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');

const VPS_API = process.env.VPS_API_URL || 'http://37.59.124.82:3333';
const POLL_INTERVAL = 60000; // 1 minute
const API_KEY = process.env.GEMINI_API_KEY;

class CaporalAgent {
    constructor() {
        this.name = 'Caporal';
        this.genAI = new GoogleGenerativeAI(API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
        console.log(`🎖️ [CAPORAL] Initialized with Gemini 3 Pro Preview`);
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [CAPORAL] ${message}`);
    }

    async fetchOrders() {
        try {
            const response = await axios.get(`${VPS_API}/api/orders/dell`);
            return response.data.orders || [];
        } catch (e) {
            this.log(`⚠️ Could not reach VPS: ${e.message}`);
            return [];
        }
    }

    async executeOrder(order) {
        this.log(`📥 Received order: ${order.type} - ${order.payload}`);

        // Use Gemini to interpret and validate the order
        const prompt = `
            Tu es le Caporal, un agent d'exécution local sur une machine Windows (Dell).
            Tu as reçu l'ordre suivant du VPS central:
            Type: ${order.type}
            Payload: ${order.payload}
            
            Analyse cet ordre et retourne en JSON:
            {
                "safe": true/false,
                "command": "La commande PowerShell à exécuter (ou null si pas safe)",
                "reasoning": "Explication courte"
            }
            
            IMPORTANT: Ne retourne que le JSON, rien d'autre.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                this.log(`❌ Could not parse AI response`);
                return;
            }

            const analysis = JSON.parse(jsonMatch[0]);
            
            if (!analysis.safe) {
                this.log(`🛑 Order rejected (unsafe): ${analysis.reasoning}`);
                await this.reportExecution(order.id, 'rejected', analysis.reasoning);
                return;
            }

            this.log(`✅ Order approved. Executing: ${analysis.command}`);
            
            // Execute the command
            exec(analysis.command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`❌ Execution failed: ${error.message}`);
                    this.reportExecution(order.id, 'failed', error.message);
                } else {
                    this.log(`✅ Execution successful`);
                    this.reportExecution(order.id, 'completed', stdout || 'OK');
                }
            });

        } catch (e) {
            this.log(`❌ AI analysis failed: ${e.message}`);
        }
    }

    async reportExecution(orderId, status, details) {
        try {
            await axios.post(`${VPS_API}/api/orders/report`, {
                orderId,
                machine: 'Dell',
                status,
                details,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            this.log(`⚠️ Could not report to VPS: ${e.message}`);
        }
    }

    async run() {
        this.log(`🚀 Starting patrol...`);
        
        while (true) {
            const orders = await this.fetchOrders();
            
            if (orders.length > 0) {
                this.log(`📋 ${orders.length} order(s) pending`);
                for (const order of orders) {
                    await this.executeOrder(order);
                }
            } else {
                this.log(`💤 No orders. Standing by.`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
    }
}

// Auto-run
if (require.main === module) {
    const caporal = new CaporalAgent();
    caporal.run();
}

module.exports = CaporalAgent;
