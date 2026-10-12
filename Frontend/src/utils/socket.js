import io from 'socket.io-client';
import { VITE_BACKEND_SOCKET_IO } from '../config/config';
import { getAccessToken } from '../helpers/accessToken';

const socket = io(VITE_BACKEND_SOCKET_IO, {
  autoConnect: false,
  withCredentials: true,
  path: '/socket.io',
  auth: () => ({ token: getAccessToken() || '' }),
});

export const initSocket = () => {
  // if (!socket.connected) {
  //   socket.connect();
  // }
  socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;
