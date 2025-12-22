# Selenium Setup Guide for Veo Captcha Integration

## Installation

### 1. Install Python Package
```bash
cd backend
pip install selenium>=4.15.0
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

### 2. Install Chrome Browser

**Windows:**
- Download and install from: https://www.google.com/chrome/
- Chrome will be automatically detected by Selenium

**Linux (Ubuntu/Debian):**
```bash
# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
```

**macOS:**
```bash
brew install --cask google-chrome
```

### 3. ChromeDriver (Automatic)

Selenium 4.15+ includes **Selenium Manager** which automatically downloads and manages ChromeDriver. No manual installation needed!

If you need to install manually:
```bash
# Windows (using chocolatey)
choco install chromedriver

# Linux
sudo apt-get install chromium-chromedriver

# macOS
brew install chromedriver
```

## Verification

Test that Selenium is working:

```bash
cd backend
python -c "from selenium import webdriver; driver = webdriver.Chrome(); driver.quit(); print('✅ Selenium is working!')"
```

## Configuration

No additional configuration needed! The `selenium_solver.py` is already configured with:
- User agent matching Chrome 131
- Window size: 1920x1080
- Disabled GPU acceleration
- Sandbox disabled for compatibility

## Troubleshooting

### Issue: ChromeDriver version mismatch
```
SessionNotCreatedException: session not created: This version of ChromeDriver only supports Chrome version X
```

**Solution:** Selenium Manager will auto-update. If it doesn't:
```bash
# Update Chrome to latest version
# Selenium will automatically download matching ChromeDriver
```

### Issue: Chrome binary not found
```
WebDriverException: unknown error: cannot find Chrome binary
```

**Solution (Windows):**
```python
# In selenium_solver.py, add:
chrome_options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
```

**Solution (Linux):**
```python
chrome_options.binary_location = "/usr/bin/google-chrome"
```

### Issue: Permission denied (Linux)
```
PermissionError: [Errno 13] Permission denied: 'chromedriver'
```

**Solution:**
```bash
sudo chmod +x /usr/bin/chromedriver
```

### Issue: Headless mode not working
The current implementation runs Chrome with GUI. For production/server environments, you can enable headless mode:

```python
# In selenium_solver.py, add to chrome_options:
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
```

**Note:** Some captcha systems may detect headless mode. Test thoroughly before using in production.

## Production Deployment

### Docker
If deploying with Docker, add to your Dockerfile:

```dockerfile
# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver (optional, Selenium Manager handles this)
RUN apt-get update && apt-get install -y chromium-chromedriver
```

### VPS/Server
For headless server environments:

```bash
# Install Chrome headless dependencies
sudo apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils
```

## Performance Tips

1. **Use Token Caching** (already implemented)
   - Tokens are cached for 110 seconds
   - Reduces Chrome launches by 50-100x

2. **Pre-warm on Startup**
   ```python
   # In your app startup
   from app.services.providers.recaptcha import get_recaptcha_token
   get_recaptcha_token()  # Pre-generate token
   ```

3. **Monitor Chrome Processes**
   ```bash
   # Check for zombie Chrome processes
   ps aux | grep chrome
   
   # Kill if needed
   pkill chrome
   ```

4. **Resource Limits**
   - Each Chrome instance uses ~100-200MB RAM
   - Token caching prevents multiple instances
   - Consider implementing a token pool for high traffic

## Security Notes

1. **Chrome runs with user privileges** - ensure proper sandboxing in production
2. **Tokens are short-lived** (2 minutes) - no long-term storage needed
3. **No sensitive data** is stored in Chrome profile
4. **Browser fingerprinting** - Chrome runs with real user agent to avoid detection

## Summary

✅ **Required**: Python package `selenium>=4.15.0`
✅ **Required**: Chrome browser installed
✅ **Automatic**: ChromeDriver (managed by Selenium Manager)
✅ **Optional**: Headless mode for production
✅ **Performance**: Token caching reduces overhead

The setup is straightforward and Selenium Manager handles most of the complexity automatically!
