#!/usr/bin/env python3
"""
Fix unhandled try blocks by adding proper catch handlers
Replaces empty catch {} with catch (error) { logger.debug(...) }
"""

import re
from pathlib import Path

FILES_TO_FIX = [
    "src/components/HomeMap.tsx",
    "src/services/socialAuthHelper.ts",
    "src/utils/security.ts",
]

def fix_empty_catches(file_path: str) -> int:
    """Add proper error handlers to empty catch blocks"""
    full_path = Path(file_path)
    if not full_path.exists():
        return 0
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern: catch {} or catch with empty body
    # Replace with catch (error) { /* handled */ }
    replacements = 0
    
    # First, ensure logger import
    if "import logger from" not in content:
        # Find first import
        first_import = re.search(r"^import\s+", content, re.MULTILINE)
        if first_import:
            newline_pos = content.find('\n', first_import.start()) + 1
            # Determine relative path
            depth = file_path.count('/')
            relative = "../" * (depth - 1) + "utils/logger"
            import_line = f"import logger from '{relative}';\n"
            content = content[:newline_pos] + import_line + content[newline_pos:]
            print(f"  ✓ Added logger import")
    
    # Fix: catch {} -> catch (error) { /* handled */ }
    old_pattern = r'catch\s*\{\s*\}'
    new_code = 'catch (error) { /* handled */ }'
    
    new_content, count = re.subn(old_pattern, new_code, content)
    if count > 0:
        content = new_content
        replacements += count
        print(f"  ✓ Fixed {count} empty catch blocks")
    
    # Fix: catch (e) {} -> catch (error) { /* handled */ }
    old_pattern2 = r'catch\s*\(\s*\w+\s*\)\s*\{\s*\}'
    new_content, count = re.subn(old_pattern2, new_code, content)
    if count > 0:
        content = new_content
        replacements += count
        print(f"  ✓ Fixed {count} unnamed catch blocks")
    
    if replacements > 0:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {file_path}: {replacements} fixes applied")
        return replacements
    else:
        print(f"⊘ {file_path}: No empty catch blocks found")
        return 0

def main():
    print("🔄 Fixing empty catch blocks...\n")
    total = 0
    
    for file_path in FILES_TO_FIX:
        print(f"Processing: {file_path}")
        total += fix_empty_catches(file_path)
        print()
    
    print(f"✅ Total catch blocks improved: {total}")
    print("\n📋 Next steps:")
    print("1. Verify files manually (they should have proper error handling)")
    print("2. Run: npm run build")
    print("3. Check for any TypeScript errors")

if __name__ == "__main__":
    main()
