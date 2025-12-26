"""
ADVANCED stealth measures for reCAPTCHA bypass
This adds maximum fingerprinting protection
"""

ADVANCED_STEALTH_SCRIPT = """
// 1. Remove webdriver completely
delete navigator.__proto__.webdriver;
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

// 2. Chrome runtime
window.chrome = {
    app: {},
    runtime: {
        connect: function() {},
        sendMessage: function() {},
        PlatformOs: {
            MAC: "mac",
            WIN: "win",
            ANDROID: "android",
            CROS: "cros",
            LINUX: "linux",
            OPENBSD: "openbsd"
        },
        PlatformArch: {
            ARM: "arm",
            X86_32: "x86-32",
            X86_64: "x86-64"
        },
        PlatformNaclArch: {
            ARM: "arm",
            X86_32: "x86-32",
            X86_64: "x86-64"
        }
    },
    loadTimes: function() {
        return {
            commitLoadTime: Date.now() / 1000 - Math.random(),
            connectionInfo: "http/1.1",
            finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
            finishLoadTime: Date.now() / 1000 - Math.random(),
            firstPaintAfterLoadTime: 0,
            firstPaintTime: Date.now() / 1000 - Math.random(),
            navigationType: "Other",
            npnNegotiatedProtocol: "unknown",
            requestTime: Date.now() / 1000 - Math.random() - 1,
            startLoadTime: Date.now() / 1000 - Math.random() - 2,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: false,
            wasNpnNegotiated: false
        };
    },
    csi: function() {
        return {
            onloadT: Date.now(),
            pageT: Date.now() - Math.random() * 1000,
            startE: Date.now() - Math.random() * 2000,
            tran: 15
        };
    }
};

// 3. Permissions - override query
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
        Promise.resolve({state: Notification.permission}) :
        originalQuery(parameters)
);

// 4. Plugins - realistic list
Object.defineProperty(navigator, 'plugins', {
    get: () => [
        {
            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
        },
        {
            0: {type: "application/pdf", suffixes: "pdf", description: "Portable Document Format"},
            description: "Portable Document Format", 
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
        },
        {
            0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
            1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
        }
    ]
});

// 5. Languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en']
});

// 6. Platform
Object.defineProperty(navigator, 'platform', {
    get: () => 'Win32'
});

// 7. Vendor
Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.'
});

// 8. WebGL - fake proper renderer
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) {
        return 'Intel Inc.';
    }
    if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine';
    }
    return getParameter.apply(this, [parameter]);
};

// 9. Canvas fingerprinting - add noise
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function() {
    const context = this.getContext('2d');
    if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 10) - 5;
        }
        context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, arguments);
};

// 10. Battery API - block
Object.defineProperty(navigator, 'getBattery', {
    get: () => undefined
});

// 11. Connection - realistic values
Object.defineProperty(navigator, 'connection', {
    get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false
    })
});

// 12. Hardware concurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8
});

// 13. Device memory
Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8
});

console.log('[Stealth] Maximum anti-detection applied');
"""

def get_advanced_stealth_script():
    """Return advanced stealth JavaScript"""
    return ADVANCED_STEALTH_SCRIPT
