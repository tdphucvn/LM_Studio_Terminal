# LLM Image Analysis Tool

A Node.js script that uses LM Studio to analyze images with local LLM models. Perfect for image description, text extraction, problem solving, and more.

## Features

- 🖼️ **Flexible Image Input**: Support for any image format with absolute or relative paths
- 📄 **File Input**: Include text files in your prompts for document analysis
- 💬 **Text-Only Mode**: Have conversations without images or files
- 🤖 **Local LLM Processing**: Uses LM Studio for privacy and speed
- ⚡ **Progress Indicator**: Visual feedback during response generation
- 📊 **Clean Output**: Minimal, focused output without verbose logging
- 🔧 **Command Line Interface**: Easy to use with various options

## Prerequisites

1. **LM Studio**: Make sure you have LM Studio installed and running
2. **Node.js**: Version 16 or higher
3. **Vision Model**: Ensure you have a vision-capable model loaded in LM Studio (like `google/gemma-3-12b`)

## Installation

```bash
npm install
```

## Quick Start

```bash
# Show help
npm run help

# Start a text conversation
npm run chat "Your question here"

# Analyze an image
npm run image path/to/image.png

# Analyze a file
npm run file path/to/file.txt
```

## Usage

### Basic Usage

```bash
# Using npm scripts (recommended)
npm run chat "Explain quantum computing in simple terms"
npm run image path/to/image.png
npm run file document.txt

# Using node directly
node script.js images/image.png
node script.js -p "Explain quantum computing in simple terms"
node script.js -f document.txt -p "Summarize this document"
node script.js -i screenshot.png -f context.txt -p "Analyze this screenshot with the provided context"
```

### Available NPM Scripts

```bash
npm run start          # Run the script (same as node script.js)
npm run analyze        # Alias for start
npm run help           # Show help and usage information
npm run chat <prompt>  # Start a text conversation
npm run image <path>   # Analyze an image (add -p for custom prompt)
npm run file <path>    # Analyze a file (add -p for custom prompt)
```

### Command Line Options

```bash
node script.js [options] [input]

Options:
  -i, --image <path>     Path to the image file
  -f, --file <path>      Path to a text file to include in the prompt
  -p, --prompt <text>    Custom prompt for the LLM
  -m, --model <name>     LLM model to use (default: "google/gemma-3-12b")
  -h, --help            Show help message
```

### Examples

```bash
# Extract text from an image (absolute path)
node script.js /path/to/receipt.png -p "Extract all the text and numbers from this receipt"

# Analyze a diagram (relative path)
node script.js diagram.png -p "Explain what this diagram shows and how it works"

# Identify objects (absolute path)
node script.js /Users/username/Desktop/photo.jpg -p "List all the objects you can see in this image"

# Solve a puzzle (relative path)
node script.js puzzle.png -p "What is the solution to this puzzle?"
```

## Output Format

The script provides a clean, minimal output:

- ⚡ **Progress Indicator**: Animated spinner during response generation
- 🤖 **LLM Response**: The main analysis/answer (clean and focused)
- 📊 **No Verbose Logging**: Removed model info and performance metrics for cleaner output

## Use Cases

- **Image Analysis**: Get detailed descriptions, extract text, solve problems in images
- **Document Analysis**: Summarize, review, and analyze text documents
- **Code Review**: Analyze code files and suggest improvements
- **Text-Only Conversations**: Have general conversations without images or files
- **Combined Analysis**: Use images with context files for enhanced analysis
- **Content Creation**: Generate content based on file inputs
- **Problem Solving**: Solve math problems, puzzles, or logic questions

## Troubleshooting

1. **Module Warning**: The script now includes `"type": "module"` in package.json to fix ES module warnings
2. **Image Not Found**: Make sure the image path is correct and the file exists
3. **Model Not Available**: Ensure your chosen model is loaded in LM Studio
4. **LM Studio Not Running**: Start LM Studio before running the script

## Future Enhancements

- Batch processing of multiple images
- Output to file options
- Different output formats (JSON, markdown)
- Integration with other vision models
- Web interface
