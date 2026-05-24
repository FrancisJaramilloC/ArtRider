export const emailTemplates = {
  bookingRequest: (providerName: string, listingTitle: string, clientName: string) => `
    <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333;">
      <h2 style="color: #875B9A;">¡Nueva solicitud de reserva!</h2>
      <p>Hola <strong>${providerName}</strong>,</p>
      <p><strong>${clientName}</strong> ha solicitado alquilar tu equipo: <strong>${listingTitle}</strong>.</p>
      <p>Por favor, ingresa a tu panel de proveedor en ArtRider para revisar los detalles y confirmar la solicitud.</p>
      <br/>
      <a href="https://artrider.com/provider/bookingsProvider" style="background-color: #875B9A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Reserva</a>
      <br/><br/>
      <p>Saludos,<br/>El equipo de ArtRider</p>
    </div>
  `,

  bookingConfirmed: (clientName: string, listingTitle: string, providerName: string) => `
    <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333;">
      <h2 style="color: #875B9A;">¡Tu reserva ha sido confirmada!</h2>
      <p>Hola <strong>${clientName}</strong>,</p>
      <p>El proveedor <strong>${providerName}</strong> ha aceptado tu solicitud de alquiler para el equipo: <strong>${listingTitle}</strong>.</p>
      <p>Ingresa a tu cuenta de ArtRider para proceder con las firmas de seguridad y el pago.</p>
      <br/>
      <a href="https://artrider.com/bookings" style="background-color: #875B9A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir a mis Reservas</a>
      <br/><br/>
      <p>Saludos,<br/>El equipo de ArtRider</p>
    </div>
  `,

  bookingCancelled: (userName: string, listingTitle: string) => `
    <div style="font-family: sans-serif; max-w-xl; margin: 0 auto; color: #333;">
      <h2 style="color: #E53E3E;">Reserva Cancelada</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>La reserva para el equipo <strong>${listingTitle}</strong> ha sido cancelada.</p>
      <p>Si tienes alguna duda, por favor contáctanos o revisa los detalles en la plataforma.</p>
      <br/>
      <p>Saludos,<br/>El equipo de ArtRider</p>
    </div>
  `,
};
