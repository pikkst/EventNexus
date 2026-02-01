#!/usr/bin/env python3
"""
Remove console.* statements from TypeScript/TSX files
Replaces with logger.* calls and adds logger import if missing
"""

import os
import re
from pathlib import Path

# Files to process (by priority - highest security risk first)
CRITICAL_FILES = [
    "src/services/geminiService.ts",
    "src/services/dbService.ts", 
    "src/App.tsx",
    "src/services/supabase.ts",
]

PATTERN_REPLACEMENTS = [
    (r'console\.error\((.*?)\)', r'logger.error(\1'),
    (r'console\.warn\((.*?)\)', r'logger.warn(\1'),
    (r'console\.log\((.*?)\)', r'logger.log(\1'),
    (r'console\.debug\((.*?)\)', r'logger.debug(\1'),
]

def add_logger_import(content: str) -> str:
    """Add logger import if not present"""
    if "import logger from" in content:
        return content
    
    # Find the first import statement
    match = re.search(r"(import\s+.*?from\s+['\"].*?['\"];?)\n", content)
    if match:
        import_line = match.group(1)
        logger_import = "import logger from '../utils/logger';"
        # Insert logger import after first import
        return content.replace(import_line, import_line + f"\n{logger_import}", 1)
    
    return content

def process_file(filepath: str) -> tuple[int, int]:
    """
    Process a single file to replace console.* with logger.*
    Returns (lines_processed, replacements_made)
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements_count = 0
        
        # Apply all replacements
        for pattern, replacement in PATTERN_REPLACEMENTS:
            matches = len(re.findall(pattern, content))
            if matches > 0:
                content = re.sub(pattern, replacement, content)
                replacements_count += matches
        
        # Add logger import if replacements were made
        if replacements_count > 0:
            content = add_logger_import(content)
        
        # Write back if changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return (len(content.split('\n')), replacements_count)
        
        return (0, 0)
    
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return (0, 0)

def main():
    print("🔧 Console.log Removal Script")
    print("=" * 50)
    
    workspace_root = os.path.dirname(os.path.abspath(__file__))
    total_lines = 0
    total_replacements = 0
    
    for file_path in CRITICAL_FILES:
        full_path = os.path.join(workspace_root, file_path)
        if os.path.exists(full_path):
            lines, replacements = process_file(full_path)
            if replacements > 0:
                print(f"✓ {file_path}")
                print(f"  - Replacements: {replacements}")
                print(f"  - Lines: {lines}")
                total_replacements += replacements
                total_lines += lines
            else:
                print(f"- {file_path} (no changes)")
        else:
            print(f"✗ {file_path} (not found)")
    
    print("\n" + "=" * 50)
    print(f"Total: {total_replacements} replacements in {len([f for f in CRITICAL_FILES if os.path.exists(os.path.join(workspace_root, f))])} files")

if __name__ == "__main__":
    main()
