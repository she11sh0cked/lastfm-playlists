import chalk from "chalk-template";
import bytes from "bytes";

/**
 * Cache entry type with timestamp to track when it was last accessed
 */
type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

export class PersistentCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private dirty: boolean = false;
  private currentSizeBytes: number = 0;

  constructor(private filePath: string = "", private maxSizeBytes: number = 0) {
    this.loadFromFile();
  }

  /**
   * Loads the cache from the file if it exists
   */
  private async loadFromFile(): Promise<void> {
    if (!this.filePath) return;

    try {
      const file = Bun.file(this.filePath);
      if (await file.exists()) {
        console.log(chalk`{cyan Loading cache from ${this.filePath}...}`);
        const data = (await file.json()) as Record<string, CacheEntry<T>>;

        // Convert the loaded object back to a Map
        this.cache = new Map(Object.entries(data));

        // Get the current file size
        this.currentSizeBytes = file.size;

        console.log(
          chalk`{green Successfully loaded ${
            this.cache.size
          } cache entries (${this.formatSize(this.currentSizeBytes)})}`
        );
      }
    } catch (error) {
      console.log(
        chalk`{yellow Failed to load cache from ${this.filePath}: ${error}}`
      );
    }
  }

  /**
   * Saves the cache to the file if it has been modified
   */
  async saveToFile(): Promise<void> {
    if (!this.filePath || !this.dirty) return;

    try {
      // Check if we need to prune the cache before saving
      if (this.maxSizeBytes > 0) {
        await this.pruneIfNeeded();
      }

      // Convert the Map to a regular object for JSON serialization
      const data = Object.fromEntries(this.cache.entries());
      const jsonString = JSON.stringify(data);

      // Write to disk and update size
      await Bun.write(this.filePath, jsonString);
      this.currentSizeBytes = new TextEncoder().encode(jsonString).length;

      console.log(
        chalk`{green Saved ${this.cache.size} cache entries to ${
          this.filePath
        } (${this.formatSize(this.currentSizeBytes)})}`
      );
      this.dirty = false;
    } catch (error) {
      console.log(
        chalk`{yellow Failed to save cache to ${this.filePath}: ${error}}`
      );
    }
  }

  /**
   * Gets a value from the cache and updates its timestamp
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Update the timestamp when accessed
      entry.timestamp = Date.now();
      this.dirty = true;
      return entry.value;
    }
    return undefined;
  }

  /**
   * Sets a value in the cache with current timestamp
   */
  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
    this.dirty = true;
  }

  /**
   * Checks if the key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Returns the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Calculate the exact serialized size of the cache
   * @returns The size in bytes of the serialized cache
   */
  private getSerializedSize(): number {
    // Convert the Map to a regular object and serialize it
    const data = Object.fromEntries(this.cache.entries());
    const buffer = new TextEncoder().encode(JSON.stringify(data));
    return buffer.length;
  }

  /**
   * Check if pruning is needed and perform pruning if the cache exceeds the size limit
   */
  private async pruneIfNeeded(): Promise<void> {
    if (this.maxSizeBytes <= 0) return;

    // Get exact serialized size
    const currentSize = this.getSerializedSize();

    if (currentSize > this.maxSizeBytes) {
      console.log(
        chalk`{yellow Cache size (${this.formatSize(
          currentSize
        )}) exceeds limit (${this.formatSize(this.maxSizeBytes)}), pruning...}`
      );

      await this.pruneCache(currentSize);
    }
  }

  /**
   * Prune the cache to bring it under the size limit
   * @param currentSize The current size of the cache in bytes
   */
  private async pruneCache(currentSize: number): Promise<void> {
    if (this.maxSizeBytes <= 0) return;

    // Sort entries by timestamp (ascending) - remove oldest entries first
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    // Remove entries one by one, measuring the size after each removal
    // until we're under the limit or have no entries left
    let entriesRemoved = 0;
    let lastSize = currentSize;

    for (const [key] of entries) {
      // Remove the entry
      this.cache.delete(key);
      entriesRemoved++;

      // Measure the new size
      const newSize = this.getSerializedSize();

      // Log the entry removal and size reduction
      console.log(
        chalk`{gray Removed entry with key "${key}", saved ${this.formatSize(
          lastSize - newSize
        )}}`
      );

      // Update the last size
      lastSize = newSize;

      // Check if we're now under the limit
      if (newSize <= this.maxSizeBytes) {
        console.log(
          chalk`{green Successfully pruned ${entriesRemoved} oldest entries, new size: ${this.formatSize(
            newSize
          )}}`
        );
        return;
      }
    }

    // If we get here, we've removed all entries but still exceed the limit
    console.log(
      chalk`{yellow WARNING: Removed all ${entriesRemoved} entries, but cache size (${this.formatSize(
        this.getSerializedSize()
      )}) still exceeds limit (${this.formatSize(this.maxSizeBytes)}).}`
    );
  }

  /**
   * Format a byte size into a human-readable string
   */
  private formatSize(bytesValue: number): string {
    return bytes.format(bytesValue, { unitSeparator: " " }) ?? "0 B";
  }
}
