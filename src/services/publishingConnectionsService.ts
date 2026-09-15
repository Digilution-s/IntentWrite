/**
 * Publishing Connections Service
 * Manages CMS and Webhook publishing endpoints, ensuring only active, connected
 * sources appear as eligible publishing destinations across the application.
 */

export interface PublishingDestination {
  id: string;
  name: string;
  type: 'wordpress' | 'webhook' | 'ghost' | 'webflow' | 'shopify' | 'strapi' | string;
  label: string;
  connected: boolean;
  endpointUrl?: string;
  description?: string;
  connectedAt?: string;
}

const STORAGE_KEY = 'intentwrite_connections';
const EVENT_NAME = 'intentwrite_connections_changed';

const DEFAULT_DESTINATIONS: PublishingDestination[] = [
  {
    id: 'wordpress',
    name: 'WordPress REST API',
    type: 'wordpress',
    label: 'Blog - WordPress',
    connected: true,
    description: 'Direct publishing to WP Posts with SEO metadata and featured image upload.',
  },
  {
    id: 'webhook',
    name: 'Generic API / Webhook',
    type: 'webhook',
    label: 'Generic API / Webhook',
    connected: true,
    description: 'Dispatches JSON payloads for custom Next.js, Ghost, or Headless CMS pipelines.',
    endpointUrl:
      ((import.meta as any).env?.VITE_N8N_CONTENT_GENERATE_WEBHOOK as string) || '',
  },
];

class PublishingConnectionsService {
  private notifyListeners(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  }

  /**
   * Get all registered publishing destinations from storage
   */
  public getDestinations(): PublishingDestination[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse publishing connections from localStorage:', err);
    }

    // Default initialization
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DESTINATIONS));
    } catch {
      // ignore
    }
    return DEFAULT_DESTINATIONS;
  }

  /**
   * Get ONLY the destinations that are currently connected and active
   * @param websiteName Optional website name to customize label (e.g. "Blog (TechHub WordPress)")
   */
  public getConnectedDestinations(websiteName?: string): PublishingDestination[] {
    const all = this.getDestinations();
    const connected = all.filter((d) => d.connected);

    return connected.map((d) => {
      if (d.type === 'wordpress' && websiteName) {
        return {
          ...d,
          label: `Blog (${websiteName} WordPress)`,
        };
      }
      return d;
    });
  }

  /**
   * Toggle or set connection status for a specific destination
   */
  public setConnected(id: string, connected: boolean): PublishingDestination[] {
    const list = this.getDestinations().map((d) => {
      if (d.id === id) {
        return {
          ...d,
          connected,
          connectedAt: connected ? new Date().toISOString() : d.connectedAt,
        };
      }
      return d;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('Failed to save connections to localStorage:', err);
    }
    this.notifyListeners();
    return list;
  }

  /**
   * Update destination properties (e.g. endpointUrl, name)
   */
  public updateDestination(
    id: string,
    updates: Partial<PublishingDestination>
  ): PublishingDestination[] {
    const list = this.getDestinations().map((d) => {
      if (d.id === id) {
        return { ...d, ...updates };
      }
      return d;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('Failed to save connections to localStorage:', err);
    }
    this.notifyListeners();
    return list;
  }

  /**
   * Add a new destination (Ghost, Webflow, Shopify, Strapi) and mark it connected
   */
  public addDestination(
    type: string,
    customName?: string,
    endpointUrl?: string
  ): PublishingDestination {
    const id = `${type.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const name = customName || type;
    const label = `${type} Blog`;

    const newDest: PublishingDestination = {
      id,
      name,
      type: type.toLowerCase(),
      label,
      connected: true,
      endpointUrl: endpointUrl || '',
      description: `Automated content publishing pipeline for ${type}.`,
      connectedAt: new Date().toISOString(),
    };

    const current = this.getDestinations();
    const updated = [...current, newDest];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to add connection to localStorage:', err);
    }
    this.notifyListeners();
    return newDest;
  }

  /**
   * Remove a destination
   */
  public removeDestination(id: string): PublishingDestination[] {
    const current = this.getDestinations();
    const filtered = current.filter((d) => d.id !== id);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('Failed to remove connection from localStorage:', err);
    }
    this.notifyListeners();
    return filtered;
  }

  /**
   * Subscribe to connection changes
   */
  public subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVENT_NAME, callback);
    return () => window.removeEventListener(EVENT_NAME, callback);
  }
}

export const publishingConnectionsService = new PublishingConnectionsService();
