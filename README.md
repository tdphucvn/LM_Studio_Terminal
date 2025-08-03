# LLM Image Analysis Tool

A Node.js script that uses LM Studio to analyze images with local LLM models. Perfect for image description, text extraction, problem solving, and more.

## Features

- 🖼️ **Flexible Image Input**: Support for any image format with absolute or relative paths
- 📄 **File Input**: Include text files in your prompts for document analysis
- 💬 **Text-Only Mode**: Have conversations without images or files
- 🤖 **Local LLM Processing**: Uses LM Studio for privacy and speed
- 🚀 **Server Mode**: Run as a persistent server for faster responses
- 🧠 **Smart Model Selection**: Automatic validation of model capabilities
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
# Start the server with a specific model (loads only one model)
npm run server:qwen    # Start with Qwen (good reasoning)
npm run server:gemma   # Start with Gemma (supports images)

# In another terminal, use the client
npm run client -- -p "Your question here"
npm run client -- -i image.png -p "What do you see?"
npm run client -- -f document.txt -p "Summarize this"
```

## Usage

### Basic Usage

```bash
# Using npm scripts (note the -- flag to pass arguments)
npm run qwen -- -p "Explain quantum computing in simple terms"
npm run gemma -- -i path/to/image.png
npm run client -- -f document.txt -p "Summarize this document"

# Using node directly (no -- flag needed)
node client.js -p "Explain quantum computing in simple terms"
node client.js -i screenshot.png -f context.txt -p "Analyze this screenshot with the provided context"
```

**Note**: When using npm scripts, you must include `--` before your arguments to pass them to the underlying command. This is required because npm treats arguments after the script name as arguments to npm itself, not to the script.

### Available NPM Scripts

#### Server Mode (Recommended)

```bash
# Server commands
npm run server         # Start server with default model (Gemma)
npm run server:qwen    # Start server with Qwen model
npm run server:gemma   # Start server with Gemma model
npm run serve          # Alias for server

# Client commands
npm run client         # Use the client to send requests to server
npm run request        # Alias for client
npm run qwen           # Use Qwen model (good reasoning, no images)
npm run gemma          # Use Gemma model (supports images)
npm run unload         # Unload current model
npm run load:qwen      # Load Qwen model
npm run load:gemma     # Load Gemma model
npm run help           # Show help and usage information
```

### Command Line Options

```bash
node client.js [options] [input]

Options:
  -i, --image <path>     Path to the image file
  -f, --file <path>      Path to a text file to include in the prompt
  -p, --prompt <text>    Custom prompt for the LLM
  -m, --model <name>     LLM model to use (default: "google/gemma-3-12b")
  -s, --server <url>     Server URL (default: "http://localhost:3000")
  -o, --output <path>    Save output to markdown file
  -h, --help            Show help message
```

### Examples

```bash
# Text conversation with Qwen (better reasoning)
npm run client -- -m qwen/qwen3-14b -p "Explain quantum computing"

# Image analysis with Gemma
npm run client -- -m google/gemma-3-12b -i image.png -p "What do you see?"

# File analysis with Qwen
npm run client -- -m qwen/qwen3-14b -f document.txt -p "Summarize this"

# Combined analysis
npm run client -- -m google/gemma-3-12b -i screenshot.png -f context.txt -p "Analyze with context"

# Save output to markdown file
npm run client -- -i image.png -p "What do you see?" -o outputs/analysis.md
```

### API Endpoints

```bash
# Check server status
curl http://localhost:3000

# Load a specific model
curl -X POST http://localhost:3000 -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "qwen/qwen3-14b"}'

# Unload current model
curl -X POST http://localhost:3000 -H "Content-Type: application/json" \
  -d '{"action": "unload"}'

# Process a request
curl -X POST http://localhost:3000 -H "Content-Type: application/json" \
  -d '{"model": "qwen/qwen3-14b", "prompt": "Hello", "file": "document.txt"}'
```

## Output Format

The script provides a clean, minimal output:

- ⚡ **Progress Indicator**: Animated spinner during response generation
- 🤖 **LLM Response**: The main analysis/answer (clean and focused)
- 📊 **No Verbose Logging**: Removed model info and performance metrics for cleaner output

### Markdown Output

When using the `-o` or `--output` option, the script saves a formatted markdown file with:

- 📅 **Metadata**: Generation timestamp, model used, and input details
- 📝 **Input Section**: Shows the prompt, image path, and/or file path used
- 📋 **Analysis Section**: The complete LLM response with proper formatting
- 🏷️ **Footer**: Model attribution and generation info

Example markdown structure:

```markdown
# LLM Analysis Report

**Generated:** 8/3/2025, 2:28:53 PM
**Model:** Gemma 3 12B
**Timestamp:** 2025-08-03T12-28-53-294Z

## Input

**Prompt:** What is on this image?
**Image:** `/path/to/image.png`

## Analysis

[LLM response content here]

---

_Generated by Gemma 3 12B_
```

## Available Models

### Qwen 3 14B (`qwen/qwen3-14b`)

- ✅ **Excellent reasoning capabilities**
- ✅ **Great for text analysis and conversations**
- ✅ **Supports file analysis**
- ❌ **No image support**
- 🎯 **Best for**: Complex reasoning, text analysis, code review

### Gemma 3 12B (`google/gemma-3-12b`)

- ✅ **Full image and vision support**
- ✅ **Good for image analysis and description**
- ✅ **Basic text processing**
- ⚠️ **Limited reasoning capabilities**
- 🎯 **Best for**: Image analysis, visual tasks, basic text

## Use Cases

- **Image Analysis**: Use Gemma for detailed descriptions, text extraction from images
- **Document Analysis**: Use Qwen for summarizing, reviewing, and analyzing text documents
- **Code Review**: Use Qwen for analyzing code files and suggesting improvements
- **Text-Only Conversations**: Use Qwen for general conversations and complex reasoning
- **Combined Analysis**: Use Gemma with images + Qwen for text analysis
- **Content Creation**: Use Qwen for generating content based on file inputs
- **Problem Solving**: Use Qwen for solving math problems, puzzles, or logic questions

## Architecture

The server loads only one model at a time and can switch between models on demand:

```
┌─────────────┐    HTTP POST    ┌─────────────┐
│   Client    │ ──────────────► │   Server    │
│             │                 │             │
│ npm run     │ ◄────────────── │ Single      │
│ client      │    JSON Response│ Model       │
└─────────────┘                 └─────────────┘
```

### Model Management

- **Single Model Loading**: Only one model loaded at a time (saves memory)
- **Dynamic Switching**: Switch models via API calls or npm scripts
- **Manual Unloading**: Unload models manually with `npm run unload`
- **Graceful Shutdown**: Models are properly unloaded when stopping the server
- **Garbage Collection**: Enhanced memory cleanup with forced GC
- **Automatic Loading**: Models load automatically when requested

## Troubleshooting

1. **Module Warning**: The script now includes `"type": "module"` in package.json to fix ES module warnings
2. **Image Not Found**: Make sure the image path is correct and the file exists
3. **Model Not Available**: Ensure your chosen model is loaded in LM Studio
4. **LM Studio Not Running**: Start LM Studio before running the script
5. **Server Not Running**: Use `npm run server` to start the server before using the client
6. **Model Validation Error**: Use the correct model for your task (Qwen for text, Gemma for images)

## Future Enhancements

- Batch processing of multiple images
- Output to file options
- Different output formats (JSON, markdown)
- Integration with other vision models
- Web interface
