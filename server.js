// some parts are not my own code

const http = require("http");
const fs = require("fs");
const urlLib = require("url");
const pug = require("pug");

const serverContext = {
  rootDir: "./client/",
  port: 2406,
};

function send404(res, err) {
  res.writeHead(404);
  res.end("404 Not Found" + err);
}
function send500(res, err) {
  res.writeHead(500);
  res.end("500 Server Error" + err);
}

// some arrays to store data
const allResJSONData = [];
const resNames = [];
const allResStats = [];
const itemSummary = [];
let numOfRestaurants = 0;

// create the server
const httpServerOne = http.createServer((req, res) => {
  let url = urlLib.parse(req.url, true);

  // home page
  if (
    req.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/home.html")
  ) {
    // read home.html file and send data to client
    let filepath = serverContext.rootDir + "/home.html";

    fs.readFile(filepath, (err, data) => {
      if (err) {
        send404(res, err);
        return;
      }
      //determine content type based on file extension
      let ext = filepath.split(".").pop();
      let contentType = "text/plain";
      if (ext === "html") contentType = "text/html";
      else if (ext === "css") contentType = "text/css";
      else if (ext === "js") contentType = "application/javascript";
      //add more content types as needed

      //send file contents
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  }
  // order form page
  else if (req.method === "GET" && url.pathname === "/orderForm.html") {
    //static server for client files
    //determine requested file's path

    // read orderForm.html and send data to client
    let filepath = serverContext.rootDir + url.pathname;

    //get file from filesystem

    fs.readFile(filepath, (err, data) => {
      if (err) {
        send404(res, err);
        return;
      }
      //determine content type based on file extension
      let ext = filepath.split(".").pop();
      let contentType = "text/plain";
      if (ext === "html") contentType = "text/html";
      else if (ext === "css") contentType = "text/css";
      else if (ext === "js") contentType = "application/javascript";
      //add more content types as needed

      //send file contents
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  }
  // send restaurant names to client to initialize drop-down list
  else if (req.method === "GET" && url.pathname === "/restaurants") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resNames));
  }
  // send restaurant information to client
  else if (req.method === "GET" && url.pathname === "/resInfo") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(allResJSONData));
  }
  // template engine stats page
  else if (req.method === "GET" && url.pathname === "/stats.html") {
    // render pug file with array storing stats data as argument
    let data = pug.renderFile("stats.pug", { stats: allResStats });
    res.writeHead(200, { "Content-Type": "" });
    res.end(data);
  }
  // get the information of the submitted order
  else if (req.method === "POST" && url.pathname === "/orderInfo") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let submission = JSON.parse(body);
      let resIndex = 0;

      for (let i = 0; i < numOfRestaurants; i++) {
        // check which restaurant it is
        if (submission.resName === resNames[i]) {
          resIndex = i;
        }
      }

      // update the stat info for the restaurant
      allResStats[resIndex].totalOrders += 1;
      allResStats[resIndex].totalTotal += submission.total;
      allResStats[resIndex].avgTotal =
        allResStats[resIndex].totalTotal / allResStats[resIndex].totalOrders;

      const orders = submission.orders.slice(1, submission.orders.length);
      const orders2 = [];

      // adding to map of items and their count
      // if not in map already, add it with the count in the order submission
      // if already in map, increment its existing value with
      // count in order submission
      orders.forEach((order, index) => {
        let dots = order.indexOf("...");
        let openingBracket = order.indexOf("(");
        let closingBracket = order.indexOf(")");

        orders2.push(order.slice(openingBracket + 1, closingBracket));

        orders[index] = order.slice(3, dots);

        if (itemSummary[resIndex].has(orders[index])) {
          console.log("yes");
          let originalValue = itemSummary[resIndex].get(orders[index]);
          itemSummary[resIndex].set(
            orders[index],
            parseInt(originalValue) + parseInt(orders2[index])
          );
        } else {
          itemSummary[resIndex].set(orders[index], orders2[index]);
        }
      });

      // check which item as the highest count
      // and set it as the new highest
      // to keep track of the most popular item
      let highest = 0;

      for (const key of itemSummary[resIndex].keys()) {
        if (parseInt(itemSummary[resIndex].get(key)) > highest) {
          allResStats[resIndex].popItem = key;
          highest = parseInt(itemSummary[resIndex].get(key));
        }
      }

      // send res stats to client
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(allResStats));
    });
  }
});

// read the json files and add info to storage arrays
fs.readdir("./restaurants", (err, files) => {
  if (err) {
    console.error("Error reading directory:", err);
    return;
  }

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const jsonData = require("./restaurants/" + file);
      allResJSONData.push(JSON.stringify(jsonData));
      resNames.push(Object.values(jsonData)[1]);
      itemSummary.push(new Map());
      allResStats.push({
        name: Object.values(jsonData)[1],
        totalOrders: 0,
        totalTotal: 0,
        avgTotal: 0,
        popItem: "item",
      });
      numOfRestaurants += 1;
    }
  });

  // listen to clients
  httpServerOne.listen(serverContext.port);
});

console.log(`Server running at http://localhost:${serverContext.port}/`);

