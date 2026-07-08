import { BadRequestException, Injectable } from '@nestjs/common';
import { PodOrderInput, PodOrderResult, PodOrderStatus, PodProvider } from './pod-provider.interface';
import { QikinkProvider } from './providers/qikink.provider';

/** Dispatcher over print-on-demand providers — register new ones in the map below. */
@Injectable()
export class PodService {
  private readonly providers: Map<string, PodProvider>;

  constructor(qikink: QikinkProvider) {
    this.providers = new Map<string, PodProvider>([[qikink.name, qikink]]);
  }

  getProvider(name: string): PodProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new BadRequestException(`Unknown print-on-demand provider '${name}'`);
    if (!provider.isConfigured()) {
      throw new BadRequestException(`Print-on-demand provider '${name}' is not configured — set its env credentials`);
    }
    return provider;
  }

  createOrder(providerName: string, input: PodOrderInput): Promise<PodOrderResult> {
    return this.getProvider(providerName).createOrder(input);
  }

  getOrderStatus(providerName: string, podOrderId: string): Promise<PodOrderStatus | null> {
    return this.getProvider(providerName).getOrder(podOrderId);
  }
}
