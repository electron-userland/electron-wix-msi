import http from 'http';
import serve from 'serve-handler';

let server: http.Server;

export const serveSquirrel = (path: string) => {
  process.chdir(path);
  server = http.createServer((request, response) => {
    return serve(request, response);
  });
  server.listen(3000);
  return  'http://localhost:3000';
};

export const stopServingSquirrel = () => {
  server.close();
};
