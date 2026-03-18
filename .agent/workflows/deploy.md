---
description: Deploy to Vercel production
---
# Deploy to Vercel

// turbo-all

## Steps

1. Run `vercel --prod` from the repo root directory:
```bash
cd /Users/huangshifeng/Desktop/痔瘡AI衛教 && vercel --prod
```

> **Important**: Always run from the **repo root** (not `prototype/`).  
> Vercel Dashboard Root Directory = `prototype/`, so it will automatically find the build files.  
> Running from `prototype/` would cause double-nesting (`prototype/prototype/`).

2. Verify the deployment:
```bash
curl -s https://prototype-zeta-black.vercel.app/ | grep -o 'src="[^"]*\.js"'
```
