type EventCallback = (...args: unknown[]) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return an unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    };
  }

  emit(event: string, ...args: unknown[]) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(...args));
    }
  }
}

export const EVENT_TYPES = {
  IMAGE_GENERATED: "imageGenerated",
  IMAGE_UPLOADED: "imageUploaded",
};

// Create a singleton instance
export const eventEmitter = new EventEmitter();
