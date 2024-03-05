import http from "http";
import * as nodeStatic from "node-static";

let nodeStaticServer: nodeStatic.Server;
let server: http.Server;

export const serveSquirrel = (path: string) => {
  nodeStaticServer =
    nodeStaticServer || new nodeStatic.Server(path, { cache: false });
  server =
    server ||
    http.createServer((request, response) => {
      nodeStaticServer.serve(request, response);
    });
  server.listen(3000);
  return "http://localhost:3000";
};

export const stopServingSquirrel = () => {
  server.close();
};
