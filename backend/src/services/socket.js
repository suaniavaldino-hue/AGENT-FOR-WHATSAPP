let ioInstance = null;

export function setSocket(io) {
  ioInstance = io;
}

export function getSocket() {
  return ioInstance;
}
