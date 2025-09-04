#!/usr/bin/env node

/**
 * IoT Containment System - Documentation Server
 * Local development server for viewing generated documentation
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

class DocumentationServer {
    constructor(port = 8080, outputDir = '../output') {
        this.port = port;
        this.outputDir = path.resolve(__dirname, outputDir);
        this.mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.md': 'text/markdown',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
    }

    start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        server.listen(this.port, () => {
            console.log(`📚 Documentation Server Running!`);
            console.log(`🌐 URL: http://localhost:${this.port}`);
            console.log(`📁 Serving: ${this.outputDir}`);
            console.log(`\n🔗 Quick Links:`);
            console.log(`   • Documentation Portal: http://localhost:${this.port}`);
            console.log(`   • System Overview: http://localhost:${this.port}/system-overview.md`);
            console.log(`   • API Documentation: http://localhost:${this.port}/api-documentation.md`);
            console.log(`   • User Guide: http://localhost:${this.port}/user-guide.md`);
            console.log(`\n⚡ Press Ctrl+C to stop server`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${this.port} is already in use`);
                console.log(`💡 Try: npm run serve -- --port 8081`);
                process.exit(1);
            } else {
                console.error('❌ Server error:', err);
            }
        });
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        let pathname = parsedUrl.pathname;

        // Default to index.html
        if (pathname === '/') {
            pathname = '/index.html';
        }

        const filePath = path.join(this.outputDir, pathname);

        // Security check - prevent directory traversal
        if (!filePath.startsWith(this.outputDir)) {
            this.send404(res);
            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    this.send404(res, pathname);
                } else {
                    this.send500(res, err);
                }
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = this.mimeTypes[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            });

            res.end(data);
        });
    }

    send404(res, pathname = '') {
        const errorPage = `
<!DOCTYPE html>
<html>
<head>
    <title>404 - Documentation Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #e74c3c; font-size: 48px; margin-bottom: 20px; }
        .message { font-size: 18px; margin-bottom: 30px; }
        .links { font-size: 16px; }
        .links a { color: #3498db; text-decoration: none; margin: 0 10px; }
        .links a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="error">404</div>
    <div class="message">Documentation file not found: ${pathname}</div>
    <div class="links">
        <a href="/">← Back to Documentation Portal</a>
        <a href="/README.md">README</a>
        <a href="/system-overview.md">System Overview</a>
        <a href="/api-documentation.md">API Docs</a>
    </div>
</body>
</html>`;

        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(errorPage);
    }

    send500(res, error) {
        const errorPage = `
<!DOCTYPE html>
<html>
<head>
    <title>500 - Server Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #e74c3c; font-size: 48px; margin-bottom: 20px; }
        .message { font-size: 18px; }
    </style>
</head>
<body>
    <div class="error">500</div>
    <div class="message">Internal Server Error</div>
    <div class="details" style="margin-top: 20px; font-family: monospace; color: #666;">
        ${error.message}
    </div>
</body>
</html>`;

        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(errorPage);
    }
}

// CLI support
if (require.main === module) {
    const args = process.argv.slice(2);
    let port = 8080;

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--port' || args[i] === '-p') {
            port = parseInt(args[i + 1]) || 8080;
            i++; // skip next argument
        }
    }

    const server = new DocumentationServer(port);
    server.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down documentation server...');
        process.exit(0);
    });
}

module.exports = DocumentationServer;