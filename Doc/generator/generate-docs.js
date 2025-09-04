#!/usr/bin/env node

/**
 * IoT Containment System - Documentation Generator
 * Main entry point for generating comprehensive system documentation
 */

const fs = require('fs').promises;
const path = require('path');
const CodebaseAnalyzer = require('./codebase-analyzer');
const TemplateGenerator = require('./template-generator');

class DocumentationGenerator {
    constructor() {
        this.rootPath = path.resolve(__dirname, '../../');
        this.outputPath = path.resolve(__dirname, '../output');
        this.analyzer = new CodebaseAnalyzer(this.rootPath);
        this.templateGenerator = new TemplateGenerator();
        
        this.startTime = Date.now();
    }

    async generate() {
        console.log('🚀 Starting IoT Containment System Documentation Generation...');
        console.log('📁 Root Path:', this.rootPath);
        console.log('📄 Output Path:', this.outputPath);
        
        try {
            // Ensure output directory exists
            await this.ensureOutputDirectory();
            
            // Step 1: Analyze codebase
            console.log('\n📊 Step 1: Analyzing Codebase...');
            const analysis = await this.analyzer.analyze();
            
            // Step 2: Save analysis
            console.log('\n💾 Step 2: Saving Analysis...');
            await this.analyzer.saveAnalysis(this.outputPath);
            
            // Step 3: Generate documentation templates
            console.log('\n📝 Step 3: Generating Documentation...');
            await this.templateGenerator.generateAll(analysis, this.outputPath);
            
            // Step 4: Generate additional files
            console.log('\n🔧 Step 4: Creating Additional Resources...');
            await this.generatePackageJson();
            await this.generateDocIndex(analysis);
            await this.generateWordDocuments(analysis);
            
            // Step 5: Summary
            await this.generateSummary(analysis);
            
            const endTime = Date.now();
            const duration = ((endTime - this.startTime) / 1000).toFixed(2);
            
            console.log('\n✅ Documentation Generation Complete!');
            console.log(`⏱️  Total Time: ${duration}s`);
            console.log(`📁 Output Location: ${this.outputPath}`);
            console.log('\n📋 Generated Files:');
            await this.listGeneratedFiles();
            
        } catch (error) {
            console.error('\n❌ Documentation Generation Failed!');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            process.exit(1);
        }
    }

    async ensureOutputDirectory() {
        try {
            await fs.mkdir(this.outputPath, { recursive: true });
            
            // Create subdirectories
            await fs.mkdir(path.join(this.outputPath, 'images'), { recursive: true });
            await fs.mkdir(path.join(this.outputPath, 'word'), { recursive: true });
            await fs.mkdir(path.join(this.outputPath, 'pdf'), { recursive: true });
            
        } catch (error) {
            console.error('Error creating output directory:', error.message);
            throw error;
        }
    }

    async generatePackageJson() {
        const packageJson = {
            name: "iot-containment-docs",
            version: "1.0.0",
            description: "Generated documentation for IoT Containment Monitoring System",
            scripts: {
                "serve": "http-server . -p 8080",
                "generate": "node ../generator/generate-docs.js",
                "convert-to-pdf": "markdown-pdf *.md",
                "convert-to-word": "pandoc -f markdown -t docx -o documentation.docx *.md"
            },
            devDependencies: {
                "http-server": "^14.1.1",
                "markdown-pdf": "^11.0.0",
                "pandoc": "^0.2.1"
            },
            keywords: ["documentation", "iot", "monitoring", "api", "user-guide"],
            author: "IoT Containment System Team",
            license: "MIT",
            generated: new Date().toISOString()
        };

        await fs.writeFile(
            path.join(this.outputPath, 'package.json'),
            JSON.stringify(packageJson, null, 2),
            'utf8'
        );
        
        console.log('✅ Generated: package.json');
    }

