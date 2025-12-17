const fs = require("fs");
const path = require("path");

const stripComments = (code) => {
  // Remove HTML/EJS comments
  let result = code.replace(/<!--[\s\S]*?-->/g, "");
  // Remove JS block comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove JS single-line comments
  result = result.replace(/(^|\s)\/\/[^\n\r]*/g, (match, prefix) =>
    prefix === "\n" || prefix === "\r" ? prefix : prefix
  );
  return result;
};

const files = process.argv.slice(2);

if (!files.length) {
  console.error("No files provided.");
  process.exit(1);
}

for (const file of files) {
  const filePath = path.resolve(file);
  try {
    const original = fs.readFileSync(filePath, "utf8");
    const stripped = stripComments(original);
    fs.writeFileSync(filePath, stripped, "utf8");
    console.log(`Stripped comments from: ${file}`);
  } catch (err) {
    console.error(`Failed to process ${file}:`, err.message);
  }
}


