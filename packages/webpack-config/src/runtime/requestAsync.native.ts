type RequestListener = { remove: Function };

// Use a verbose version of fetch since it's clearly
// faster than React Native's `fetch` implementation.

export async function requestAsync(url: string, reqHeaders: Record<string, string> = {}) {
  let id: string | null = null;
  let responseText: string | null = null;
  let headers: Record<string, string> | null = null;
  let dataListener: RequestListener | undefined;
  let completeListener: RequestListener | undefined;
  let responseListener: RequestListener | undefined;

  const Networking = require('react-native/Libraries/Network/RCTNetworking');

  return new Promise<{ body: string | null; headers: Record<string, string> | null }>(
    (resolve, reject) => {
      dataListener = Networking.addListener(
        'didReceiveNetworkData',
        ([requestId, response]: [string, string]) => {
          if (requestId === id) {
            responseText = response;
          }
        }
      );
      responseListener = Networking.addListener(
        'didReceiveNetworkResponse',
        ([requestId, , responseHeaders]: [string, string, Record<string, string>]) => {
          if (requestId === id) {
            headers = responseHeaders;
          }
        }
      );
      completeListener = Networking.addListener(
        'didCompleteNetworkResponse',
        ([requestId, error]: [string, Error]) => {
          if (requestId === id) {
            if (error) {
              reject(error);
            } else {
              resolve({ body: responseText, headers });
            }
          }
        }
      );
      Networking.sendRequest(
        'GET',
        'asyncRequest',
        url,
        reqHeaders,
        '',
        'text',
        false,
        0,
        (requestId: string) => {
          id = requestId;
        },
        true
      );
    }
  ).finally(() => {
    dataListener?.remove();
    completeListener?.remove();
    responseListener?.remove();
  });
}
