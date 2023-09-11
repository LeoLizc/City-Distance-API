const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const axios = require('axios');

app.get('/coordenadas', async (req, res) => {
  const { ciudades, key, country = 'COL' } = req.query;

  if (!ciudades || !key) {
    return res.send('Faltan parámetros');
  }

  try {
    const coordenadas = await obtenerCoordenadas(ciudades.split(','), key);

    res.send(coordenadas);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error al obtener coordenadas');
  }
});

app.get('/distancias', async (req, res) => {
  const { ciudades, key, country = 'COL' } = req.query;

  if (!ciudades || !key) {
    return res.send('Faltan parámetros');
  }

  try {
    const coordenadas = await obtenerCoordenadas(ciudades.split(','), key);

    const matrizDistancias = await obtenerMatrizDistancias(
      coordenadas.map(coordenada => [coordenada.longitud, coordenada.latitud]),
      key
    );

    res.send(matrizDistancias);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error al obtener coordenadas');
  }
});

async function obtenerCoordenadas(ciudades, apiKey, country = 'COL') {
  try {
    const promesasCoordenadas = ciudades.map(async ciudad => {
      const response = await axios.get(
        `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${ciudad}&boundary.country=${country}`
      );
      const coordenadas = response.data.features[0].geometry.coordinates;
      return { ciudad, latitud: coordenadas[1], longitud: coordenadas[0] };
    });

    return Promise.all(promesasCoordenadas);
  } catch (error) {
    throw new Error('Error al obtener coordenadas');
  }
}

async function obtenerMatrizDistancias(coordenadas, apiKey) {
  try {
    const response = await axios.post(
      `https://api.openrouteservice.org/v2/matrix/driving-car`,
      {
        locations: coordenadas,
        metrics: ['distance'],
        units: 'km',
        resolve_locations: true,
      },
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    return response.data.distances;
  } catch (error) {
    throw new Error('Error al obtener distancias');
  }
}

app.listen(port, () => {
  console.log(`El servidor está corriendo en puerto${port}`);
});
