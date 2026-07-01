/** Local texture paths for the 3D bookshelf scene. */

export const WOOD_WALNUT = "/bookshelf/walnut.jpg";
export const WOOD_SHELF = "/bookshelf/walnut-shelf.jpg";

export type AlbumArtKey =
  | "abbey-road"
  | "dark-side"
  | "zeppelin-iv"
  | "physical-graffiti"
  | "wish-you-were-here"
  | "skynyrd";

export function proxyImageUrl(remoteUrl: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(remoteUrl)}`;
}
