# LLM Image Analysis Tool

A Node.js script that uses LM Studio to analyze images with local LLM models. Perfect for image description, text extraction, problem solving, and more.

## Features

- 🖼️ **Flexible Image Input**: Support for any image format
- 🤖 **Local LLM Processing**: Uses LM Studio for privacy and speed
- 💬 **Custom Prompts**: Ask specific questions about images
- 📊 **Formatted Output**: Clean, readable terminal output
- ⚡ **Command Line Interface**: Easy to use with various options

## Prerequisites

1. **LM Studio**: Make sure you have LM Studio installed and running
2. **Node.js**: Version 16 or higher
3. **Vision Model**: Ensure you have a vision-capable model loaded in LM Studio (like `google/gemma-3-12b`)

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
# Describe an image with default prompt (relative path)
node script.js images/image.png

# Use absolute path
node script.js /Users/phtran/Projects/llm_image/images/image.png

# Use a custom prompt
node script.js images/image.png -p "What text is written on this card?"

# Solve problems in images
node script.js images/math-problem.png -p "Solve this math problem step by step"
```

### Command Line Options

```bash
node script.js [options] [image-path]

Options:
  -i, --image <path>     Path to the image file
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

The script provides a clean, formatted output with:

- 🤖 **LLM Response**: The main analysis/answer
- 📊 **Model Info**: Performance metrics and model details
- ⏱️ **Response Time**: How long the model took to respond

## Use Cases

- **Image Description**: Get detailed descriptions of images
- **Text Extraction**: Extract text from images, receipts, documents
- **Problem Solving**: Solve math problems, puzzles, or logic questions
- **Object Recognition**: Identify and describe objects in images
- **Document Analysis**: Analyze charts, diagrams, and technical documents
- **Content Moderation**: Check images for inappropriate content

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
