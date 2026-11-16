# The Predictive Engine — Calculadoras GTM & RevOps

Sitio gratuito con calculadoras para GTM / RevOps. Una portada y una página por herramienta.

22 herramientas en 6 categorías (menú **Tools** y rutas `/category/<slug>`):

| Categoría | Herramientas |
|---|---|
| GTM | CAC/LTV/Payback, Pipeline y Embudo, Sales Velocity, Price Change Break-even |
| Marketing | Campaign ROI/ROAS, A/B Test Planner, Email List Value |
| RevOps | Sales Capacity, Comp Plan Cost, Sales Rep Turnover, Process Automation ROI, GTM Tech Stack Waste |
| Customer Success | Retention/NRR, Support Deflection, CS Capacity |
| Finanzas | Cash Runway y Burn Multiple, Rule of 40, Investment Case (NPV/IRR), Build vs Buy |
| Ingeniería | Code Review ROI (Verification Tax), Technical Debt, Downtime Cost |

Cada herramienta vive en `/tools/<slug>` (ver `src/registry.js`).

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
- `src/registry.js` — categorías y herramientas. Para agregar una nueva: crea `src/tools/miHerramienta.config.js` (copia una existente, p. ej. `salesVelocity.config.js`) y añádela aquí con `cfg('miHerramienta')`.
- `src/shared/` — componentes y utilidades compartidas (UI, router, desbloqueo por email, PDF/Excel, sensibilidad).
- `src/tools/*.logic.js` — modelos de cálculo puros, sin React.
- `api/subscribe.js` — suscripción a Beehiiv.
- `src/shared/ToolRunner.jsx` — motor que convierte un `*.config.js` en la página completa (inputs, KPIs, escenarios, sensibilidad, benchmarks, PDF y Excel).

## Excel
Los Excel se generan con ExcelJS: una hoja por sección (Summary, Assumptions, Scenarios, Sensitivity, Benchmarks), formatos numéricos reales (moneda, %, múltiplos), encabezados fijos y listos para imprimir. No incluyen gráficos incrustados.
