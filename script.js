import { LMStudioClient } from "@lmstudio/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readFileSync } from "fs";

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    imagePath: null,
    filePath: null,
    prompt: "Describe this image in detail. What do you see?",
    model: "google/gemma-3-12b",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--image":
      case "-i":
        options.imagePath = args[++i];
        break;
      case "--file":
      case "-f":
        options.filePath = args[++i];
        break;
      case "--prompt":
      case "-p":
        options.prompt = args[++i];
        break;
      case "--model":
      case "-m":
        options.model = args[++i];
        break;
      case "--help":
      case "-h":
        showHelp();
        process.exit(0);
      default:
        if (!options.imagePath && !options.filePath) {
          // If no specific flag, assume it's an image path for backward compatibility
          options.imagePath = args[i];
        }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Usage: node script.js [options] [input]

Options:
  -i, --image <path>     Path to the image file
  -f, --file <path>      Path to a text file to include in the prompt
  -p, --prompt <text>    Custom prompt for the LLM
  -m, --model <name>     LLM model to use (default: "google/gemma-3-12b")
  -h, --help            Show this help message

Examples:
  # Image analysis
  node script.js images/image.png
  node script.js -i images/image.png -p "What text is written on this card?"
  
  # Text-only conversation
  node script.js -p "Explain quantum computing in simple terms"
  
  # File analysis
  node script.js -f document.txt -p "Summarize this document"
  node script.js -f code.js -p "Review this code and suggest improvements"
  
  # Combined input
  node script.js -i screenshot.png -f context.txt -p "Analyze this screenshot with the provided context"
`);
}

function formatOutput(prediction) {
  // Extract the main content
  const content =
    prediction.content ||
    prediction.nonReasoningContent ||
    "No content available";

  // Clean up the content and format it nicely
  const formattedContent = content
    .replace(/^\s*Here's a description of the image you sent:\s*\n*/i, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();

  console.log(formattedContent);
}

function showProgress() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${frames[i]} Generating response...`);
    i = (i + 1) % frames.length;
  }, 80);

  return () => {
    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(50) + "\r"); // Clear the line
  };
}

async function main() {
  try {
    const options = parseArguments();

    // Validate that we have some input
    if (!options.imagePath && !options.filePath && !options.prompt) {
      console.error(
        "❌ Error: At least one input is required (image, file, or prompt)"
      );
      console.log("Use --help for usage information");
      process.exit(1);
    }

    // Initialize client
    const client = new LMStudioClient();
    const model = await client.llm.model(options.model);

    // Prepare the message content
    let messageContent = options.prompt || "";
    let images = [];

    // Add file content if provided
    if (options.filePath) {
      if (!existsSync(options.filePath)) {
        console.error(`❌ Error: File not found: ${options.filePath}`);
        process.exit(1);
      }

      try {
        const fileContent = readFileSync(options.filePath, "utf8");
        messageContent = `File content:\n\n${fileContent}\n\n${messageContent}`;
      } catch (error) {
        console.error(`❌ Error reading file: ${error.message}`);
        process.exit(1);
      }
    }

    // Add image if provided
    if (options.imagePath) {
      if (!existsSync(options.imagePath)) {
        console.error(`❌ Error: Image file not found: ${options.imagePath}`);
        process.exit(1);
      }

      const image = await client.files.prepareImage(options.imagePath);
      images.push(image);
    }

    // Show progress indicator
    const stopProgress = showProgress();

    // Send the request
    const prediction = await model.respond([
      { role: "user", content: messageContent, images: images },
    ]);

    // Stop progress indicator and show result
    stopProgress();
    formatOutput(prediction);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
