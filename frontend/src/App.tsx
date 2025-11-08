import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import './App.css';

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface PaymentResponse {
  message: string;
  data?: {
    intentId?: string;
    status?: string;
    approvalUrl?: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

function App() {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [faceAuthToken, setFaceAuthToken] = useState<string | null>(null);
  const [faceAuthStatus, setFaceAuthStatus] = useState<'idle' | 'capturing' | 'verified' | 'error'>('idle');
  const [faceAuthMessage, setFaceAuthMessage] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const userId = 'demo-user';

  const amountValue = useMemo(() => Number.parseFloat(amount), [amount]);

  const isSubmitDisabled = useMemo(() => {
    return Number.isNaN(amountValue) || amountValue <= 0 || !currency || !faceAuthToken || status === 'processing';
  }, [amountValue, currency, faceAuthToken, status]);

  useEffect(() => {
    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaStream]);

  useEffect(() => {
    const video = videoRef.current;

    if (video && mediaStream) {
      video.srcObject = mediaStream;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('No se pudo iniciar la reproducción del video automáticamente.', error);
        });
      }
    }
  }, [mediaStream]);

  const stopCamera = () => {
    mediaStream?.getTracks().forEach((track) => track.stop());
    setMediaStream(null);
    setIsCameraActive(false);
  };

  const handleStartFaceAuth = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setFaceAuthStatus('error');
      setFaceAuthMessage('Tu navegador no soporta acceso a la cámara.');
      return;
    }

    try {
      setFaceAuthStatus('capturing');
      setFaceAuthMessage('Apunta tu rostro a la cámara para validar tu identidad.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn('No se pudo reproducir el stream inmediatamente.', error);
          });
        }
      }
    } catch (error) {
      console.error(error);
      setFaceAuthStatus('error');
      setFaceAuthMessage('No fue posible acceder a la cámara. Verifica permisos.');
      stopCamera();
    }
  };

  const handleCompleteFaceAuth = () => {
    const token = `valid-${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
    setFaceAuthToken(token);
    setFaceAuthStatus('verified');
    setFaceAuthMessage('Identidad verificada. Puedes continuar con el pago.');
    stopCamera();
  };

  const handleCancelFaceAuth = () => {
    setFaceAuthStatus('idle');
    setFaceAuthToken(null);
    setFaceAuthMessage('');
    stopCamera();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('processing');

    try {
      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountValue,
          currency,
          userId,
          faceAuthToken,
        }),
      });

      const payload: PaymentResponse = await response.json();

      if (!response.ok) {
        setStatus('error');
        console.error(payload.message ?? 'No se pudo procesar el pago.');
        return;
      }

      setStatus('success');
      console.info(payload.message, payload.data);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>Demo de Pagos con OpenPayments</h1>
        <p>Ingresa el monto, selecciona la moneda y verifica al usuario mediante reconocimiento facial para procesar el pago.</p>
      </header>

      <main className="app__main">
        <form className="payment-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="amount">Monto</label>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Ej. 49.99"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="currency">Moneda</label>
            <select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>

          <div className="face-auth">
            <div className="face-auth__content">
              <h2>Verificación facial</h2>
              <p>
                Necesitamos validar tu identidad mediante reconocimiento facial. Presiona el botón inferior para iniciar la cámara.
              </p>
            </div>

            {isCameraActive ? (
              <div className="face-auth__capture">
                <video ref={videoRef} autoPlay playsInline muted className="face-auth__video" />
                <div className="face-auth__actions">
                  <button type="button" className="secondary" onClick={handleCancelFaceAuth}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCompleteFaceAuth}>
                    Confirmar identidad
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={handleStartFaceAuth}
                disabled={faceAuthStatus === 'capturing'}
              >
                {faceAuthStatus === 'verified' ? 'Reiniciar verificación facial' : 'Iniciar verificación facial'}
              </button>
            )}

            {faceAuthMessage && (
              <p
                className={`face-auth__status ${
                  faceAuthStatus === 'error' ? 'error' : faceAuthStatus === 'verified' ? 'success' : 'info'
                }`}
              >
                {faceAuthMessage}
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitDisabled}>
            {status === 'processing' ? 'Procesando...' : 'Procesar Pago'}
          </button>
        </form>

      </main>
    </div>
  );
}

export default App;
