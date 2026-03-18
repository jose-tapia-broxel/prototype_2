# Deploying to Vercel

This Angular SSR application is now configured to deploy to Vercel. Follow these steps to deploy your application.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier available)
- [Vercel CLI](https://vercel.com/docs/cli) installed (optional, but recommended)

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended for first deployment)

1. **Push your code to a Git repository**
   ```bash
   git init
   git add .
   git commit -m "Configure for Vercel deployment"
   git remote add origin <your-repository-url>
   git push -u origin main
   ```

2. **Import your project to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository
   - Vercel will automatically detect the Angular framework

3. **Configure Environment Variables (if needed)**
   - In the project settings, add any environment variables
   - For example: `GEMINI_API_KEY`

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI globally**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # For preview deployment
   vercel
   
   # For production deployment
   vercel --prod
   ```

## Configuration Files

The following files have been created/modified for Vercel deployment:

- **`vercel.json`**: Vercel deployment configuration
- **`api/render.ts`**: Serverless function entry point for SSR
- **`.vercelignore`**: Files to exclude from deployment
- **`package.json`**: Updated build scripts

## Build Configuration

The application uses the following build configuration:

- **Build Command**: `npm run build` (runs `ng build --configuration production`)
- **Output Directory**: `dist/app`
- **Serverless Function**: `/api/render.ts`

## Environment Variables

If your application uses environment variables (like `GEMINI_API_KEY`), you need to configure them in Vercel:

1. Go to your project settings in Vercel Dashboard
2. Navigate to "Environment Variables"
3. Add your variables for Production, Preview, and Development environments

Example:
- **Name**: `GEMINI_API_KEY`
- **Value**: `your-api-key-here`
- **Environments**: Production, Preview, Development

## Local Testing

To test the production build locally before deploying:

```bash
# Build the application
npm run build

# Serve the SSR application
npm run serve:ssr:app
```

Visit `http://localhost:4000` to view the application.

## Troubleshooting

### Build Fails

- Check the build logs in Vercel Dashboard
- Ensure all dependencies are listed in `package.json`
- Verify that `@vercel/node` is in devDependencies

### Pages Not Loading

- Check the serverless function logs in Vercel Dashboard
- Ensure the `api/render.ts` path is correct
- Verify that the Angular SSR build completed successfully

### Environment Variables Not Working

- Double-check variable names (case-sensitive)
- Ensure variables are set for the correct environment (Production/Preview)
- Redeploy after adding new environment variables

## Updating Your Deployment

Vercel automatically deploys new commits:

1. Make your changes locally
2. Commit and push to your Git repository
3. Vercel will automatically build and deploy

Or use the CLI:
```bash
vercel --prod
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Angular SSR on Vercel](https://vercel.com/docs/frameworks/angular)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

## Support

If you encounter issues:
- Check [Vercel's Status Page](https://www.vercel-status.com/)
- Visit [Vercel Community](https://github.com/vercel/vercel/discussions)
- Review [Angular SSR Documentation](https://angular.dev/guide/ssr)
