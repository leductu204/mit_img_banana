#!/usr/bin/env python3
"""
VPS Chrome Diagnostic Tool (for VPS with Display)
Run this on your VPS to diagnose Chrome/ChromeDriver issues
"""

import subprocess
import sys
import os
import re

def run_cmd(cmd):
    """Run shell command and return stdout, stderr"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except Exception as e:
        return "", str(e), 1

def print_header(text):
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}")

def print_section(text):
    print(f"\n[{text}]")

def get_chrome_version():
    """Get installed Chrome version number"""
    stdout, stderr, code = run_cmd("google-chrome --version 2>/dev/null || google-chrome-stable --version 2>/dev/null")
    if code == 0 and stdout:
        match = re.search(r'(\d+)\.', stdout)
        return match.group(1) if match else None
    return None

def check_chrome():
    """Check Chrome installation"""
    print_section("Chrome Installation")
    
    stdout, stderr, code = run_cmd("google-chrome --version 2>/dev/null || google-chrome-stable --version 2>/dev/null")
    
    if code == 0:
        version = get_chrome_version()
        print(f"  ✓ Chrome installed: {stdout}")
        print(f"  ✓ Version: {version}")
        return True, version
    else:
        print("  ✗ Chrome NOT found")
        print("\n  Install with:")
        print("    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb")
        print("    sudo dpkg -i google-chrome-stable_current_amd64.deb")
        print("    sudo apt-get install -f")
        return False, None

def check_display():
    """Check display server"""
    print_section("Display Server")
    
    display = os.environ.get('DISPLAY')
    if display:
        print(f"  ✓ DISPLAY is set: {display}")
        return True
    else:
        print("  ✗ DISPLAY not set")
        print("\n  Since you have a display server, just set:")
        print("    export DISPLAY=:0")
        return False

def check_zombie_processes():
    """Check for zombie Chrome processes"""
    print_section("Zombie Chrome Processes")
    
    stdout, stderr, code = run_cmd("pgrep -a chrome")
    
    if stdout:
        lines = stdout.split('\n')
        print(f"  ⚠ Found {len(lines)} Chrome process(es):")
        for line in lines[:5]:  # Show first 5
            print(f"    {line}")
        if len(lines) > 5:
            print(f"    ... and {len(lines) - 5} more")
        print("\n  Kill them with:")
        print("    pkill -9 chrome")
        return False
    else:
        print("  ✓ No zombie Chrome processes found")
        return True

def test_chrome_launch():
    """Test Chrome launch with root-safe flags"""
    print_section("Chrome Launch Test")
    
    # Test headless mode (for ChromeDriver)
    cmd = "google-chrome --no-sandbox --disable-gpu --disable-dev-shm-usage --headless=new --version"
    stdout, stderr, code = run_cmd(cmd)
    
    if code == 0:
        print("  ✓ Chrome can launch in headless mode")
        headless_ok = True
    else:
        print(f"  ✗ Chrome headless failed: {stderr}")
        headless_ok = False
    
    # Test visible mode (for reCAPTCHA)
    cmd = "timeout 3 google-chrome --no-sandbox --disable-gpu --disable-dev-shm-usage --version"
    stdout, stderr, code = run_cmd(cmd)
    
    if code == 0 or code == 124:  # 124 = timeout (expected for visible mode)
        print("  ✓ Chrome can launch in visible mode")
        visible_ok = True
    else:
        print(f"  ✗ Chrome visible failed: {stderr}")
        visible_ok = False
    
    return headless_ok and visible_ok

def check_python_dependencies():
    """Check Python dependencies"""
    print_section("Python Dependencies")
    
    deps = ['selenium', 'undetected_chromedriver']
    all_ok = True
    
    for dep in deps:
        try:
            __import__(dep.replace('_', '-') if '-' in dep else dep)
            print(f"  ✓ {dep} installed")
        except ImportError:
            print(f"  ✗ {dep} NOT installed")
            print(f"    Install with: pip install {dep.replace('_', '-')}")
            all_ok = False
    
    return all_ok

def test_undetected_chrome():
    """Test undetected_chromedriver initialization"""
    print_section("Undetected ChromeDriver Test")
    
    try:
        import undetected_chromedriver as uc
        
        version = get_chrome_version()
        print(f"  → Testing with Chrome version: {version}")
        
        # Try to initialize (will auto-download correct ChromeDriver)
        options = uc.ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-gpu')
        options.add_argument('--headless=new')
        
        driver = uc.Chrome(
            options=options,
            version_main=int(version) if version else None,
            use_subprocess=True
        )
        
        driver.quit()
        print("  ✓ undetected_chromedriver works!")
        return True
        
    except Exception as e:
        print(f"  ✗ undetected_chromedriver failed: {e}")
        return False

def main():
    print_header("VPS CHROME DIAGNOSTIC TOOL")
    print("  For VPS with Display Server")
    
    results = {}
    
    # Run all checks
    results['chrome'], chrome_version = check_chrome()
    results['display'] = check_display()
    results['no_zombies'] = check_zombie_processes()
    results['launch'] = test_chrome_launch()
    results['python_deps'] = check_python_dependencies()
    results['uc_test'] = test_undetected_chrome()
    
    # Summary
    print_header("SUMMARY")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("  ✓ ✓ ✓ ALL CHECKS PASSED! ✓ ✓ ✓")
        print("\n  Your VPS is ready for Chrome automation!")
        
    else:
        print("  ✗ Some checks failed\n")
        
        if not results['chrome']:
            print("  → Install Chrome first")
        if not results['display']:
            print("  → Set DISPLAY environment variable")
        if not results['no_zombies']:
            print("  → Kill zombie Chrome processes")
        if not results['launch']:
            print("  → Chrome cannot launch (check permissions)")
        if not results['python_deps']:
            print("  → Install missing Python packages")
        if not results['uc_test']:
            print("  → undetected_chromedriver issue (check logs above)")
        
        print("\n  QUICK FIX:")
        print("    pkill -9 chrome")
        print("    export DISPLAY=:0")
        print("    pip install selenium undetected-chromedriver")
    
    print(f"\n{'='*70}\n")
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