    async generateDocIndex(analysis) {
        const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${analysis.overview.projectName} - Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            font-size: 1.2em;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-card h3 {
            margin: 0 0 10px 0;
            font-size: 2em;
        }
        .doc-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }
        .doc-card {
            border: 1px solid #e1e5e9;
            border-radius: 10px;
            padding: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .doc-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .doc-card h3 {
            color: #667eea;
            margin-top: 0;
        }
        .doc-card a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        .doc-card a:hover {
            text-decoration: underline;
        }
        .tech-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 20px 0;
        }
        .tech-badge {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            color: #495057;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e1e5e9;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${analysis.overview.projectName}</h1>
            <p>${analysis.overview.description}</p>
            <p><strong>Version:</strong> ${analysis.overview.version} | <strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <h3>${analysis.frontend.pages.length}</h3>
                <p>Frontend Pages</p>
            </div>
            <div class="stat-card">
                <h3>${analysis.apiEndpoints.length}</h3>
                <p>API Endpoints</p>
            </div>
            <div class="stat-card">
                <h3>${analysis.backend.controllers.length}</h3>
                <p>Controllers</p>
            </div>
            <div class="stat-card">
                <h3>${analysis.database.models.length}</h3>
                <p>Database Models</p>
            </div>
            <div class="stat-card">
                <h3>${analysis.features.length}</h3>
                <p>Core Features</p>
            </div>
        </div>

        <div class="tech-stack">
            <div class="tech-badge">Next.js 14</div>
            <div class="tech-badge">TypeScript</div>
            <div class="tech-badge">.NET 9</div>
            <div class="tech-badge">Entity Framework Core</div>
            <div class="tech-badge">SQLite</div>
            <div class="tech-badge">MQTT</div>
            <div class="tech-badge">JWT Authentication</div>
            <div class="tech-badge">Tailwind CSS</div>
            <div class="tech-badge">Radix UI</div>
        </div>

        <div class="doc-grid">
            <div class="doc-card">
                <h3>📋 System Overview</h3>
                <p>Complete system architecture, technology stack, and feature overview.</p>
                <a href="system-overview.md">📖 Read Documentation</a>
            </div>
            
            <div class="doc-card">
                <h3>📡 API Documentation</h3>
                <p>Comprehensive API reference with endpoints, examples, and authentication.</p>
                <a href="api-documentation.md">🔗 View API Docs</a>
            </div>
            
            <div class="doc-card">
                <h3>👤 User Guide</h3>
                <p>Step-by-step user manual for all system features and functionality.</p>
                <a href="user-guide.md">👥 User Manual</a>
            </div>
            
            <div class="doc-card">
                <h3>💻 Developer Guide</h3>
                <p>Development setup, code standards, and contribution guidelines.</p>
                <a href="developer-guide.md">⚡ Dev Guide</a>
            </div>
            
            <div class="doc-card">
                <h3>🚀 Deployment Guide</h3>
                <p>Production deployment instructions and configuration details.</p>
                <a href="deployment-guide.md">🏭 Deploy Guide</a>
            </div>
            
            <div class="doc-card">
                <h3>🏗️ Architecture Document</h3>
                <p>Detailed system architecture and design patterns documentation.</p>
                <a href="architecture-document.md">🏛️ Architecture</a>
            </div>
            
            <div class="doc-card">
                <h3>📋 Feature Specification</h3>
                <p>Detailed feature requirements, user stories, and acceptance criteria.</p>
                <a href="feature-specification.md">✨ Features</a>
            </div>
            
            <div class="doc-card">
                <h3>🔐 Security Documentation</h3>
                <p>Security architecture, authentication, and data protection measures.</p>
                <a href="security-documentation.md">🛡️ Security</a>
            </div>
        </div>

        <div class="footer">
            <p>📅 Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>🔧 Generated by IoT Containment System Documentation Generator</p>
            <p>
                <a href="README.md">📖 README</a> | 
                <a href="CHANGELOG.md">📋 Changelog</a> | 
                <a href="codebase-analysis.json">🔍 Raw Analysis</a>
            </p>
        </div>
    </div>
</body>
</html>`;

        await fs.writeFile(
            path.join(this.outputPath, 'index.html'),
            indexContent,
            'utf8'
        );
        
        console.log('✅ Generated: index.html (documentation portal)');
    }

    async generateWordDocuments(analysis) {
        // Create Word-compatible markdown with enhanced formatting
        const wordContent = `# ${analysis.overview.projectName} - Complete Documentation

**Version:** ${analysis.overview.version}  
**Generated:** ${new Date().toLocaleDateString()}  
**Document Type:** Complete System Documentation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [API Documentation](#api-documentation)  
3. [User Guide](#user-guide)
4. [Developer Guide](#developer-guide)
5. [Deployment Guide](#deployment-guide)
6. [Architecture Document](#architecture-document)
7. [Feature Specification](#feature-specification)
8. [Security Documentation](#security-documentation)

---

## System Overview

${analysis.overview.description}

### Technology Stack

**Frontend Technologies:**
- Framework: ${analysis.overview.technologies.frontend.framework}
- Language: ${analysis.overview.technologies.frontend.language}
- Styling: ${analysis.overview.technologies.frontend.styling}
- UI Components: ${analysis.overview.technologies.frontend.ui}

**Backend Technologies:**
- Framework: ${analysis.overview.technologies.backend.framework}
- Language: ${analysis.overview.technologies.backend.language}
- Database: ${analysis.overview.technologies.backend.database}
- Authentication: ${analysis.overview.technologies.backend.authentication}

### Core Features

${analysis.features.map((feature, index) => `${index + 1}. **${feature.name}** - ${feature.description}`).join('\n')}

### System Statistics

- **Total Frontend Pages:** ${analysis.frontend.pages.length}
- **Total API Endpoints:** ${analysis.apiEndpoints.length}
- **Backend Controllers:** ${analysis.backend.controllers.length}
- **Database Models:** ${analysis.database.models.length}
- **Core Features:** ${analysis.features.length}

---

## Quick Reference

### Development Setup
\`\`\`bash
# Frontend
cd Frontend
npm install && npm run dev

# Backend  
cd Backend
dotnet restore && dotnet run
\`\`\`

### Production URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Documentation: http://localhost:8080

### User Roles
- **User (Level 1):** Basic monitoring access
- **Developer (Level 2):** Advanced features + access control
- **Admin (Level 3):** Full system administration

---

*This document was automatically generated from the codebase analysis. For the most up-to-date information, please refer to the individual documentation files.*`;

        await fs.writeFile(
            path.join(this.outputPath, 'word', 'complete-documentation.md'),
            wordContent,
            'utf8'
        );

        // Create conversion script
        const conversionScript = `#!/bin/bash
# Word Document Conversion Script

echo "Converting documentation to Word format..."

# Install pandoc if not available (Linux/Mac)
if ! command -v pandoc &> /dev/null; then
    echo "Installing pandoc..."
    # Linux
    if command -v apt-get &> /dev/null; then
        sudo apt-get install pandoc
    # Mac
    elif command -v brew &> /dev/null; then
        brew install pandoc
    else
        echo "Please install pandoc manually: https://pandoc.org/installing.html"
        exit 1
    fi
fi

# Convert main documentation
pandoc complete-documentation.md -f markdown -t docx -o "IoT_Containment_System_Documentation.docx"

# Convert individual files
pandoc ../system-overview.md -f markdown -t docx -o "01_System_Overview.docx"
pandoc ../api-documentation.md -f markdown -t docx -o "02_API_Documentation.docx"
pandoc ../user-guide.md -f markdown -t docx -o "03_User_Guide.docx"
pandoc ../developer-guide.md -f markdown -t docx -o "04_Developer_Guide.docx"
pandoc ../deployment-guide.md -f markdown -t docx -o "05_Deployment_Guide.docx"

echo "✅ Word documents generated successfully!"
echo "📁 Location: $(pwd)"
ls -la *.docx`;

        await fs.writeFile(
            path.join(this.outputPath, 'word', 'convert-to-word.sh'),
            conversionScript,
            'utf8'
        );

        console.log('✅ Generated: Word conversion files');
    }

    async generateSummary(analysis) {
        const summary = {
            generationInfo: {
                timestamp: new Date().toISOString(),
                duration: `${((Date.now() - this.startTime) / 1000).toFixed(2)}s`,
                version: analysis.overview.version
            },
            statistics: {
                totalFiles: {
                    frontendPages: analysis.frontend.pages.length,
                    backendControllers: analysis.backend.controllers.length,
                    databaseModels: analysis.database.models.length,
                    apiEndpoints: analysis.apiEndpoints.length,
                    coreFeatures: analysis.features.length
                },
                documentation: {
                    markdownFiles: 10,
                    htmlFiles: 1,
                    configFiles: 2,
                    analysisFiles: 1
                }
            },
            features: analysis.features.map(f => ({
                name: f.name,
                description: f.description,
                pages: f.pages?.length || 0,
                controllers: f.controllers?.length || 0
            })),
            technologies: analysis.overview.technologies,
            nextSteps: [
                "Review generated documentation for accuracy",
                "Customize documentation to match company branding",
                "Set up automated documentation updates",
                "Deploy documentation portal to production",
                "Train team members on documentation usage"
            ]
        };

        await fs.writeFile(
            path.join(this.outputPath, 'generation-summary.json'),
            JSON.stringify(summary, null, 2),
            'utf8'
        );

        console.log('\n📋 Generation Summary:');
        console.log(`  📊 Frontend Pages: ${summary.statistics.totalFiles.frontendPages}`);
        console.log(`  🔌 API Endpoints: ${summary.statistics.totalFiles.apiEndpoints}`);
        console.log(`  🏗️  Controllers: ${summary.statistics.totalFiles.backendControllers}`);
        console.log(`  🗃️  Database Models: ${summary.statistics.totalFiles.databaseModels}`);
        console.log(`  ✨ Core Features: ${summary.statistics.totalFiles.coreFeatures}`);
    }

    async listGeneratedFiles() {
        try {
            const files = await fs.readdir(this.outputPath);
            
            const fileTypes = {
                documentation: files.filter(f => f.endsWith('.md')),
                web: files.filter(f => f.endsWith('.html')),
                config: files.filter(f => f.endsWith('.json')),
                scripts: files.filter(f => f.endsWith('.sh') || f.endsWith('.js'))
            };

            console.log(`📝 Documentation Files: ${fileTypes.documentation.length}`);
            fileTypes.documentation.forEach(file => console.log(`   • ${file}`));
            
            console.log(`🌐 Web Files: ${fileTypes.web.length}`);
            fileTypes.web.forEach(file => console.log(`   • ${file}`));
            
            console.log(`⚙️  Configuration Files: ${fileTypes.config.length}`);
            fileTypes.config.forEach(file => console.log(`   • ${file}`));

        } catch (error) {
            console.log('Could not list files:', error.message);
        }
    }
}

// Main execution
async function main() {
    const generator = new DocumentationGenerator();
    await generator.generate();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = DocumentationGenerator;