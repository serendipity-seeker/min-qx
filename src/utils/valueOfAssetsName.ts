export const valueOfAssetName = (asset: string): bigint => {
  const bytes = new Uint8Array(8);
  bytes.set(new TextEncoder().encode(asset));
  return new DataView(bytes.buffer).getBigInt64(0, true);
};
