# The Predictive Engine — Calculadoras GTM & RevOps

Sitio gratuito con calculadoras para GTM / RevOps. Una portada y una página por herramienta.

| Ruta | Herramienta |
|---|---|
| `/` | Portada |
| `/tools/unit-economics` | CAC, LTV y payback |
| `/tools/pipeline-coverage` | Embudo y cobertura de pipeline |
| `/tools/sales-capacity` | Capacidad y cuota de ventas |
| `/tools/retention-impact` | Churn, NRR y retención |
| `/tools/verification-tax` | ROI de code review (ingeniería) |

## Desarrollo local
```
npm install
npm run dev
```
(`/api/subscribe` solo funciona en Vercel o con `vercel dev`; en `npm run dev` el desbloqueo usa un modo de prueba.)

## Despliegue (Vercel)
1. Sube este proyecto a un repo de GitHub e impórtalo en Vercel (Framework: Vite, sin cambiar nada).
2. En Settings → Environment Variables agrega, para Production y Preview:
   - `BEEHIIV_API_KEY`
   - `BEEHIIV_PUBLICATION_ID`
3. Redespliega.

Nunca subas claves al repo: `.env` ya está en `.gitignore`.

## Estructura
- `src/registry.js` — lista de herramientas. Para agregar una nueva: crea el componente en `src/tools/` y añádela aquí.
- `src/shared/` — componentes y utilidades compartidas (UI, router, desbloqueo por email, PDF/Excel, sensibilidad).
- `src/tools/*.logic.js` — modelos de cálculo puros, sin React.
- `api/subscribe.js` — suscripción a Beehiiv.
