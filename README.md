
Aplicación full-stack mínima que ilustra cómo capturar un monto desde una interfaz web, validarlo mediante reconocimiento facial y crear un intento de pago contra el servicio de OpenPayments.

Se ejecuta la app:
   npm install
   npm run dev

La UI permite:
- Ingresar monto y moneda.
- Identificar al usuario (`userId`).
- Capturar el token de reconocimiento facial (`faceAuthToken`) y resultado del proveedor biométrico.
- Mostrar mensajes de estado y detalles del intento de pago devuelto por OpenPayments.



