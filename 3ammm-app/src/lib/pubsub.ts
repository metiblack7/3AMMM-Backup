type Listener = () => void;

const listeners: Record<string, Listener[]> = {};

export function subscribe(topic: string, fn: Listener) {
  listeners[topic] = listeners[topic] || [];
  listeners[topic].push(fn);
  return () => {
    listeners[topic] = (listeners[topic] || []).filter(l => l !== fn);
  };
}

export function publish(topic: string) {
  (listeners[topic] || []).forEach(fn => {
    try { fn(); } catch (e) { console.warn('pubsub listener error', e); }
  });
}
