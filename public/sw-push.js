/**
 * Custom Service Worker for Push Notifications
 * COR Pathways - Construction Safety Management
 * 
 * This file handles push notifications and is loaded alongside the PWA service worker.
 */

// Handle update lifecycle messages
self.addEventListener('message', function(event) {
  if (!event.data || !event.data.type) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW Update] Skip waiting requested');

    if (event.data.clearCaches) {
      event.waitUntil(clearAllCaches());
    }

    self.skipWaiting();
  }
});

// Notify clients when the new service worker activates
self.addEventListener('activate', function(event) {
  event.waitUntil((async function() {
    await self.clients.claim();
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientList.forEach(client => {
      client.postMessage({ type: 'SW_ACTIVATED', timestamp: Date.now() });
    });
  })());
});

// Push notification received
self.addEventListener('push', function(event) {
  console.log('[SW Push] Push received:', event);
  
  if (!event.data) {
    console.log('[SW Push] Push event but no data');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'COR Pathways',
      body: event.data.text()
    };
  }
  
  console.log('[SW Push] Push data:', data);
  
  const title = data.title || 'COR Pathways';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.image,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      timestamp: Date.now()
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      }
    ],
    vibrate: [200, 100, 200],
    tag: data.tag || 'cor-pathways-default',
    requireInteraction: data.requireInteraction || false,
    renotify: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification clicked
self.addEventListener('notificationclick', function(event) {
  console.log('[SW Push] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Handle dismiss action
  if (event.action === 'dismiss') {
    trackNotificationAction(event.notification.data, 'dismissed');
    return;
  }
  
  // Track the click
  trackNotificationAction(event.notification.data, event.action || 'clicked');
  
  // Get URL to open
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if app is already open
      for (const client of clientList) {
        // If we find an open window with our origin, focus it
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate to the target URL
          return client.navigate(urlToOpen);
        }
      }
      
      // No existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification closed (dismissed without clicking)
self.addEventListener('notificationclose', function(event) {
  console.log('[SW Push] Notification closed:', event.notification.tag);
  trackNotificationAction(event.notification.data, 'closed');
});

// Helper to track notification actions
async function trackNotificationAction(data, action) {
  if (!data?.notificationId) return;
  
  try {
    await fetch('/api/notifications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: data.notificationId,
        action: action,
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error('[SW Push] Failed to track notification action:', error);
  }
}

// Background sync for offline form submissions
self.addEventListener('sync', function(event) {
  console.log('[SW Sync] Background sync:', event.tag);
  
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncOfflineForms());
  }
  
  if (event.tag === 'sync-certifications') {
    event.waitUntil(syncCertifications());
  }
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline forms
async function syncOfflineForms() {
  console.log('[SW Sync] Syncing offline forms...');
  
  try {
    // Get pending forms from IndexedDB
    const db = await openDatabase();
    const tx = db.transaction('pending_forms', 'readonly');
    const store = tx.objectStore('pending_forms');
    const pendingForms = await getAllFromStore(store);
    
    for (const form of pendingForms) {
      try {
        const response = await fetch('/api/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.data)
        });
        
        if (response.ok) {
          // Remove from pending
          const deleteTx = db.transaction('pending_forms', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending_forms');
          deleteStore.delete(form.id);
          
          // Show success notification
          self.registration.showNotification('Form Synced', {
            body: `${form.data.title || 'Form'} submitted successfully`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            tag: 'form-sync-success'
          });
          
          console.log('[SW Sync] Form synced successfully:', form.id);
        }
      } catch (error) {
        console.error('[SW Sync] Failed to sync form:', form.id, error);
      }
    }
  } catch (error) {
    console.error('[SW Sync] Background sync failed:', error);
  }
}

// Sync certifications
async function syncCertifications() {
  console.log('[SW Sync] Syncing certifications...');
  
  try {
    const db = await openDatabase();
    const tx = db.transaction('pending_certifications', 'readonly');
    const store = tx.objectStore('pending_certifications');
    const pendingCerts = await getAllFromStore(store);
    
    for (const cert of pendingCerts) {
      try {
        const response = await fetch('/api/certifications/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cert.data)
        });
        
        if (response.ok) {
          // Remove from pending
          const deleteTx = db.transaction('pending_certifications', 'readwrite');
          const deleteStore = deleteTx.objectStore('pending_certifications');
          deleteStore.delete(cert.id);
          
          // Show success notification
          self.registration.showNotification('Certification Synced', {
            body: `${cert.data.certification_type || 'Certification'} uploaded successfully`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            tag: 'cert-sync-success'
          });
          
          console.log('[SW Sync] Certification synced successfully:', cert.id);
        }
      } catch (error) {
        console.error('[SW Sync] Failed to sync certification:', cert.id, error);
      }
    }
  } catch (error) {
    console.error('[SW Sync] Certification sync failed:', error);
  }
}

// Sync other offline data
async function syncOfflineData() {
  console.log('[SW Sync] Syncing offline data...');
  // This will be handled by the app's existing sync mechanism
  // Just trigger a message to the client
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_REQUESTED',
      timestamp: Date.now()
    });
  });
}

// Open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cor-pathways-offline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_forms')) {
        db.createObjectStore('pending_forms', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_certifications')) {
        db.createObjectStore('pending_certifications', { keyPath: 'id' });
      }
    };
  });
}

// Helper to get all items from an object store
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clear old caches when updating
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    console.log('[SW Update] Cleared caches:', cacheNames);
  } catch (error) {
    console.error('[SW Update] Cache cleanup failed:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', function(event) {
  console.log('[SW PeriodicSync] Tag:', event.tag);
  
  if (event.tag === 'daily-check') {
    event.waitUntil(performDailyCheck());
  }
});

async function performDailyCheck() {
  console.log('[SW PeriodicSync] Performing daily check...');
  
  // Check for certification expiries, pending forms, etc.
  // Notify clients to refresh data
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'DAILY_CHECK',
      timestamp: Date.now()
    });
  });
}

console.log('[SW Push] Push notification service worker loaded');
