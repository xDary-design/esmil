# Robot que revisa la pagina de admision

Hace lo mismo que harias tu: entra a la pagina cada hora a ver si ya se puede
inscribir. Si ve que ya funciona, escribe tu usuario y clave, y te manda un
correo con el resultado (y una foto de la pantalla). Si sigue cerrada, te
manda un correo cortito diciendo "todavia no".

## Probarlo en tu compu

1. `cp .env.example .env`
2. Abre `.env` y llena tus datos (usuario, clave, correo).
3. Para que el correo salga necesitas una "clave de aplicacion" de Gmail (no
   tu clave normal de todos los dias). Se crea en
   https://myaccount.google.com/apppasswords
4. `npm install`
5. `npm run install-browser` (descarga el navegador que usa el robot, una
   sola vez)
6. `npm run check`

Revisa tu correo, te debe llegar el aviso.

## Que corra solo en la nube, cada hora

Para esto ya viene listo GitHub Actions: es gratis, ya esta incluido en tu
proyecto de GitHub, y a diferencia de Zapier o Make, si sabe manejar un
navegador y hacer clic en botones por ti.

1. En tu repositorio: **Settings → Secrets and variables → Actions**.
2. Crea un secreto ("New repository secret") por cada dato de tu `.env`,
   con el mismo nombre: `TARGET_URL`, `PORTAL_USER`, `PORTAL_PASSWORD`,
   `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_EMAIL` (y `UNAVAILABLE_KEYWORDS`
   si lo usas).
3. Listo. En cuanto este codigo quede en la rama principal, GitHub lo va a
   ejecutar solo cada hora, sin tocar tu compu.

Como el repositorio recien se creo, falta fusionar esta rama a la rama
principal para que el reloj de "cada hora" se active.

Aviso: vas a recibir un correo cada hora, funcione o no funcione la pagina
(asi lo pediste). Si despues prefieres que solo te avise cuando algo
cambia, se puede ajustar facil.

## Si mas adelante quieres vigilar OTRA pagina

Solo cambias `TARGET_URL`. El archivo `check.js` no se toca. Si esa otra
pagina tiene el formulario en un sitio raro que el robot no encuentra solo,
ajustas `USERNAME_SELECTOR`, `PASSWORD_SELECTOR` o `SUBMIT_SELECTOR` en el
`.env`: es como indicarle con el dedo "el usuario va aqui, la clave va aca".

## Un detalle honesto

Desde donde arme este robot no pude abrir la pagina real (este taller no
tiene permiso para navegar paginas externas). Por eso el robot busca el
formulario de usuario/clave de forma automatica, en vez de depender del
diseno exacto de esa pagina puntual. Corre `npm run check` una vez para
confirmar que lo detecta bien; si no encuentra los campos, ajustas las 3
lineas opcionales del `.env` de arriba, sin tocar codigo.
