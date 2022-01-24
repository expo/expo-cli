import { ExpoConfig } from '@expo/config-types';
import os from 'os';
import { URLSearchParams } from 'url';

import ApiV2, { ApiV2ClientOptions } from './ApiV2';

export async function notifyAliveAsync(
  user: ApiV2ClientOptions | null,
  {
    exp,
    platform,
    url,
    description,
    source,
    openedAt,
    devices,
  }: {
    openedAt?: number;
    description?: string;
    exp: ExpoConfig;
    platform: 'native' | 'web';
    url: string;
    source: 'desktop' | 'snack';
    devices: { installationId: string }[];
  }
): Promise<unknown> {
  let queryString = '';
  if (devices) {
    const searchParams = new URLSearchParams();
    devices.forEach(device => {
      searchParams.append('deviceId', device.installationId);
    });
    queryString = `?${searchParams.toString()}`;
  }

  return await ApiV2.clientForUser(user).postAsync(
    `development-sessions/notify-alive${queryString}`,
    {
      data: {
        session: {
          description: description ?? `${exp.name} on ${os.hostname()}`,
          url,
          source,
          openedAt,
          // not on type
          hostname: os.hostname(),
          platform,
          config: {
            // TODO: if icons are specified, upload a url for them too so people can distinguish
            description: exp.description,
            name: exp.name,
            slug: exp.slug,
            primaryColor: exp.primaryColor,
          },
        },
      },
    }
  );
}
