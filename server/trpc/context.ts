export type TrpcContext = {
  requestId: string;
};

export async function createTrpcContext(): Promise<TrpcContext> {
  return {
    requestId: crypto.randomUUID(),
  };
}
