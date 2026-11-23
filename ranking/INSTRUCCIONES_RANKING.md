# Ranking compartido de Parque Cota Cero

El juego funciona sin configurar nada; el ranking se guarda entonces solo en cada navegador.
Para que toda la clase comparta un ranking, conecta una hoja de Google siguiendo estos pasos (unos 10 minutos).

## 1. Crear la hoja y el script

1. Entra en [sheets.new](https://sheets.new) con tu cuenta de Google (mejor la del centro) y ponle nombre, por ejemplo «Ranking Cota Cero».
2. Menú **Extensiones → Apps Script**.
3. Borra el contenido de `Código.gs` y pega **todo** el archivo `Code.gs` de esta carpeta. Guarda (icono del disquete).

## 2. Publicarlo como aplicación web

1. Botón **Implementar → Nueva implementación**.
2. En «Seleccionar tipo» (rueda dentada) elige **Aplicación web**.
3. Rellena:
   - **Ejecutar como:** Yo (tu cuenta).
   - **Quién tiene acceso:** Cualquier usuario.
4. Pulsa **Implementar** y autoriza los permisos. Google avisará de que la aplicación no está verificada: pulsa «Configuración avanzada» y después «Ir a … (no seguro)». Es tu propio script.
5. Copia la **URL de la aplicación web**. Termina en `/exec`.

Para comprobarla, ábrela en el navegador: debe mostrar `{"ok":true,"service":"Parque Cota Cero · ranking"}`.

## 3. Lo que tienes que parametrizar

**Una sola cosa: la URL.** Tienes dos formas de ponerla.

- **Para toda la clase (recomendado antes de subir a GitHub):** abre `index.html` con un editor de texto, busca la línea

  ```js
  const RANKING_URL = "";
  ```

  y pega la URL entre las comillas:

  ```js
  const RANKING_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
  ```

- **Solo en un ordenador, sin tocar el código:** en el juego, **Panel docente → Ranking compartido**, pega la URL y pulsa **Guardar URL** y luego **Probar conexión**. Esta opción se guarda únicamente en ese navegador.

Opcional, si quieres cambiar cómo se puntúa: en `index.html`, el objeto `SCORING` controla la base, la bonificación por rapidez (máxima de 100 puntos, que baja a 0 a los 60 s), lo que restan los errores (25) y las pistas (30), y el multiplicador por intensidad (+15 % por nivel). Si lo cambias, cambia igual `maxScore` en `Code.gs`, porque el script rechaza puntuaciones imposibles.

## 4. Subir el juego a GitHub Pages

1. En GitHub crea un repositorio nuevo (por ejemplo `parque-cota-cero`), público.
2. **Add file → Upload files** y sube `index.html` (ya con la URL pegada).
3. **Settings → Pages → Branch: `main` / `(root)` → Save**.
4. En un par de minutos estará en `https://TU-USUARIO.github.io/parque-cota-cero/`.

No hace falta subir la carpeta `ranking` ni `src`: el juego es un único archivo.

## 5. Gestión del ranking

- Las partidas aparecen como filas en la pestaña **Ranking** de la hoja. Puedes ordenarlas, filtrarlas o borrar las que no quieras.
- Para empezar de cero (otra evaluación u otro grupo), borra todas las filas menos la cabecera.
- Si modificas `Code.gs`, vuelve a **Implementar → Gestionar implementaciones → Editar → Versión: Nueva**. Así conservas la misma URL.

## Notas

- Pide al alumnado que use un alias, sin nombre y apellidos. El juego no envía ningún otro dato personal.
- El script descarta envíos con puntuaciones imposibles o repetidos en menos de 10 segundos. Aun así, es un ranking de aula, no un sistema antitrampas.
- Si no hay conexión, la partida se guarda en el ranking local y el juego sigue funcionando con normalidad.
