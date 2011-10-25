var http = require("http");
var readFile = require("fs").readFile;

s = http.createServer(function(request, response) {
  if (request.url == "/" || request.url == "/index.html") {
    readFile("index.html", function(err, data) {
      response.writeHead(200, {"Content-Type" : "text/html"});
      response.end(data, "utf8");
    });
  } else {
    readFile("file2.html", function(err, data) {
      response.writeHead(200, {"Content-Type" : "text/html"});
      response.end(data, "utf8");
    });
  }
});

s.listen(8081);