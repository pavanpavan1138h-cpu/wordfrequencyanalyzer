const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
// Increase payload limit for large files
app.use(express.text({ limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

app.post('/api/analyze', (req, res) => {
    const text = req.body.text || '';
    
    // Write text to a unique temporary file
    const tmpFileName = `input_${crypto.randomBytes(8).toString('hex')}.txt`;
    const tmpFilePath = path.join(__dirname, 'input', tmpFileName);

    // Ensure input directory exists
    if (!fs.existsSync(path.join(__dirname, 'input'))) {
        fs.mkdirSync(path.join(__dirname, 'input'));
    }

    fs.writeFileSync(tmpFilePath, text);

    const methods = ['naive', 'hashing', 'dictionary'];
    const results = {};

    let completedCount = 0;
    let hasError = false;

    // Run all three methods
    methods.forEach(method => {
        const binPath = path.join(__dirname, method);
        
        const start = process.hrtime();
        
        execFile(binPath, [tmpFilePath], { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
            if (hasError) return;

            if (error) {
                console.error(`Error executing ${method}:`, error);
                hasError = true;
                if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
                return res.status(500).json({ error: `Failed to execute ${method}` });
            }

            const diff = process.hrtime(start);
            const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

            // Parse CSV stdout
            const data = [];
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const word = parts[0].trim();
                    const count = parseInt(parts[1], 10);
                    if (word && !isNaN(count)) {
                        data.push({ word, count });
                    }
                }
            }

            // Sort data by count descending
            data.sort((a, b) => b.count - a.count);

            results[method] = {
                time: executionTimeMs,
                data: data
            };

            completedCount++;
            if (completedCount === methods.length) {
                // All methods finished
                if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
                res.json(results);
            }
        });
    });
});

app.listen(port, () => {
    console.log(`C Backend API listening at http://localhost:${port}`);
});
