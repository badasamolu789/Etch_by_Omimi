import { createNewsletterHandler } from './handler.mjs';
Deno.serve(createNewsletterHandler({ env: name => Deno.env.get(name) }));
