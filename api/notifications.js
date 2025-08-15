// api/notifications.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// !! PEGA AQUÍ EL ACCESS TOKEN QUE OBTUVISTE EN LA FASE 3 !!
// En Vercel, esto lo configuraremos como una Variable de Entorno.
const ACCESS_TOKEN = 'APP_USR-3241028424517864-080612-81543bd3a162df90312bc199afe89a42-803031969'; 

// El SKU del producto para el cual quieres enviar los mensajes automáticos
const SKU_ESPECIFICO = '228315';

router.post('/notifications', async (req, res) => {
  console.log('Notificación recibida:', req.body);

  const notification = req.body;

  // Solo nos interesan las notificaciones de órdenes
  if (notification.topic === 'orders_v2') {
    try {
      // 1. Obtener los datos completos de la orden usando el access token
      const orderResponse = await axios.get(notification.resource, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      });

      const order = orderResponse.data;
      const packId = order.pack_id; // ID del paquete, necesario para enviar mensajes
      const buyerId = order.buyer.id;

      // 2. Filtrar: ¿La orden contiene nuestro producto específico?
      const tieneProductoEspecifico = order.order_items.some(
        item => item.item.seller_sku === SKU_ESPECIFICO
      );

      if (tieneProductoEspecifico && packId) {
        console.log(`La orden ${order.id} contiene el SKU ${SKU_ESPECIFICO}. Enviando mensajes.`);

        // 3. Enviar el primer mensaje (post-compra)
        const mensaje1 = {
          from: { user_id: order.seller.id },
          to: { user_id: buyerId },
          text: `¡Hola ${order.buyer.first_name}! Muchas gracias por tu compra. ¿Podrías pasarme el número de chasis del vehículo? Así verifico que la compra sea correcta. ¡Saludos!`
        };
        
        await axios.post(`https://api.mercadolibre.com/messages/packs/${packId}/sellers/${order.seller.id}`, mensaje1, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        
        console.log("Primer mensaje enviado.");

        // Aquí podrías programar el segundo mensaje para más tarde,
        // pero para simplificar, lo enviaremos de inmediato a modo de ejemplo.
        // En una app real, esperarías al estado "delivered".        

      } else {
        console.log(`La orden ${order.id} no contiene el SKU específico o no tiene pack_id. No se envían mensajes.`);
      }

    } catch (error) {
      console.error('Error procesando la notificación:', error.response?.data || error.message);
    }
  }

  // Siempre debemos responder con un 200 OK para que Mercado Libre sepa que recibimos la notificación.
  res.status(200).send('Notificación recibida');
});

module.exports = router;