#!/bin/bash
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
ls -la *.docx