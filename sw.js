// sw.js - Service Worker with advanced features
const CACHE_NAME = 'voice-brain-v1';
const SW_VERSION = '1.0.0';
const LAST_UPDATED = '2024-12-19 14:30:00 UTC';

console.log(`🔧 Voice Brain Service Worker v${SW_VERSION} - Updated: ${LAST_UPDATED}`);

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        return new Response(
          '<h1>Voice Brain Offline</h1><p>Please check your connection.</p>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
  );
});

// Background sync for queued commands
self.addEventListener('sync', event => {
  if (event.tag === 'sync-commands') {
    event.waitUntil(syncCommands());
  }
});

// Push notifications for wake-up
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Voice Brain is ready',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'listen',
        title: 'Start Listening',
        icon: '/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Voice Brain', options)
  );
});

// Notification click - open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'listen') {
    event.waitUntil(
      clients.openWindow('/?action=listen')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for cross-tab communication
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'EXECUTE_COMMAND') {
    // Broadcast command to all clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'COMMAND',
          command: event.data.command
        });
      });
    });
  }
});

// Periodic background sync
async function syncCommands() {
  // Get stored commands from IndexedDB
  const commands = await getStoredCommands();
  
  if (commands.length > 0) {
    // Send to your AI endpoint
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
      });
      
      if (response.ok) {
        await clearStoredCommands();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

// Helper functions for IndexedDB
async function getStoredCommands() {
  // Implementation for getting commands from IndexedDB
  return [];
}

async function clearStoredCommands() {
  // Implementation for clearing commands from IndexedDB
}

// Share target handler
self.addEventListener('fetch', event => {
  if (event.request.url.endsWith('/share') && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  const formData = await request.formData();
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';
  
  // Store shared data
  const cache = await caches.open(CACHE_NAME);
  await cache.put('/shared-data', new Response(JSON.stringify({ text, url })));
  
  // Redirect to main app
  return Response.redirect('/?shared=true', 303);
}
