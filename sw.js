// Service Worker for EduQuiz Platform PWA with Automatic Updates
const CACHE_NAME = 'eduquiz-v1.0.0';
const STATIC_CACHE_NAME = 'eduquiz-static-v1.0.0';
const VERSION_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const VERSION_FILE = '/version.json';

// Enhanced cache strategy
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Dynamic assets will be cached on first visit
];

// Version check storage
let lastUpdateCheck = 0;
let isUpdateAvailable = false;

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => {
          console.log('Static cache opened');
          return cache.addAll(urlsToCache);
        }),
      // Initialize version tracking
      initializeVersionTracking()
    ])
    .then(() => {
      console.log('Service Worker installation complete');
      // Force activation of new service worker
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('Failed to cache resources:', error);
    })
  );
});

// Initialize version tracking
async function initializeVersionTracking() {
  try {
    const cache = await caches.open('eduquiz-version');
    const currentVersion = await cache.get(VERSION_FILE);
    if (!currentVersion) {
      await cache.put(VERSION_FILE, new Response(JSON.stringify({
        version: CACHE_NAME,
        timestamp: Date.now()
      })));
    }
  } catch (error) {
    console.error('Failed to initialize version tracking:', error);
  }
}

// Fetch event with enhanced caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isNavigationRequest(request)) {
    // Navigation requests (pages)
    event.respondWith(handleNavigationRequest(request));
  } else if (isStaticAsset(request)) {
    // Static assets (CSS, JS, images)
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    // API requests - always try network first
    event.respondWith(handleAPIRequest(request));
  } else {
    // Other requests - network first with cache fallback
    event.respondWith(handleOtherRequests(request));
  }
});

// Check if request is for navigation
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.destination === 'document');
}

// Check if request is for static assets
function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
         request.destination === 'script' ||
         request.destination === 'style' ||
         request.destination === 'image' ||
         request.destination === 'font';
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         url.pathname.includes('.supabase.co') ||
         request.destination === 'empty';
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fall back to app shell
    const appShell = await caches.match('/');
    if (appShell) {
      return appShell;
    }
    
    // Last resort - error response
    return new Response('Application offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle static assets
async function handleStaticAsset(request) {
  // Cache first strategy for static assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Check for updates in background
    checkForUpdates();
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache for future use
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a fallback response for critical assets
    if (request.url.includes('icon-') || request.destination === 'image') {
      return new Response('', { status: 204 });
    }
    throw error;
  }
}

// Handle API requests
async function handleAPIRequest(request) {
  // Network first for API requests
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(`${CACHE_NAME}-api`);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fall back to cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    throw error;
  }
}

// Handle other requests
async function handleOtherRequests(request) {
  // Network first
  try {
    return await fetch(request);
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanOldCaches(),
      // Take control of all pages
      self.clients.claim(),
      // Start automatic update checking
      startAutoUpdateCheck()
    ])
  );
});

// Clean up old caches
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const currentVersion = CACHE_NAME;
  
  const deletePromises = cacheNames.map(async (cacheName) => {
    // Delete caches that don't match current version and aren't static
    if (cacheName !== currentVersion && cacheName !== STATIC_CACHE_NAME) {
      if (cacheName.startsWith('eduquiz-') && !cacheName.includes('version')) {
        console.log('Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    }
  });
  
  await Promise.all(deletePromises);
}

// Start automatic update checking
async function startAutoUpdateCheck() {
  // Check for updates immediately
  await checkForUpdates();
  
  // Set up periodic update checks
  setInterval(() => {
    checkForUpdates();
  }, VERSION_CHECK_INTERVAL);
}

// Check for updates
async function checkForUpdates() {
  try {
    const now = Date.now();
    
    // Throttle update checks
    if (now - lastUpdateCheck < 5 * 60 * 1000) { // 5 minutes minimum
      return;
    }
    
    lastUpdateCheck = now;
    
    // Check if we can access the internet
    if (!navigator.onLine) {
      return;
    }
    
    // Check for version updates
    const versionResponse = await fetch('/version.json', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!versionResponse.ok) {
      return;
    }
    
    const versionData = await versionResponse.json();
    const manifestVersion = versionData.version || '1.0.0';
    
    // Compare versions
    const currentVersion = await getCurrentVersion();
    
    if (manifestVersion !== currentVersion) {
      console.log('New version available:', manifestVersion, 'Current:', currentVersion);
      isUpdateAvailable = true;
      
      // Download and cache new version in background
      await downloadNewVersion();
    }
    
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Get current version
async function getCurrentVersion() {
  try {
    const cache = await caches.open('eduquiz-version');
    const response = await cache.get(VERSION_FILE);
    if (response) {
      const data = await response.json();
      return data.version;
    }
  } catch (error) {
    console.error('Failed to get current version:', error);
  }
  return CACHE_NAME;
}

// Download new version in background
async function downloadNewVersion() {
  try {
    console.log('Downloading new version in background...');
    
    const newCacheName = `eduquiz-v${Date.now()}`;
    const cache = await caches.open(newCacheName);
    
    // Cache all current assets
    const response = await fetch('/', { cache: 'no-cache' });
    if (response.ok) {
      await cache.put('/', response.clone());
    }
    
    // Update version tracking
    const versionData = {
      version: newCacheName,
      timestamp: Date.now()
    };
    
    await cache.put(VERSION_FILE, new Response(JSON.stringify(versionData)));
    
    console.log('New version downloaded and ready');
    isUpdateAvailable = false;
    
    // Notify all clients about the update
    await notifyClientsOfUpdate();
    
  } catch (error) {
    console.error('Failed to download new version:', error);
    isUpdateAvailable = false;
  }
}

// Notify all clients about the update
async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  
  clients.forEach(client => {
    client.postMessage({
      type: 'UPDATE_AVAILABLE',
      version: await getCurrentVersion()
    });
  });
}

// Enhanced message handling for updates
self.addEventListener('message', (event) => {
  const { data, source } = event;
  
  if (data && typeof data === 'object') {
    switch (data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CHECK_UPDATES':
        checkForUpdates();
        break;
        
      case 'GET_UPDATE_STATUS':
        // Handle both direct message and MessageChannel
        const respond = (msg) => {
          if (event.ports && event.ports.length > 0) {
            event.ports[0].postMessage(msg);
          } else if (source) {
            source.postMessage(msg);
          }
        };
        
        respond({
          type: 'UPDATE_STATUS',
          isUpdateAvailable: isUpdateAvailable,
          currentVersion: CACHE_NAME
        });
        break;
        
      case 'APPLY_UPDATE':
        if (isUpdateAvailable && self.waiting) {
          self.waiting.postMessage({ type: 'SKIP_WAITING' });
          self.skipWaiting();
        }
        break;
        
      case 'NOTIFY_UPDATE':
        // Client can trigger notification of updates
        console.log('Update notification received from client');
        break;
    }
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implement background sync logic
  return Promise.resolve();
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('EduQuiz Platform', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});