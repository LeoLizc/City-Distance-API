const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/coordenadas', async (req, res) => {
  const { ciudades, key, pais = 'COL' } = req.query;

  if (!ciudades || !key) {
    return res.send('Faltan parámetros');
  }

  try {
    places = ciudades.split(',').map(ciudad => ({ ciudad, pais }));

    const coordenadas = await obtenerCoordenadas(places, key);

    res.send(coordenadas);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error al obtener coordenadas');
  }
});

app.get('/distancias', async (req, res) => {
  const { ciudades, key, pais = 'COL' } = req.query;

  if (!ciudades || !key) {
    return res.send('Faltan parámetros');
  }

  try {

    places = ciudades.split(',').map(ciudad => ({ ciudad, pais }));

    const coordenadas = await obtenerCoordenadas(places, key);

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

app.post('/distancias', async (req, res) => {
  const { lugares, opciones } = req.body;
  const key = req.headers.authorization;

  if (!lugares || !key) {
    return res.send('Faltan parámetros');
  }

  try {
    const coordenadas = await obtenerCoordenadas(lugares, key);

    let matrizDistancias = await obtenerMatrizDistancias(
      coordenadas.map(coordenada => [coordenada.longitud, coordenada.latitud]),
      key
    );


    if (opciones) {
      // pipeline de opciones colocadas como true
      if (opciones.simetrica) {
        matrizDistancias = await hacerSimetrica(matrizDistancias);
      }
    }
    res.send(matrizDistancias);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error al obtener coordenadas');
  }
});

async function obtenerCoordenadas(places, apiKey) {
  try {
    const promesasCoordenadas = places.map(async ({ ciudad, pais }) => {
      const response = await axios.get(
        `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${ciudad}&boundary.country=${pais}`
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
    const matrix = response.data.distances.map((fila, i) =>
      fila.map((valor, j) => (i !== j && !valor ? 1000000 : valor))
    );

    return matrix;
  } catch (error) {
    throw new Error('Error al obtener distancias');
  }
}

// La siguiente función recibe una matriz y la convierte en una matriz simétrica tomando el valor más pequeño entre la posición actual y la posición simétrica
async function hacerSimetrica(matriz) {
  const matrizSimetrica = matriz.map((fila, i) =>
    fila.map((valor, j) => Math.min(valor, matriz[j][i]))
  );

  return matrizSimetrica;
}

app.listen(port, () => {
  console.log(`El servidor está corriendo en puerto ${port}`);
});
