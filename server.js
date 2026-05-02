const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const crypto = require('crypto');

const port = process.env.PORT || 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/analyze') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            const text = body || '';
            
            // Write text to a unique temporary file
            const tmpFileName = `input_${crypto.randomBytes(8).toString('hex')}.txt`;
            const tmpFilePath = path.join(__dirname, 'input', tmpFileName);

            if (!fs.existsSync(path.join(__dirname, 'input'))) {
                fs.mkdirSync(path.join(__dirname, 'input'));
            }

            fs.writeFileSync(tmpFilePath, text);

            const methods = ['naive', 'hashing', 'dictionary'];
            const results = {};

            let completedCount = 0;
            let hasError = false;

            methods.forEach(method => {
                const binPath = path.join(__dirname, method);
                const start = process.hrtime();
                
                execFile(binPath, [tmpFilePath], { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
                    if (hasError) return;

                    if (error) {
                        console.error(`Error executing ${method}:`, error);
                        hasError = true;
                        if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: `Failed to execute ${method}` }));
                        return;
                    }

                    const diff = process.hrtime(start);
                    const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

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

                    data.sort((a, b) => b.count - a.count);

                    results[method] = {
                        time: executionTimeMs,
                        data: data
                    };

                    completedCount++;
                    if (completedCount === methods.length) {
                        if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(results));
                    }
                });
            });
        });
        return;
    }

    // Static file serving
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log(`Zero-dependency C Backend API listening at http://localhost:${port}`);
});
