// index.js
require('dotenv').config(); // Carga las variables de entorno del archivo .env
const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

// Middleware para poder leer los JSON que nos envíe Mercado Libre
app.use(express.json());

const { APP_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

// --- PASO 1: Redirigir al usuario para que autorice nuestra app ---
app.get('/', (req, res) => {
  // Creamos el link de autorización
  const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}`;
  res.send(`<a href="${authUrl}">Autorizar mi aplicación de Mercado Libre</a>`);
});

// --- PASO 2: Mercado Libre nos redirige aquí con un código temporal ---
app.get('/auth', async (req, res) => {
  const { code } = req.query; // Obtenemos el código de la URL

  if (!code) {
    return res.status(400).send('No se recibió el código de autorización.');
  }

  try {
    // --- PASO 3: Cambiamos el código por un access_token permanente ---
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: APP_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
    });

    const { access_token, refresh_token } = response.data;

    // !! IMPORTANTE !!
    // En una aplicación real, DEBES guardar este access_token y refresh_token
    // en una base de datos de forma segura. Para este tutorial, solo lo mostraremos.
    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token);
    
    res.send('¡Autorización exitosa! Revisa la consola para ver tus tokens. Guarda el access_token para el siguiente paso.');

  } catch (error) {
    console.error('Error al obtener el token:', error.response?.data || error.message);
    res.status(500).send('Error al obtener el token.');
  }
});

// Importamos y usamos la ruta de notificaciones que crearemos en el siguiente paso
//const notificationsRouter = require('./api/notifications');
//app.use('/api', notificationsRouter);

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  console.log('Visita la URL de arriba para autorizar tu aplicación.');
});