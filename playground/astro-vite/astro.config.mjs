import { defineConfig } from 'astro/config';
import { astroIntegration as inspecto } from '@inspecto-dev/plugin/astro';

export default defineConfig({
  integrations: [inspecto()]
});
