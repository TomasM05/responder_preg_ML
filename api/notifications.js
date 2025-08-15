// api/notifications.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Leemos las credenciales y listas desde las Variables de Entorno
const { ACCESS_TOKEN, SKU_LIST, CATEGORIAS_PERMITIDAS_LIST } = process.env;

router.post('/notifications', async (req, res) => {
  console.log('Notificación recibida:', req.body);

  const notification = req.body;

  if (notification.topic === 'orders_v2') {
    try {
      async function meliApiRequest(config) {
        config.headers = { ...config.headers, 'Authorization': `Bearer ${ACCESS_TOKEN}` };
        return await axios(config);
      }

      const orderResponse = await meliApiRequest({ url: notification.resource, method: 'GET' });

      const order = orderResponse.data;
      const packId = order.pack_id;
      const buyerId = order.buyer.id;
      const sellerId = order.seller.id;

      if (!packId) {
        console.log(`La orden ${order.id} no tiene pack_id. No se pueden enviar mensajes.`);
        return res.status(200).send('OK');
      }

      const skuListString = SKU_LIST || '';
      const skusParaChasis = skuListString.split(',');

      const esParaChasis = order.order_items.some(
        item => skusParaChasis.includes(item.item.seller_sku)
      );

      if (esParaChasis) {
        // CAMINO 1: Si el SKU ESTÁ en la lista, preguntamos por el chasis.
        console.log(`La orden ${order.id} contiene un SKU específico. Enviando mensaje para CHASIS.`);
        
        // --- AQUÍ ESTÁ EL CÓDIGO DEL MENSAJE QUE FALTABA ---
        const mensajeChasis = {
          from: { user_id: sellerId },
          to: { user_id: buyerId },
          text: `¡Hola ${order.buyer.first_name}! Muchas gracias por tu compra. ¿Podrías pasarme el número de chasis del vehículo? Así verifico que la compra sea correcta. ¡Saludos!`
        };
        
        await meliApiRequest({
            url: `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${sellerId}`,
            method: 'POST',
            data: mensajeChasis
        });
        console.log("Mensaje de chasis enviado.");

      } else {
        // CAMINO 2: Si el SKU NO ESTÁ en la lista, verificamos la categoría y sus padres.
        console.log(`La orden ${order.id} es una compra general. Verificando categoría...`);

        const itemId = order.order_items[0].item.id;
        const itemResponse = await meliApiRequest({ url: `https://api.mercadolibre.com/items/${itemId}`, method: 'GET' });
        const categoryId = itemResponse.data.category_id;
        
        const categoryDetailsResponse = await meliApiRequest({ url: `https://api.mercadolibre.com/categories/${categoryId}`, method: 'GET' });
        
        const pathFromRoot = categoryDetailsResponse.data.path_from_root;
        
        const categoriasPadrePermitidasString = CATEGORIAS_PERMITIDAS_LIST || '';
        const categoriasPadrePermitidas = categoriasPadrePermitidasString.split(',');

        const esCategoriaValida = pathFromRoot.some(
          category => categoriasPadrePermitidas.includes(category.id)
        );

        if (esCategoriaValida) {
          console.log(`La categoría ${categoryId} es subcategoría de una permitida. Enviando mensaje para MODELO/MOTOR.`);
        
          const mensajeModeloMotor = {
            from: { user_id: sellerId },
            to: { user_id: buyerId },
            text: `¡Hola ${order.buyer.first_name}! Muchas gracias por tu compra. Para asegurar la compatibilidad de la pieza, ¿podrías indicarme el modelo, año y motor de tu vehículo? ¡Gracias!`
          };

          await meliApiRequest({
              url: `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${sellerId}`,
              method: 'POST',
              data: mensajeModeloMotor
          });

          console.log("Mensaje de modelo/motor enviado.");
        } else {
          console.log(`La categoría ${categoryId} no pertenece a ninguna categoría padre permitida. No se envía mensaje.`);
        }
      }

    } catch (error) {
      console.error('Error procesando la notificación:', error.response?.data || error.message);
    }
  }

  res.status(200).send('Notificación recibida');
});

module.exports = router;