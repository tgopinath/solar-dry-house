// Google sign-in (required) and profile, shared with Gopinath's other apps: see kolam-design-system/auth.
import { KolamAuth } from 'https://tgopinath.github.io/kolam-design-system/auth/kolam-auth.js'
KolamAuth.init({
  app: 'solardryhouse', appName: 'Solar Dry House', icon: 'icons/icon-192.png',
  tagline: 'Save your location and dryer plan to your account, so they follow you between your phone and the web.',
  fields: [
    { key: 'place', label: 'Place', placeholder: 'e.g. Coimbatore' },
    { key: 'dryerSize', label: 'Dryer size (sq m)', type: 'number' },
  ],
  avatarSlot: 'header.top',
  sync: ['sdh-loc', 'sdh-area', 'sdh-target'],
})
