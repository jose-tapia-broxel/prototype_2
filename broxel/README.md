<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c94396c4-dfbb-431a-b4fe-a83f2df7c0b7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Vercel (frontend + backend SSR/API)

This project is configured to deploy both frontend and backend through Vercel using:

- `outputDirectory: dist/app/browser` for static browser assets.
- `api/render.ts` as the backend entrypoint (SSR + Express API routes).
- `functions.api/render.ts` runtime settings (`@vercel/node`, memory, max duration, and `includeFiles` for `dist/app/server/**`).

Deployment steps:

1. Import the repository in Vercel.
2. Ensure project root is `broxel`.
3. Add required environment variables (for example `GEMINI_API_KEY`).
4. Deploy with defaults (Vercel will use `vercel.json` + `npm run build`).

## Documentación de arquitectura

- Diseño de asistente de explicabilidad reactiva: [`docs/asistente-explicabilidad-reactiva.md`](docs/asistente-explicabilidad-reactiva.md)
