const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
require("dotenv").config();
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['https://taskly-d02fb.web.app/', 'http://localhost:5173'],
  credentials: true 
}));
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.joj1d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let tasksCollection;

async function run() {
  try {
    // Connect to MongoDB client and initialize tasksCollection
    await client.connect();
    tasksCollection = client.db("taskManager").collection("task");
    userCollection = client.db("taskManager").collection("user")
    console.log("Connected to MongoDB");

    // MongoDB Change Stream to listen for updates on the tasks collection
    const changeStream = tasksCollection.watch();
    changeStream.on("change", (change) => {
      console.log("Change detected:", change);

      // Broadcast the change to all connected WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(change));
        }
      });
    });

    // Start the server after DB connection is established
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error occurred during MongoDB connection:", error);
  }
}

// Start MongoDB connection
run().catch((error) => console.error("MongoDB connection failed:", error));

app.get("/", (req, res) => {
  res.send("taskmanager");
});

app.post("/users", async (req, res) => {
  const user = req.body;
  
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

// Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    if (!tasksCollection) {
      console.error("MongoDB not connected or tasksCollection not initialized");
      return res.status(500).json({ message: "Database connection error" });
    }
    const tasks = await tasksCollection.find({}).toArray();
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Error retrieving tasks", error });
  }
});

// Add a new task
app.post("/tasks", async (req, res) => {
  const { title, description, category } = req.body;

  if (!title || !description || !category) {
    console.error("Missing required fields:", { title, description, category });
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const newTask = {
      title,
      description,
      category,
      timestamp: new Date(),
    };
    const result = await tasksCollection.insertOne(newTask);
    res.json(result.ops[0]); // Send back the inserted task data
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ message: "Error adding task", error });
  }
});

// Edit a task
// app.put("/tasks/:id", async (req, res) => {
//   const { id } = req.params;
//   const { title, description, category } = req.body;

//   try {
//     const result = await tasksCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { title, description, category } }
//     );
//     res.json(result);
//   } catch (error) {
//     console.error("Error updating task:", error);
//     res.status(500).json({ message: "Error updating task", error });
//   }
// });

// Update task category
app.put("/tasks/:id/category", async (req, res) => {
  const { id } = req.params;
  const { category } = req.body; // New category

  try {
    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { category } } // Only update the category
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task category updated" });
  } catch (error) {
    res.status(500).json({ message: "Error updating task category", error });
  }
});


// Delete a task
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
    res.json(result);
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Error deleting task", error });
  }
});

// Update task order
app.put("/tasks/order", async (req, res) => {
  const updatedTasks = req.body;

  try {
    for (const task of updatedTasks) {
      await tasksCollection.updateOne(
        { _id: new ObjectId(task._id) },
        { $set: { category: task.category } }
      );
    }
    res.json({ message: "Task order updated" });
  } catch (error) {
    console.error("Error updating task order:", error);
    res.status(500).json({ message: "Error updating task order", error });
  }
});

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  // Handle incoming messages from WebSocket clients (optional)
  ws.on("message", (message) => {
    console.log("Received message:", message);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});












// const express = require("express");
// const cors = require("cors");
// const { ObjectId } = require("mongodb");
// require("dotenv").config();
// const http = require("http"); // Missing import for 'http'
// const WebSocket = require("ws");

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });
// const port = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());

// const { MongoClient, ServerApiVersion } = require("mongodb");
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.joj1d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// async function run() {
//   try {
//     // Connect to MongoDB client
//     await client.connect();
//     const tasksCollection = client.db("taskManager").collection("task");

//     // MongoDB Change Stream to listen for updates on the tasks collection
//     const changeStream = tasksCollection.watch();

//     changeStream.on("change", (change) => {
//       console.log("Change detected:", change);

//       // Broadcast the change to all connected WebSocket clients
//       wss.clients.forEach((client) => {
//         if (client.readyState === WebSocket.OPEN) {
//           client.send(JSON.stringify(change));
//         }
//       });
//     });

//     // WebSocket connection handling
//     wss.on("connection", (ws) => {
//       console.log("New WebSocket connection");

//       // Handle incoming messages from WebSocket clients (optional)
//       ws.on("message", (message) => {
//         console.log("Received message:", message);
//       });
//     });

//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");

//   } catch (error) {
//     // Handle any errors during the execution
//     console.error("Error occurred:", error);
//   }
// }

