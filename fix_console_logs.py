#!/usr/bin/env python3
"""
Batch fix console.log statements in EventNexus codebase
Replaces console.* with logger.* calls
"""

import re
import os
from pathlib import Path

# Files to process by priority (security-critical first)
FILES_TO_PROCESS = [
    "src/services/geminiService.ts",
    "src/App.tsx",
    "src/services/dbService.ts",
]

def ensure_logger_import(content: str, file_path: str) -> str:
    """Ensure logger import exists at the top of the file"""
    
    # Check if logger import already exists
    if "import logger from" in content and "logger" in content:
        return content
    
    # Find the first import statement
    import_pattern = r"^import\s+.*?from\s+['\"]"
    match = re.search(import_pattern, content, re.MULTILINE)
    
    if match:
        # Insert logger import after first import
        insert_pos = match.start()
        # Find end of that line
        newline_pos = content.find('\n', insert_pos)
        insert_pos = newline_pos + 1
        
        # Determine correct relative path based on file location
        depth = file_path.count('/')
        relative_path = "../" * (depth - 1) + "utils/logger"
        
        logger_import = f"import logger from '{relative_path}';\n"
        return content[:insert_pos] + logger_import + content[insert_pos:]
    else:
        # No imports found, add at top
        relative_path = "../" * (file_path.count('/') - 1) + "utils/logger"
        logger_import = f"import logger from '{relative_path}';\n\n"
        return logger_import + content

def fix_console_logs(file_path: str) -> tuple[int, int]:
    """Fix console.* statements in a file. Returns (replaced_count, file_size)"""
    
    full_path = Path(file_path)
    if not full_path.exists():
        print(f"❌ File not found: {file_path}")
        return 0, 0
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_size = len(content)
    replaced_count = 0
    
    # Replacement patterns (order matters - error first, then others)
    patterns = [
        # console.error → logger.error
        (r'console\.error\(', 'logger.error('),
        # console.warn → logger.warn
        (r'console\.warn\(', 'logger.warn('),
        # console.log → logger.log
        (r'console\.log\(', 'logger.log('),
    ]
    
    for old_pattern, new_text in patterns:
        new_content, count = re.subn(old_pattern, new_text, content)
        if count > 0:
            print(f"  ✓ {new_text}: {count} replacements")
            replaced_count += count
            content = new_content
    
    # Ensure logger import
    if replaced_count > 0:
        content = ensure_logger_import(content, file_path)
    
    # Write back if changes made
    if replaced_count > 0:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {file_path}: {replaced_count} replacements")
        return replaced_count, original_size
    else:
        print(f"⊘ {file_path}: No console statements found")
        return 0, original_size

def main():
    print("🔄 Fixing console.log statements...\n")
    
    total_replaced = 0
    for file_path in FILES_TO_PROCESS:
        print(f"Processing: {file_path}")
        replaced, size = fix_console_logs(file_path)
        total_replaced += replaced
        print()
    
    print(f"✅ Total console statements fixed: {total_replaced}")
    print("\n📋 Next steps:")
    print("1. Run: npm run build")
    print("2. Check for any TypeScript errors")
    print("3. Test application functionality")

if __name__ == "__main__":
    main()
