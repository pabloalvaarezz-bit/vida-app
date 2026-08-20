# VIDA/OS

Tu vida entera — **hábitos, entrenamientos, salud, estudios y finanzas** — en un único panel, en blanco y negro, con verde para lo que va bien y rojo para lo que no.

Es una **PWA** (web app instalable): no necesita build, ni Node, ni npm. Son archivos HTML/CSS/JS puros. Se sube tal cual a GitHub y se abre en Safari.

**Todos los datos se guardan solo en tu iPhone** (`localStorage`), no hay servidor ni cuenta. Eso significa dos cosas importantes:
- Nadie más ve tus datos.
- Si borras Safari/el sitio o cambias de móvil, los pierdes — usa **Ajustes → Exportar** de vez en cuando para tener un backup en JSON.

---

## 1. Subir a GitHub

```bash
cd vida-app
git init
git add .
git commit -m "VIDA/OS: primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/vida-app.git
git push -u origin main
```

## 2. Activar GitHub Pages

1. En tu repo de GitHub, ve a **Settings → Pages**.
2. En "Source", elige la rama `main` y la carpeta `/ (root)`.
3. Guarda. En 1-2 minutos tu app estará en:
   `https://TU_USUARIO.github.io/vida-app/`

## 3. Instalarla en tu iPhone

1. Abre esa URL con **Safari** (tiene que ser Safari, no Chrome, para que funcione el "Añadir a inicio").
2. Toca el icono de **compartir** (el cuadrado con la flecha hacia arriba).
3. Baja y toca **"Añadir a pantalla de inicio"**.
4. Listo: te aparece un icono como el de cualquier app, a pantalla completa, sin la barra de Safari, y funciona offline gracias al service worker.

---

## Estructura del proyecto

```
vida-app/
├── index.html              # shell de la app
├── manifest.json           # metadata de la PWA (nombre, iconos, colores)
├── service-worker.js       # cache offline
├── css/
│   ├── tokens.css          # paleta de color, tipografía, variables
│   ├── layout.css          # header, tabs, tarjetas, sheets/modales
│   └── calendar.css        # el mapa de calor tipo GitHub
├── js/
│   ├── app.js               # router entre pestañas
│   ├── storage.js           # capa de datos (localStorage)
│   ├── dates.js              # utilidades de fecha
│   ├── dom.js                 # helpers para crear elementos sin framework
│   ├── scoring.js             # cálculo del "día" para el calendario
│   └── modules/
│       ├── dashboard.js       # pestaña "Hoy"
│       ├── habits.js          # hábitos diarios/semanales + rachas
│       ├── workouts.js        # entrenamientos
│       ├── health.js          # peso, sueño, agua, ánimo
│       ├── study.js           # tareas + pomodoro por asignatura
│       ├── finance.js         # gastos/ingresos + presupuestos
│       ├── calendar.js        # mapa de calor + detalle por día
│       └── settings.js        # objetivos, exportar/importar, borrar datos
└── icons/                   # iconos de la PWA
```

No hay dependencias externas salvo las tipografías de Google Fonts (se cargan por CDN, no afectan al funcionamiento offline del resto de la app).

## El "mapa de calor" del calendario

La pestaña **Calendario** dibuja cada día como una celda, igual que el gráfico de contribuciones de GitHub — un guiño a que la app vive ahí. El color de cada día se calcula combinando:

- % de hábitos completados ese día,
- si hubo entrenamiento,
- si el gasto del día estuvo dentro de tu presupuesto medio diario.

Verde = día bueno, rojo = día flojo, gris = sin datos ese día. Tócalo para ver el detalle completo de esa fecha.

## Ideas para ampliar

- Gráficas más avanzadas (recharts, chart.js) si en algún momento quieres meter un bundler.
- Notificaciones locales (Notification API) para recordatorios de hábitos.
- Widgets de iOS 17+ vía Shortcuts, leyendo un JSON expuesto por la app.
- Sincronización real entre dispositivos con un backend ligero (Supabase, Firebase) si algún día decides que ya no quieres que sea 100% local.

---

Hecho a medida. Edita el código con confianza — no hay build ni magia, es HTML/CSS/JS legible de arriba a abajo.