// // Start MongoDB connection
// run().catch((error) => console.error("MongoDB connection failed:", error));

// app.get("/", (req, res) => {
//   res.send("taskmanager");
// });

// // Get all tasks
// app.get("/tasks", async (req, res) => {
//   try {
//     const tasks = await tasksCollection.find({}).toArray();
//     res.json(tasks);
//   } catch (error) {
//     res.status(500).json({ message: "Error retrieving tasks", error });
//   }
// });

// // Add a new task
// app.post("/tasks", async (req, res) => {
//   const { title, description, category } = req.body;

//   if (!title || !description || !category) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   try {
//     const newTask = {
//       title,
//       description,
//       category,
//       timestamp: new Date(),
//     };
//     const result = await tasksCollection.insertOne(newTask);
//     res.json(result.ops[0]); // Send back the inserted task data
//   } catch (error) {
//     res.status(500).json({ message: "Error adding task", error });
//   }
// });

// // Edit a task
// app.put("/tasks/:id", async (req, res) => {
//   const { id } = req.params;
//   const { title, description, category } = req.body;

//   try {
//     const result = await tasksCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { title, description, category } }
//     );
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({ message: "Error updating task", error });
//   }
// });

// // Delete a task
// app.delete("/tasks/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({ message: "Error deleting task", error });
//   }
// });

// // Update task order
// app.put("/tasks/order", async (req, res) => {
//   const updatedTasks = req.body;

//   try {
//     for (const task of updatedTasks) {
//       await tasksCollection.updateOne(
//         { _id: new ObjectId(task._id) },
//         { $set: { category: task.category } }
//       );
//     }
//     res.json({ message: "Task order updated" });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating task order", error });
//   }
// });

// // Start the Express server
// server.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });






// const express = require("express");
// const cors = require("cors");
// const { ObjectId } = require("mongodb");
// require("dotenv").config();
// const WebSocket = require("ws");

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });
// const port = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());


// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.joj1d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();

//     const tasksCollection = client.db("taskManager").collection("task");


//      // MongoDB Change Stream to listen for updates on the tasks collection
//   const changeStream = tasksCollection.watch();

//   changeStream.on("change", (change) => {
//     console.log("Change detected:", change);

//     // Broadcast the change to all connected WebSocket clients
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify(change));
//       }
//     });
//   });
// });

// wss.on("connection", (ws) => {
//   console.log("New WebSocket connection");

//   // Handle incoming messages (optional)
//   ws.on("message", (message) => {
//     console.log("Received message:", message);
//   });
// });

// // Start the server on port 5000 (or any other port)
// server.listen(5000, () => {
//   console.log("Server running on http://localhost:5000");
// });

//     // Get all tasks
// app.get("/tasks", async (req, res) => {
//     const tasks = await tasksCollection.find({}).toArray();
//     res.json(tasks);
//   });
  
//   // Add a new task
//   // app.post("/tasks", async (req, res) => {
//   //   const { title, description, category } = req.body;
//   //   const newTask = {
//   //     title,
//   //     description,
//   //     category,
//   //     timestamp: new Date(),
//   //   };
//   //   const result = await tasksCollection.insertOne(newTask);
//   //   res.json(result);
//   // });

//   app.post("/tasks", async (req, res) => {
//     const { title, description, category } = req.body;
  
//     if (!title || !description || !category) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }
  
//     const newTask = {
//       title,
//       description,
//       category,
//       timestamp: new Date(),
//     };
//     const result = await tasksCollection.insertOne(newTask);
//     res.json(result.ops[0]);  // Send back the inserted task data
//   });
  
  
//   // Edit a task
//   app.put("/tasks/:id", async (req, res) => {
//     const { id } = req.params;
//     const { title, description, category } = req.body;
//     const result = await tasksCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { title, description, category } }
//     );
//     res.json(result);
//   });
  
//   // Delete a task
//   app.delete("/tasks/:id", async (req, res) => {
//     const { id } = req.params;
//     const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
//     res.json(result);
//   });
  
//   // Update task order
//   app.put("/tasks/order", async (req, res) => {
//     const updatedTasks = req.body;
//     for (const task of updatedTasks) {
//       await tasksCollection.updateOne(
//         { _id: new ObjectId(task._id) },
//         { $set: { category: task.category } }
//       );
//     }
//     res.json({ message: "Task order updated" });
//   });



//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);

// app.get("/", (req, res) => {
//     res.send("taskmanger");
//   });

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
