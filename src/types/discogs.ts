export interface DiscogsImage {
  type: 'primary' | 'secondary';
  uri: string;
  width: number;
  height: number;
}

export interface DiscogsMember {
  id: number;
  name: string;
  active: boolean;
}

export interface DiscogsRelease {
  id: number;
  title: string;
  year?: number;
  type: string;
  role: string;
  label?: string;
}

export interface DiscogsArtistInfo {
  discogsId: number;
  name: string;
  realName?: string;
  profile?: string;
  images: DiscogsImage[];
  genres: string[];
  styles: string[];
  urls: string[];
  members?: DiscogsMember[];
  discography: DiscogsRelease[];
}
