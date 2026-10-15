import type {MetadataRoute} from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HouseFamily', short_name: 'HouseFamily', description: 'One private place for everything your home needs.',
    start_url: '/en', display: 'standalone', background_color: '#F8F7F4', theme_color: '#1F5C45', orientation: 'portrait-primary',
    icons: [
      {src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png'},
      {src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png'},
      {src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
